// @ts-nocheck
/**
 * Custom controller para el sistema QR.
 * - POST /api/qr/scan       → identifica cliente por qrToken y devuelve sus datos
 * - POST /api/qr/register-visit → crea visit + service para un cliente
 *
 * Nota: las referencias a `api::vehicle.vehicle`, `api::package.package`, etc.
 * sólo existen DESPUÉS de crear esos content types en el Content-Type Builder.
 * Por eso usamos @ts-nocheck para evitar errores de TS antes de crearlos.
 */
import {
  computeAppointmentTotal,
  computeTotal,
  isVipUserId,
  APPOINTMENT_PRICING_POPULATE,
} from '../../../utils/pricing';

/** Estados en los que un service sigue vivo en el tablero. */
const ACTIVE_STATUSES = ['waiting', 'in_progress', 'to_pay'];

/** ¿El user (con role poblado) es super admin? */
function isSuperAdmin(user) {
  const t = user?.role?.type;
  return t === 'superadmin';
}

/** ¿El user (con role poblado) es admin o super admin? */
function isAnyAdmin(user) {
  const t = user?.role?.type;
  return t === 'admin' || t === 'superadmin';
}

/**
 * Resuelve a qué admin se le acredita un servicio completado.
 * - Por defecto: el admin que ejecuta la acción (JWT).
 * - Si es super admin y manda performedByAdminId (que sea admin/superadmin): ese.
 */
async function resolvePerformedBy(actingUserId, performedByAdminId) {
  const acting = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: actingUserId },
    populate: { role: true },
  });
  if (performedByAdminId && isSuperAdmin(acting)) {
    const target = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: Number(performedByAdminId) },
      populate: { role: true },
    });
    if (target && isAnyAdmin(target)) return target.id;
  }
  return actingUserId;
}

