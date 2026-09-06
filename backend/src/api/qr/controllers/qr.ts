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
import {
  isPromotionAvailable,
  servicePriceBreakdown,
  computePromotionDiscount,
  describeDiscount,
  appliesToPackage,
  round2,
} from '../../../utils/promotions';
import { validateVehicleTypeSlug } from '../../../utils/vehicle-types';

/** Populate necesario para recalcular precios de un service al cobrarlo. */
const SERVICE_PRICING_POPULATE = {
  user: true,
  vehicle: true,
  package: { populate: { pricing: true } },
  extraServices: { populate: { pricing: true } },
  appointment: true,
};

/** Estados en los que un service sigue vivo en el tablero. */
const ACTIVE_STATUSES = ['waiting', 'in_progress', 'to_pay'];

/** ¿El user (con role poblado) es super admin? */
function isSuperAdmin(user) {
  const t = user?.role?.type;
  return t === 'superadmin';
}

/** ¿El user (con role poblado) atiende el negocio? Empleado, admin o super admin. */
function isAnyAdmin(user) {
  const t = user?.role?.type;
  return t === 'admin' || t === 'superadmin' || t === 'employee';
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
        populate: { packages: true },
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

    // El tipo de auto ya no es un enum del schema: se valida contra el catálogo
    // (api::vehicle-type), que es de donde el precio saca su fila de `pricing`.
    const typeError = await validateVehicleTypeSlug(vehicleType);
    if (typeError) return ctx.badRequest(typeError);

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
   * POST /api/qr/revert-to-waiting
   * in_progress → waiting. Se equivocaron de empleado al asignarlo, o el lavado
   * se detuvo (se acabó un material). Se limpia `startedAt` y `performedBy`
   * porque el lavado no empezó de verdad: si quedaran puestos, el tiempo del
   * empleado contaría un trabajo que no hizo (ver employeeTimes).
   */
  async revertToWaiting(ctx) {
    const { serviceId, reason } = ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status !== 'in_progress') {
      return ctx.badRequest('Solo un servicio en progreso puede regresar a la fila');
    }

    const data = { status: 'waiting', startedAt: null, performedBy: null };
    // Con motivo queda rastro de por qué se detuvo, igual que al cancelar.
    if (reason && String(reason).trim()) {
      const prefix = service.notes ? `${service.notes}\n` : '';
      data.notes = `${prefix}[Regresado a espera] ${String(reason).trim()}`;
    }
    const updated = await strapi.entityService.update('api::service.service', service.id, { data });

    ctx.body = { service: { id: updated.id, status: 'waiting' } };
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
   * GET /api/qr/available-promotions?serviceId=N
   * Las promociones que el cajero puede aplicar a ESE servicio hoy, con el
   * descuento ya calculado sobre su ticket (una promo de solo-extras vale
   * distinto según lo que traiga el auto).
   */
  async availablePromotions(ctx) {
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const serviceId = Number(ctx.query?.serviceId);
    if (!serviceId) return ctx.badRequest('serviceId requerido');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
      populate: SERVICE_PRICING_POPULATE,
    });
    if (!service) return ctx.notFound('Servicio no encontrado');

    const isVip = service.user ? await isVipUserId(service.user.id) : false;
    const breakdown = servicePriceBreakdown(service, isVip);
    // Los que se cobran a criterio de la caja: se listan para que el cajero
    // sepa por qué tiene que capturar un monto.
    const quotedExtraNames = (service.extraServices ?? [])
      .filter((e) => e?.quoteOnRequest)
      .map((e) => e.name)
      .filter(Boolean);

    // Campañas (de todos) + las personales del dueño del servicio, si lo tiene.
    const owners = [{ user: null }];
    if (service.user) owners.push({ user: { id: service.user.id } });
    const promos = await strapi.db.query('api::promotion.promotion').findMany({
      where: { $or: owners },
      // `packages` limita la promo a ciertos paquetes: sin poblarlo, una promo
      // restringida se ofrecería para cualquier servicio.
      populate: { packages: true },
      orderBy: [{ validUntil: 'asc' }],
      limit: 300,
    });

    const now = new Date();
    const available = promos
      .filter((p) => isPromotionAvailable(p, now))
      .map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        description: p.description,
        kind: p.kind,
        appliesTo: p.appliesTo,
        discountType: p.discountType,
        discountValue: p.discountValue,
        discountLabel: describeDiscount(p),
        /** Nombres de los paquetes a los que está limitada. Vacío = cualquiera. */
        packages: (p.packages ?? []).map((pkg) => pkg?.name).filter(Boolean),
        /** Lo que descontaría en pesos sobre este servicio en concreto. */
        discountAmount: computePromotionDiscount(p, breakdown),
      }))
      // Una promo que no descuenta nada en este ticket (ej. solo-extras y el
      // auto no lleva extras) solo estorbaría en la lista del cajero.
      .filter((p) => p.discountAmount > 0)
      .sort((a, b) => b.discountAmount - a.discountAmount);

    ctx.body = {
      service: {
        id: service.id,
        packagePrice: round2(breakdown.packagePrice),
        extrasPrice: round2(breakdown.extrasPrice),
        subtotal: round2(breakdown.total),
        /** Nombres de los servicios que se cobran a cotización. */
        quotedExtras: quotedExtraNames,
      },
      promotions: available,
      canApplyManualDiscount: isSuperAdmin(
        await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: actingUserId },
          populate: { role: true },
        }),
      ),
    };
  },

  /**
   * POST /api/qr/charge-service
   * to_pay → completed. La caja/super admin cobra al cliente. Aquí (y solo aquí)
   * se crea la Visit que dispara el lifecycle de fidelidad (loyalty + promoción).
   *
   * Acepta un descuento: como máximo UNA promoción del catálogo más, encima, un
   * descuento manual (que solo puede aplicar el super admin). El desglose se
   * guarda en el service — subtotal, cuánto puso la promo y cuánto el manual —
   * para poder auditarlo después; `totalAmount` queda con lo realmente cobrado,
   * que es lo que suman las ganancias por empleado.
   */
  async chargeService(ctx) {
    const { serviceId, promotionId, manualDiscount, discountNote, extrasCharge } =
      ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
      populate: SERVICE_PRICING_POPULATE,
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status === 'completed') return ctx.badRequest('Servicio ya cobrado');
    if (service.status !== 'to_pay') {
      return ctx.badRequest('El servicio aún no está listo para cobrar');
    }

    const now = new Date();
    const isVip = service.user ? await isVipUserId(service.user.id) : false;
    const breakdown = servicePriceBreakdown(service, isVip);
    // El subtotal recalculado puede diferir del totalAmount guardado si el admin
    // cambió precios entre el registro y el cobro; manda el guardado, que es lo
    // que se le cotizó al cliente.
    // Servicios "a cotizar" (sin precio de catálogo): el monto lo captura la
    // caja. Suma al subtotal, pero NO entra en la base del descuento: la promo
    // se calcula sobre precios de catálogo, que es lo que la app ya le mostró
    // al cajero, así el número del diálogo es exactamente el que se cobra.
    const quotedExtras = round2(Math.max(0, Number(extrasCharge ?? 0)));
    const subtotal = round2(Number(service.totalAmount ?? breakdown.total) + quotedExtras);

    // --- Promoción del catálogo ---
    let promotion = null;
    let promotionDiscount = 0;
    if (promotionId) {
      promotion = await strapi.db.query('api::promotion.promotion').findOne({
        where: { id: Number(promotionId) },
        populate: { user: true, packages: true },
      });
      if (!promotion) return ctx.notFound('Promoción no encontrada');
      if (!isPromotionAvailable(promotion, now)) {
        return ctx.badRequest('Esa promoción no está disponible hoy');
      }
      // Una promo personal solo vale para su dueño.
      if (promotion.kind !== 'campaign' && promotion.user?.id !== service.user?.id) {
        return ctx.badRequest('Esa promoción es de otro cliente');
      }
      // Limitada a ciertos paquetes: se rechaza en vez de cobrar un descuento
      // de $0 y dejar al cliente creyendo que se le aplicó.
      if (!appliesToPackage(promotion, breakdown.packageId)) {
        const nombres = (promotion.packages ?? []).map((pkg) => pkg?.name).filter(Boolean);
        return ctx.badRequest(
          `Esa promoción solo aplica en: ${nombres.join(', ') || 'otros paquetes'}`,
        );
      }
      promotionDiscount = computePromotionDiscount(promotion, breakdown);
    }

    // --- Descuento manual (solo super admin) ---
    let manual = round2(Math.max(0, Number(manualDiscount ?? 0)));
    if (manual > 0) {
      const acting = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: actingUserId },
        populate: { role: true },
      });
      if (!isSuperAdmin(acting)) {
        return ctx.forbidden('Solo el super admin puede aplicar un descuento manual');
      }
    }

    // El total nunca baja de cero: si los descuentos se pasan, se recorta el
    // manual (la promo es un compromiso con el cliente, el manual es criterio).
    const maxManual = Math.max(0, subtotal - promotionDiscount);
    if (manual > maxManual) manual = maxManual;

    const totalDiscount = round2(promotionDiscount + manual);
    const finalAmount = round2(Math.max(0, subtotal - totalDiscount));

    const updated = await strapi.entityService.update('api::service.service', service.id, {
      data: {
        status: 'completed',
        subtotalAmount: subtotal,
        extrasCharge: quotedExtras,
        promotionDiscount: round2(promotionDiscount),
        manualDiscount: manual,
        discountNote: discountNote ? String(discountNote).slice(0, 255) : null,
        promotion: promotion ? promotion.id : null,
        totalAmount: finalAmount,
      },
    });

    // Una promo personal se gasta al usarla; las campañas no se consumen.
    if (promotion && promotion.kind !== 'campaign' && !promotion.used) {
      await strapi.entityService.update('api::promotion.promotion', promotion.id, {
        data: { used: true, usedAt: now },
      });
    }

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
      service: {
        id: updated.id,
        status: 'completed',
        subtotalAmount: subtotal,
        extrasCharge: quotedExtras,
        promotionDiscount: round2(promotionDiscount),
        manualDiscount: manual,
        totalAmount: finalAmount,
        promotionTitle: promotion?.title ?? null,
      },
      promotionGenerated,
      loyaltyProgress,
    };
  },

  /**
   * GET /api/qr/employee-times?from=<ISO>&to=<ISO>  (solo super admin)
   *
   * Cuánto tardó cada empleado en cada auto dentro de una ventana de un día.
   * El tiempo es EXACTAMENTE el que el auto estuvo en `in_progress`:
   * `finishedAt - startedAt` (startedAt se graba en waiting→in_progress y
   * finishedAt en in_progress→to_pay, ver startService/finishService).
   *
   * La ventana llega como dos instantes ISO en vez de una fecha suelta porque
   * el "día" depende de la zona horaria de quien mira, no de la del servidor
   * (Railway corre en UTC). El navegador calcula sus propios límites del día.
   */
  async employeeTimes(ctx) {
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');
    const acting = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: actingUserId },
      populate: { role: true },
    });
    if (!isSuperAdmin(acting)) return ctx.forbidden('Solo el super admin');

    const { from, to } = ctx.query ?? {};
    const fromDate = new Date(String(from ?? ''));
    const toDate = new Date(String(to ?? ''));
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return ctx.badRequest('from y to deben ser fechas ISO válidas');
    }
    if (toDate <= fromDate) return ctx.badRequest('to debe ser posterior a from');

    // Un día por consulta (26h deja margen para cambios de horario).
    const MAX_SPAN_MS = 26 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > MAX_SPAN_MS) {
      return ctx.badRequest('La ventana no puede pasar de un día');
    }
    // Máximo una semana atrás (8 días de colchón por husos horarios).
    const OLDEST_MS = Date.now() - 8 * 24 * 60 * 60 * 1000;
    if (fromDate.getTime() < OLDEST_MS) {
      return ctx.badRequest('Solo se puede consultar hasta una semana atrás');
    }

    const services = await strapi.db.query('api::service.service').findMany({
      where: { startedAt: { $gte: fromDate, $lt: toDate } },
      populate: { performedBy: true, vehicle: true, package: true, user: true },
      orderBy: [{ startedAt: 'asc' }],
      limit: 500,
    });

    /** Etiqueta del auto: el registrado si lo hay, si no el tipo del walk-in. */
    const describeVehicle = (s) => {
      if (s.vehicle) {
        const base = [s.vehicle.brand, s.vehicle.model].filter(Boolean).join(' ');
        return s.vehicle.plate ? `${base} · ${s.vehicle.plate}` : base || 'Auto';
      }
      if (s.vehicleType) return s.vehicleType;
      return 'Auto';
    };

    const rows = [];
    let stillRunning = 0;

    for (const s of services) {
      // Sigue en el tablero: empezó pero nadie ha marcado que terminó.
      if (!s.finishedAt) {
        stillRunning += 1;
        continue;
      }
      const seconds = Math.max(
        0,
        Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 1000),
      );
      rows.push({
        id: s.id,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        seconds,
        status: s.status,
        totalAmount: Number(s.totalAmount ?? 0),
        employee: s.performedBy
          ? { id: s.performedBy.id, name: s.performedBy.name ?? s.performedBy.username }
          : null,
        vehicle: describeVehicle(s),
        customer: s.user?.name ?? s.user?.username ?? s.customerName ?? null,
        package: s.package?.name ?? null,
      });
    }

    // Agregado por empleado. Los servicios sin performedBy caen en un grupo aparte.
    const groups = new Map();
    for (const r of rows) {
      const key = r.employee?.id ?? 'unassigned';
      if (!groups.has(key)) {
        groups.set(key, {
          id: r.employee?.id ?? null,
          name: r.employee?.name ?? 'Sin acreditar',
          cars: 0,
          totalSeconds: 0,
          fastestSeconds: null,
          slowestSeconds: null,
        });
      }
      const g = groups.get(key);
      g.cars += 1;
      g.totalSeconds += r.seconds;
      g.fastestSeconds = g.fastestSeconds === null ? r.seconds : Math.min(g.fastestSeconds, r.seconds);
      g.slowestSeconds = g.slowestSeconds === null ? r.seconds : Math.max(g.slowestSeconds, r.seconds);
    }

    const byEmployee = [...groups.values()]
      .map((g) => ({ ...g, avgSeconds: g.cars > 0 ? Math.round(g.totalSeconds / g.cars) : 0 }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    const totalSeconds = rows.reduce((acc, r) => acc + r.seconds, 0);

    ctx.body = {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      rows,
      byEmployee,
      stillRunning,
      totals: {
        cars: rows.length,
        totalSeconds,
        avgSeconds: rows.length > 0 ? Math.round(totalSeconds / rows.length) : 0,
      },
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

    // Todo el que atiende: empleados, admins y el propio super admin.
    const adminRoles = await strapi.db.query('plugin::users-permissions.role').findMany({
      where: { type: { $in: ['admin', 'superadmin', 'employee'] } },
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
