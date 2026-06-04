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

    // Calcular precio del paquete (lógica per-row): row[vehicleType].uberTaxiPrice > row.price > legacy
    let totalAmount = 0;
    const pkgPricing = Array.isArray(pkg.pricing) ? pkg.pricing : [];
    if (vehicle.vehicleType) {
      const match = pkgPricing.find((p) => p.vehicleType === vehicle.vehicleType);
      if (match) {
        if (vehicle.isUberTaxi && match.uberTaxiPrice != null) totalAmount = Number(match.uberTaxiPrice);
        else if (match.price != null) totalAmount = Number(match.price);
      }
    }
    if (totalAmount === 0 && vehicle.isUberTaxi) {
      const legacyRow = pkgPricing.find((p) => p.vehicleType === 'uber_taxi');
      if (legacyRow && legacyRow.price != null) totalAmount = Number(legacyRow.price);
      else if (pkg.uberTaxiPrice != null) totalAmount = Number(pkg.uberTaxiPrice);
    }
    if (totalAmount === 0) {
      const normalRows = pkgPricing.filter((p) => p.vehicleType !== 'uber_taxi');
      if (normalRows.length > 0) totalAmount = Math.min(...normalRows.map((p) => Number(p.price)));
    }

    // Sumar precios de servicios extras seleccionados (con precio por tipo de auto)
    let extraIds = [];
    if (Array.isArray(extraServiceIds) && extraServiceIds.length > 0) {
      const ids = extraServiceIds.map((x) => Number(x)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        const extras = await strapi.db.query('api::extra-service.extra-service').findMany({
          where: { id: { $in: ids } },
          populate: { pricing: true },
        });
        for (const ex of extras) {
          const exPricing = Array.isArray(ex.pricing) ? ex.pricing : [];
          let p = 0;
          if (vehicle.vehicleType) {
            const m = exPricing.find((row) => row.vehicleType === vehicle.vehicleType);
            if (m) {
              if (vehicle.isUberTaxi && m.uberTaxiPrice != null) p = Number(m.uberTaxiPrice);
              else if (m.price != null) p = Number(m.price);
            }
          }
          if (p === 0 && vehicle.isUberTaxi) {
            const legacyRow = exPricing.find((row) => row.vehicleType === 'uber_taxi');
            if (legacyRow && legacyRow.price != null) p = Number(legacyRow.price);
            else if (ex.uberTaxiPrice != null) p = Number(ex.uberTaxiPrice);
          }
          if (p === 0) {
            const normalRows = exPricing.filter((row) => row.vehicleType !== 'uber_taxi');
            if (normalRows.length > 0) p = Math.min(...normalRows.map((row) => Number(row.price)));
          }
          if (p === 0 && ex.price != null) p = Number(ex.price);
          totalAmount += p;
        }
        extraIds = extras.map((e) => e.id);
      }
    }

    const now = new Date();
    // El service se crea en estado in_progress. La Visit (que dispara fidelidad
    // por su lifecycle afterCreate) se creará cuando el operador marque
    // "Completar" desde la página /en-progreso.
    const service = await strapi.entityService.create('api::service.service', {
      data: {
        date: now,
        notes,
        totalAmount,
        user: userId,
        vehicle: vehicleId,
        package: packageId,
        extraServices: extraIds,
        status: 'in_progress',
        publishedAt: now,
      },
    });

    ctx.body = {
      service: { id: service.id, totalAmount, status: 'in_progress' },
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

    let totalAmount = 0;
    let pkgId = null;

    // Paquete
    if (packageId) {
      const pkg = await strapi.db.query('api::package.package').findOne({
        where: { id: packageId },
        populate: { pricing: true },
      });
      if (!pkg) return ctx.notFound('Paquete no encontrado');
      pkgId = pkg.id;

      const pkgPricing = Array.isArray(pkg.pricing) ? pkg.pricing : [];
      if (vehicleType) {
        const match = pkgPricing.find((p) => p.vehicleType === vehicleType);
        if (match) {
          if (isUberTaxi && match.uberTaxiPrice != null) totalAmount = Number(match.uberTaxiPrice);
          else if (match.price != null) totalAmount = Number(match.price);
        }
      }
      if (totalAmount === 0 && isUberTaxi) {
        const legacyRow = pkgPricing.find((p) => p.vehicleType === 'uber_taxi');
        if (legacyRow && legacyRow.price != null) totalAmount = Number(legacyRow.price);
        else if (pkg.uberTaxiPrice != null) totalAmount = Number(pkg.uberTaxiPrice);
      }
      if (totalAmount === 0) {
        const normalRows = pkgPricing.filter((p) => p.vehicleType !== 'uber_taxi');
        if (normalRows.length > 0) totalAmount = Math.min(...normalRows.map((p) => Number(p.price)));
      }
    }

    // Extras (con precio por tipo de auto / Uber-Taxi)
    let extraIds = [];
    if (Array.isArray(extraServiceIds) && extraServiceIds.length > 0) {
      const ids = extraServiceIds.map((x) => Number(x)).filter((n) => !isNaN(n));
      if (ids.length > 0) {
        const extras = await strapi.db.query('api::extra-service.extra-service').findMany({
          where: { id: { $in: ids } },
          populate: { pricing: true },
        });
        for (const ex of extras) {
          const exPricing = Array.isArray(ex.pricing) ? ex.pricing : [];
          let p = 0;
          if (vehicleType) {
            const m = exPricing.find((row) => row.vehicleType === vehicleType);
            if (m) {
              if (isUberTaxi && m.uberTaxiPrice != null) p = Number(m.uberTaxiPrice);
              else if (m.price != null) p = Number(m.price);
            }
          }
          if (p === 0 && isUberTaxi) {
            const legacyRow = exPricing.find((row) => row.vehicleType === 'uber_taxi');
            if (legacyRow && legacyRow.price != null) p = Number(legacyRow.price);
            else if (ex.uberTaxiPrice != null) p = Number(ex.uberTaxiPrice);
          }
          if (p === 0) {
            const normalRows = exPricing.filter((row) => row.vehicleType !== 'uber_taxi');
            if (normalRows.length > 0) p = Math.min(...normalRows.map((row) => Number(row.price)));
          }
          if (p === 0 && ex.price != null) p = Number(ex.price);
          totalAmount += p;
        }
        extraIds = extras.map((e) => e.id);
      }
    }

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
        status: 'in_progress',
        publishedAt: now,
      },
    });

    ctx.body = { service: { id: service.id, totalAmount, status: 'in_progress' } };
  },

  /**
   * GET /api/qr/in-progress-services
   * Lista todos los services con status="in_progress" (más recientes primero).
   */
  async inProgressServices(ctx) {
    const services = await strapi.db.query('api::service.service').findMany({
      where: { status: 'in_progress' },
      populate: { user: true, vehicle: true, package: true, extraServices: true },
      orderBy: [{ date: 'desc' }],
      limit: 200,
    });
    ctx.body = { services };
  },

  /**
   * POST /api/qr/complete-service
   * Marca un service como completed. Si no es walk-in y tiene user/vehicle/package,
   * crea una Visit que dispara el lifecycle de fidelidad (loyalty + promoción).
   */
  async completeService(ctx) {
    const { serviceId, performedByAdminId } = ctx.request.body ?? {};
    if (!serviceId) return ctx.badRequest('serviceId requerido');
    const actingUserId = ctx.state.user?.id;
    if (!actingUserId) return ctx.unauthorized('Sesión requerida');

    const service = await strapi.db.query('api::service.service').findOne({
      where: { id: serviceId },
      populate: { user: true, vehicle: true, package: true, extraServices: true },
    });
    if (!service) return ctx.notFound('Servicio no encontrado');
    if (service.status === 'completed') return ctx.badRequest('Servicio ya completado');

    const now = new Date();
    // Acreditar el lavado a un admin (por defecto quien lo completa; el super admin
    // puede acreditarlo a otro admin enviando performedByAdminId).
    const performedById = await resolvePerformedBy(actingUserId, performedByAdminId);

    // Marcar el service como completed y vincular al admin que lo realizó.
    const updated = await strapi.entityService.update('api::service.service', service.id, {
      data: { status: 'completed', performedBy: performedById },
    });

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