export default {
  async scan(ctx) {
    const { qrToken } = ctx.request.body ?? {};
    if (!qrToken) return ctx.badRequest('qrToken requerido');

    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: { qrToken },
      populate: { avatar: true, role: true },
      limit: 1,
    });
    const user = users[0];
    if (!user) return ctx.notFound('Usuario no encontrado');

    // Fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayISO = `${yyyy}-${mm}-${dd}`;

    const [vehicles, loyaltyArr, activePromotions, todayAppointments, allAppointments] = await Promise.all([
      strapi.db.query('api::vehicle.vehicle').findMany({
        where: { user: user.id },
        populate: { photo: true },
      }),
      strapi.entityService.findMany('api::loyalty-progress.loyalty-progress', {
        filters: { user: user.id },
        limit: 1,
      }),
      strapi.entityService.findMany('api::promotion.promotion', {
        filters: { user: user.id, used: false },
      }),
      strapi.db.query('api::appointment.appointment').findMany({
        where: {
          user: user.id,
          date: todayISO,
          status: { $in: ['pending', 'approved'] },
        },
        populate: { package: true, vehicle: true, extraServices: true },
        orderBy: { timeSlot: 'asc' },
      }),
      // Todas las reservaciones del cliente (últimas 50, más recientes primero).
      strapi.db.query('api::appointment.appointment').findMany({
        where: { user: user.id },
        populate: { package: true, vehicle: true, extraServices: true },
        orderBy: [{ date: 'desc' }, { timeSlot: 'desc' }],
        limit: 50,
      }),
    ]);

    ctx.body = {
      user,
      vehicles,
      loyaltyProgress: loyaltyArr[0] ?? null,
      activePromotions,
      todayAppointments,
      appointments: allAppointments,
    };
  },

  async registerVisit(ctx) {
    const { userId, vehicleId, packageId, notes, extraServiceIds } = ctx.request.body ?? {};
    if (!userId || !vehicleId || !packageId) return ctx.badRequest('Faltan datos');

    // Traer paquete con pricing populado y vehículo para computar el precio real
    const pkg = await strapi.db.query('api::package.package').findOne({
      where: { id: packageId },
      populate: { pricing: true },
    });
    if (!pkg) return ctx.notFound('Paquete no encontrado');

    const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id: vehicleId },
    });
    if (!vehicle) return ctx.notFound('Vehículo no encontrado');

    // Extras seleccionados (con su pricing para calcular el precio por tipo de auto)
    let extras = [];
    if (Array.isArray(extraServiceIds) && extraServiceIds.length > 0) {
      const ids = extraServiceIds.map((x) => Number(x)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        extras = await strapi.db.query('api::extra-service.extra-service').findMany({
          where: { id: { $in: ids } },
          populate: { pricing: true },
        });
      }
    }
    const extraIds = extras.map((e) => e.id);

    // El cliente del QR es quien define si aplica tarifa VIP, no el admin que escanea.
    const isVip = await isVipUserId(userId);
    const totalAmount = computeTotal({ pkg, extras, vehicleLike: vehicle, isVip });

    const now = new Date();
    // El service se crea en estado "waiting" (en espera). El flujo es:
    // waiting → in_progress (un empleado lo toma) → to_pay (termina el lavado)
    // → completed (la caja lo cobra). La Visit de fidelidad se crea al cobrar.
    const service = await strapi.entityService.create('api::service.service', {
      data: {
        date: now,
        notes,
        totalAmount,
        user: userId,
        vehicle: vehicleId,
        package: packageId,
        extraServices: extraIds,
        status: 'waiting',
        publishedAt: now,
      },
    });

    ctx.body = {
      service: { id: service.id, totalAmount, status: 'waiting' },
    };
  },

  /**
   * POST /api/qr/walk-in-service
   * Registra un servicio walk-in (cliente no registrado).
   * - NO crea Visit (no acumula fidelidad)
   * - Crea solo Service con isWalkIn=true
   * - El admin pasa: customerName, vehicleType, isUberTaxi, packageId?, extraServiceIds?, notes?
   */
  async walkInService(ctx) {
    const {
      customerName,
      vehicleType,
      isUberTaxi,
      packageId,
      extraServiceIds,
      notes,
    } = ctx.request.body ?? {};

    if (!packageId && (!Array.isArray(extraServiceIds) || extraServiceIds.length === 0)) {
      return ctx.badRequest('Selecciona al menos un paquete o un servicio extra');
    }

    let pkg = null;
    if (packageId) {
      pkg = await strapi.db.query('api::package.package').findOne({
        where: { id: packageId },
        populate: { pricing: true },
      });
      if (!pkg) return ctx.notFound('Paquete no encontrado');
    }

    let extras = [];
    if (Array.isArray(extraServiceIds) && extraServiceIds.length > 0) {
      const ids = extraServiceIds.map((x) => Number(x)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        extras = await strapi.db.query('api::extra-service.extra-service').findMany({
          where: { id: { $in: ids } },
          populate: { pricing: true },
        });
      }
    }
    const pkgId = pkg?.id ?? null;
    const extraIds = extras.map((e) => e.id);

    // Un walk-in no tiene cuenta, así que nunca aplica tarifa VIP.
    const totalAmount = computeTotal({
      pkg,
      extras,
      vehicleLike: { vehicleType, isUberTaxi },
      isVip: false,
    });

    const now = new Date();
    const service = await strapi.entityService.create('api::service.service', {
      data: {
        date: now,
        notes,
        totalAmount,
        package: pkgId,
        extraServices: extraIds,
        isWalkIn: true,
        customerName: customerName || null,
        vehicleType: vehicleType || null,
        isUberTaxi: !!isUberTaxi,
        status: 'waiting',
        publishedAt: now,
      },
    });

    ctx.body = { service: { id: service.id, totalAmount, status: 'waiting' } };
  },

  /**
   * GET /api/qr/in-progress-services
   * Lista todos los services con status="in_progress" (más recientes primero).
   * (Se mantiene por compatibilidad; la vista nueva usa /api/qr/board.)
   */
  async inProgressServices(ctx) {
    const services = await strapi.db.query('api::service.service').findMany({
      where: { status: 'in_progress' },
      populate: { user: true, vehicle: true, package: true, extraServices: true, performedBy: true },
      orderBy: [{ date: 'desc' }],
      limit: 200,
    });
    ctx.body = { services };
  },

  /**
   * POST /api/qr/appointment-to-board
   * Adelanta una reservación al tablero: el cliente llegó antes de su cita y hay
   * cupo, así que se crea el Service en `waiting` para que un empleado pueda
   * iniciar el lavado desde /en-progreso.
   *
   * La cita NO se marca completada aquí — sigue su curso y se cierra sola cuando
   * la caja cobra el service (ver chargeService). La Visit de fidelidad también
   * se crea al cobrar, no ahora.
   */
  async appointmentToBoard(ctx) {
    const { appointmentId } = ctx.request.body ?? {};
    if (!appointmentId) return ctx.badRequest('appointmentId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const appointment = await strapi.db.query('api::appointment.appointment').findOne({
      where: { id: appointmentId },
      populate: APPOINTMENT_PRICING_POPULATE,
    });
    if (!appointment) return ctx.notFound('Reservación no encontrada');
    if (appointment.status === 'cancelled') {
      return ctx.badRequest('La reservación está cancelada');
    }
    if (appointment.status === 'completed') {
      return ctx.badRequest('La reservación ya está completada');
    }
    if (!appointment.vehicle || !appointment.package) {
      return ctx.badRequest('La reservación necesita auto y paquete para pasar al tablero');
    }

    // Idempotencia: si ya se mandó al tablero, no crear un segundo service.
    const existing = await strapi.db.query('api::service.service').findOne({
      where: { appointment: appointmentId },
    });
    if (existing) {
      if (ACTIVE_STATUSES.includes(existing.status)) {
        return ctx.badRequest('Esta reservación ya está en el tablero');
      }
      return ctx.badRequest('Esta reservación ya pasó por el tablero');
    }

    const totalAmount = await computeAppointmentTotal(appointment);
    const now = new Date();
    const service = await strapi.entityService.create('api::service.service', {
      data: {
        date: now,
        notes: appointment.customerNotes ?? null,
        totalAmount,
        user: appointment.user?.id ?? null,
        vehicle: appointment.vehicle.id,
        package: appointment.package.id,
        extraServices: (appointment.extraServices ?? []).map((e) => e.id),
        appointment: appointment.id,
        status: 'waiting',
        publishedAt: now,
      },
    });

    // Una cita pendiente que ya llegó al tablero queda aprobada de facto.
    if (appointment.status === 'pending') {
      await strapi.entityService.update('api::appointment.appointment', appointment.id, {
        data: { status: 'approved' },
      });
    }

    ctx.body = {
      service: { id: service.id, totalAmount, status: 'waiting' },
    };
  },

  /**
   * GET /api/qr/board
   * Devuelve los servicios activos agrupados por estado del pipeline:
   * waiting (en espera) → in_progress (trabajando) → to_pay (por cobrar).
   * Los "completed" no se incluyen (ya salieron del tablero).
   */
  async board(ctx) {
    const services = await strapi.db.query('api::service.service').findMany({
      where: { status: { $in: ACTIVE_STATUSES } },
      populate: {
        user: true,
        vehicle: true,
        package: true,
        extraServices: true,
        performedBy: true,
        appointment: true,
      },
      orderBy: [{ date: 'asc' }],
      limit: 300,
    });
    const board = { waiting: [], in_progress: [], to_pay: [] };
    for (const s of services) {
      if (board[s.status]) board[s.status].push(s);
    }
    ctx.body = { board };
  },

  /**
   * POST /api/qr/start-service
   * waiting → in_progress. Un empleado toma el auto: se graba quién lo lava
   * (performedBy) y la hora de inicio (startedAt).
   */
  async startService(ctx) {
    const { serviceId, performedByAdminId } = ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status !== 'waiting') {
      return ctx.badRequest('El servicio ya fue tomado');
    }

    const now = new Date();
    const performedById = await resolvePerformedBy(actingUserId, performedByAdminId);
    const updated = await strapi.entityService.update('api::service.service', service.id, {
      data: { status: 'in_progress', performedBy: performedById, startedAt: now },
    });

    ctx.body = { service: { id: updated.id, status: 'in_progress' } };
  },

  /**
   * POST /api/qr/finish-service
   * in_progress → to_pay. El empleado termina el lavado: se graba la hora de
   * fin (finishedAt). La duración se deriva de startedAt→finishedAt.
   */
  async finishService(ctx) {
    const { serviceId } = ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status !== 'in_progress') {
      return ctx.badRequest('El servicio no está en progreso');
    }

    const now = new Date();
    const updated = await strapi.entityService.update('api::service.service', service.id, {
      data: { status: 'to_pay', finishedAt: now },
    });

    ctx.body = { service: { id: updated.id, status: 'to_pay' } };
  },

  /**
   * POST /api/qr/cancel-service
   * Cancela un servicio activo (waiting | in_progress | to_pay) → cancelled.
   * No dispara fidelidad y el servicio sale del tablero. No se puede cancelar
   * uno ya cobrado (completed).
   */
  async cancelService(ctx) {
    const { serviceId, reason } = ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
      populate: { appointment: true },
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status === 'completed') return ctx.badRequest('Un servicio ya cobrado no se puede cancelar');
    if (service.status === 'cancelled') return ctx.badRequest('El servicio ya está cancelado');

    // Se suelta el vínculo con la reservación para que pueda re-enviarse al
    // tablero (la cita sigue viva; solo se canceló este intento de lavado).
    const data: Record<string, unknown> = { status: 'cancelled', appointment: null };
    // Si mandan motivo, lo anexamos a las notas para dejar rastro.
    if (reason && String(reason).trim()) {
      const prefix = service.notes ? `${service.notes}\n` : '';
      data.notes = `${prefix}[Cancelado] ${String(reason).trim()}`;
    }
    const updated = await strapi.entityService.update('api::service.service', service.id, { data });

    ctx.body = { service: { id: updated.id, status: 'cancelled' } };
  },

  /**
   * POST /api/qr/charge-service
   * to_pay → completed. La caja/super admin cobra al cliente. Aquí (y solo aquí)
   * se crea la Visit que dispara el lifecycle de fidelidad (loyalty + promoción).
   */
  async chargeService(ctx) {
    const { serviceId } = ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
      populate: { user: true, vehicle: true, package: true, extraServices: true, appointment: true },
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status === 'completed') return ctx.badRequest('Servicio ya cobrado');
    if (service.status !== 'to_pay') {
      return ctx.badRequest('El servicio aún no está listo para cobrar');
    }

    const now = new Date();
    const updated = await strapi.entityService.update('api::service.service', service.id, {
      data: { status: 'completed' },
    });

    // Si el service vino de una reservación adelantada al tablero, la cita se
    // cierra aquí. Se actualiza vía entityService (no por el controller) para
    // NO disparar el auto-creado de visit/service de appointment.update.
    if (service.appointment && service.appointment.status !== 'completed') {
      await strapi.entityService.update('api::appointment.appointment', service.appointment.id, {
        data: { status: 'completed' },
      });
    }

    // Si no es walk-in y tiene user + vehicle + package → crear Visit (loyalty)
    let promotionGenerated = null;
    let loyaltyProgress = null;
    if (!service.isWalkIn && service.user && service.vehicle && service.package) {
      const userId = service.user.id;
      const extraIds = Array.isArray(service.extraServices)
        ? service.extraServices.map((e) => e.id)
        : [];
      await strapi.entityService.create('api::visit.visit', {
        data: {
          date: now,
          notes: service.notes,
          user: userId,
          vehicle: service.vehicle.id,
          package: service.package.id,
          extraServices: extraIds,
          publishedAt: now,
        },
      });
      // Releer loyalty y la última promo creadas por el lifecycle
      const [loyaltyArr, latestPromos] = await Promise.all([
        strapi.entityService.findMany('api::loyalty-progress.loyalty-progress', {
          filters: { user: userId },
          limit: 1,
        }),
        strapi.entityService.findMany('api::promotion.promotion', {
          filters: { user: userId },
          sort: { createdAt: 'desc' },
          limit: 1,
        }),
      ]);
      loyaltyProgress = loyaltyArr[0] ?? null;
      const newest = latestPromos[0];
      promotionGenerated =
        newest && new Date(newest.createdAt).getTime() > now.getTime() - 5000 ? newest : null;
    }

    ctx.body = {
      service: { id: updated.id, status: 'completed' },
      promotionGenerated,
      loyaltyProgress,
    };
  },

  /**
   * GET /api/qr/employee-stats  (solo super admin)
   * Métricas por admin (lavados completados + ganancias) y tendencia diaria
   * de los últimos 30 días, para supervisar a los empleados.
   */
  async employeeStats(ctx) {
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');
    const acting = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: actingUserId },
      populate: { role: true },
    });
    if (!isSuperAdmin(acting)) return ctx.forbidden('Solo el super admin');

    // Todos los admins (admin + super admin)
    const adminRoles = await strapi.db.query('plugin::users-permissions.role').findMany({
      where: { type: { $in: ['admin', 'superadmin'] } },
    });
    const adminRoleIds = adminRoles.map((r) => r.id);
    const admins = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: { role: { id: { $in: adminRoleIds } } },
      populate: { role: true },
    });

    // Servicios completados con el admin que los realizó
    const services = await strapi.db.query('api::service.service').findMany({
      where: { status: 'completed' },
      populate: { performedBy: true },
    });

    // Agregados por admin
    const byAdmin = new Map();
    for (const a of admins) byAdmin.set(a.id, { washes: 0, earnings: 0 });
    const unassigned = { washes: 0, earnings: 0 };
    for (const s of services) {
      const pid = s.performedBy?.id;
      const amt = Number(s.totalAmount ?? 0);
      if (pid && byAdmin.has(pid)) {
        const e = byAdmin.get(pid);
        e.washes += 1;
        e.earnings += amt;
      } else {
        unassigned.washes += 1;
        unassigned.earnings += amt;
      }
    }

    const adminsOut = admins
      .map((a) => ({
        id: a.id,
        name: a.name ?? a.username,
        email: a.email,
        role: a.role?.type,
        washes: byAdmin.get(a.id).washes,
        earnings: byAdmin.get(a.id).earnings,
      }))
      .sort((x, y) => y.earnings - x.earnings);

    // Tendencia diaria de los últimos 30 días (total del negocio)
    const DAYS = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const series = [];
    const idx = new Map();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = { date: key, washes: 0, earnings: 0 };
      series.push(row);
      idx.set(key, row);
    }
    for (const s of services) {
      const key = new Date(s.date).toISOString().slice(0, 10);
      const row = idx.get(key);
      if (row) {
        row.washes += 1;
        row.earnings += Number(s.totalAmount ?? 0);
      }
    }

    ctx.body = {
      admins: adminsOut,
      daily: series,
      unassigned,
      totals: {
        admins: admins.length,
        washes: services.length,
        earnings: services.reduce((acc, s) => acc + Number(s.totalAmount ?? 0), 0),
      },
    };
  },
};
