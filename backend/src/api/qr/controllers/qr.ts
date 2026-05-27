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

    const [vehicles, loyaltyArr, activePromotions, todayAppointments] = await Promise.all([
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
    ]);

    ctx.body = {
      user,
      vehicles,
      loyaltyProgress: loyaltyArr[0] ?? null,
      activePromotions,
      todayAppointments,
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
    const visit = await strapi.entityService.create('api::visit.visit', {
      data: {
        date: now,
        notes,
        user: userId,
        vehicle: vehicleId,
        package: packageId,
        extraServices: extraIds,
        publishedAt: now,
      },
    });
    const service = await strapi.entityService.create('api::service.service', {
      data: {
        date: now,
        notes,
        totalAmount,
        user: userId,
        vehicle: vehicleId,
        package: packageId,
        extraServices: extraIds,
        publishedAt: now,
      },
    });

    // Releer loyalty y la última promo (el lifecycle del visit ya las puede haber actualizado)
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
    const loyalty = loyaltyArr[0];
    const newest = latestPromos[0];
    const justGenerated =
      newest && new Date(newest.createdAt).getTime() > now.getTime() - 5000 ? newest : null;

    ctx.body = {
      visit: { id: visit.id, date: visit.date },
      service: { id: service.id },
      promotionGenerated: justGenerated,
      loyaltyProgress: loyalty,
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
        publishedAt: now,
      },
    });

    ctx.body = { service: { id: service.id, totalAmount } };
  },
};
