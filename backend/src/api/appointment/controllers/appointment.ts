// @ts-nocheck
/**
 * appointment controller
 *
 * - `create`: asigna user del JWT (ignora el que mande el cliente) y valida
 *   que el slot esté libre considerando los slots que ocupa el paquete (derivados
 *   de durationMinutes) + maxBookingsPerSlot del site-setting + horarios + días cerrados.
 * - `availableSlots`: GET /appointments/available-slots?date=YYYY-MM-DD&packageId=N
 *   Devuelve los slots disponibles para esa fecha y paquete.
 * - `find/findOne`: el cliente sólo ve SUS reservaciones, el admin las ve todas.
 */
import { factories } from '@strapi/strapi';

const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function weekDayFromISO(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  const jsDay = d.getDay();
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return WEEK_DAYS[idx];
}

/** Normaliza "HH:mm" o "HH:mm:ss.SSS" a minutos desde medianoche. */
function timeToMinutes(t) {
  if (!t) return null;
  const m = /^(\d{2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Cuántos slots consecutivos ocupa una duración dada. Mínimo 1. */
function minutesToSlots(minutes, slotDuration) {
  const mins = Number(minutes ?? 0);
  if (mins <= 0) return 1;
  return Math.max(1, Math.ceil(mins / slotDuration));
}

/**
 * Precio de un servicio extra dado un vehículo. Espejo de computeExtraServicePrice del frontend.
 * Espera el extra con `pricing` populado.
 */
function computeExtraPriceForVehicle(extra, vehicle) {
  const pricing = Array.isArray(extra?.pricing) ? extra.pricing : [];
  if (vehicle?.vehicleType) {
    const match = pricing.find((p) => p.vehicleType === vehicle.vehicleType);
    if (match) {
      if (vehicle.isUberTaxi && match.uberTaxiPrice != null) return Number(match.uberTaxiPrice);
      if (match.price != null) return Number(match.price);
    }
  }
  if (vehicle?.isUberTaxi) {
    const legacyRow = pricing.find((p) => p.vehicleType === 'uber_taxi');
    if (legacyRow && legacyRow.price != null) return Number(legacyRow.price);
    if (extra?.uberTaxiPrice != null) return Number(extra.uberTaxiPrice);
  }
  const normalRows = pricing.filter((p) => p.vehicleType !== 'uber_taxi');
  if (normalRows.length > 0) {
    return Math.min(...normalRows.map((p) => Number(p.price)));
  }
  return Number(extra?.price ?? 0);
}

/**
 * Calcula el precio total del servicio: paquete (según vehículo) + suma de extras (según vehículo).
 * Reutiliza la misma lógica que el endpoint QR registerVisit.
 */
async function computeAppointmentTotal(appointment) {
  // appointment debe venir con package.pricing, vehicle, extraServices.pricing populados
  const pkg = appointment.package;
  const vehicle = appointment.vehicle;
  const extras = appointment.extraServices ?? [];

  let total = 0;
  if (pkg) {
    const pkgPricing = Array.isArray(pkg.pricing) ? pkg.pricing : [];
    if (vehicle?.vehicleType) {
      const match = pkgPricing.find((p) => p.vehicleType === vehicle.vehicleType);
      if (match) {
        if (vehicle.isUberTaxi && match.uberTaxiPrice != null) total = Number(match.uberTaxiPrice);
        else if (match.price != null) total = Number(match.price);
      }
    }
    if (total === 0 && vehicle?.isUberTaxi) {
      const legacyRow = pkgPricing.find((p) => p.vehicleType === 'uber_taxi');
      if (legacyRow && legacyRow.price != null) total = Number(legacyRow.price);
      else if (pkg.uberTaxiPrice != null) total = Number(pkg.uberTaxiPrice);
    }
    if (total === 0) {
      const normalRows = pkgPricing.filter((p) => p.vehicleType !== 'uber_taxi');
      if (normalRows.length > 0) total = Math.min(...normalRows.map((p) => Number(p.price)));
    }
  }
  for (const e of extras) {
    total += computeExtraPriceForVehicle(e, vehicle);
  }
  return total;
}

/**
 * Crea Visit + Service a partir de una appointment completada.
 * Copia paquete, vehículo, user, extras y calcula totalAmount.
 */
async function createVisitAndServiceFromAppointment(appointment) {
  const totalAmount = await computeAppointmentTotal(appointment);
  const extraIds = (appointment.extraServices ?? []).map((e) => e.id);
  const userId = appointment.user?.id ?? appointment.user;
  const vehicleId = appointment.vehicle?.id ?? appointment.vehicle;
  const packageId = appointment.package?.id ?? appointment.package;
  const now = new Date();
  const baseData = {
    date: now,
    user: userId,
    vehicle: vehicleId,
    package: packageId,
    extraServices: extraIds,
    publishedAt: now,
  };
  await strapi.entityService.create('api::visit.visit', { data: baseData });
  // El service nace `completed` porque la cita se marcó completada explícitamente
  // (no es un servicio "en curso"); se salta el flujo de /en-progreso.
  await strapi.entityService.create('api::service.service', {
    data: { ...baseData, totalAmount, notes: appointment.adminNotes ?? null, status: 'completed' },
  });
}

/**
 * Resuelve la duración del servicio en slots.
 * - Si hay packageId, deriva los slots de pkg.durationMinutes vs slotDuration.
 * - Si no, suma estimatedDuration de los extras y lo redondea al siguiente slot. Mínimo 1 slot.
 */
async function resolveBookingSlots(packageId, extraServiceIds, slotDuration) {
  if (packageId) {
    const pkg = await strapi.entityService.findOne('api::package.package', packageId);
    if (!pkg) return { error: 'Paquete no encontrado' };
    return { bookingNumberSlot: minutesToSlots(pkg.durationMinutes, slotDuration) };
  }
  const ids = (extraServiceIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    return { error: 'Se requiere paquete o al menos un servicio extra' };
  }
  const extras = await strapi.db.query('api::extra-service.extra-service').findMany({
    where: { id: { $in: ids } },
  });
  const totalMinutes = extras.reduce(
    (acc, e) => acc + Number(e?.estimatedDuration ?? 0),
    0,
  );
  return { bookingNumberSlot: minutesToSlots(totalMinutes, slotDuration) };
}

async function getDayContext(date, packageId, excludeAppointmentId, extraServiceIds) {
  const setting = await strapi.entityService.findMany('api::site-setting.site-setting', {
    populate: { businessHours: true, closedDates: true },
  });
  const slotDuration = setting?.bookingSlotDuration ?? 60;
  const maxParallel = setting?.maxBookingsPerSlot ?? 1;

  // ¿Día cerrado fijo?
  const blocked = (setting?.closedDates ?? []).find((c) => c.date === date);
  if (blocked) {
    return { closed: true, reason: blocked.reason ?? 'Cerrado', slotDuration, maxParallel, slots: [] };
  }

  const day = weekDayFromISO(date);
  const hours = (setting?.businessHours ?? []).find((h) => h.day === day);
  if (!hours || hours.closed || !hours.open || !hours.close) {
    return { closed: true, reason: 'Sin horario asignado', slotDuration, maxParallel, slots: [] };
  }
  const openMin = timeToMinutes(hours.open);
  const closeMin = timeToMinutes(hours.close);
  if (openMin === null || closeMin === null) {
    return { closed: true, reason: 'Horario inválido', slotDuration, maxParallel, slots: [] };
  }

  const resolved = await resolveBookingSlots(packageId, extraServiceIds, slotDuration);
  if ('error' in resolved) {
    return { closed: false, error: resolved.error, slotDuration, maxParallel, slots: [] };
  }
  const bookingNumberSlot = resolved.bookingNumberSlot;
  const packageMinutes = bookingNumberSlot * slotDuration;

  // Existing appointments for this date (no canceladas).
  // Si excludeAppointmentId está, ignora esa reserva (caso re-agendar).
  const whereClause = {
    date,
    status: { $in: ['pending', 'approved'] },
  };
  if (excludeAppointmentId) {
    whereClause.id = { $ne: Number(excludeAppointmentId) };
  }
  const existing = await strapi.db.query('api::appointment.appointment').findMany({
    where: whereClause,
    populate: { package: true, extraServices: true },
  });

  // occupancy: minuto-del-día -> cuántas reservas activas lo ocupan
  const occupancy = {};
  for (const a of existing) {
    const start = timeToMinutes(a.timeSlot);
    if (start === null) continue;
    let otherSlots;
    if (a.package) {
      // appointment con paquete → slots derivados de durationMinutes
      otherSlots = minutesToSlots(a.package.durationMinutes, slotDuration);
    } else {
      // appointment de solo extras → calcular slots desde estimatedDuration
      const extrasMin = (a.extraServices ?? []).reduce(
        (acc, e) => acc + Number(e?.estimatedDuration ?? 0),
        0,
      );
      otherSlots = minutesToSlots(extrasMin, slotDuration);
    }
    const otherMinutes = otherSlots * slotDuration;
    for (let m = start; m < start + otherMinutes; m += slotDuration) {
      occupancy[m] = (occupancy[m] ?? 0) + 1;
    }
  }

  // Genera slots candidatos donde el paquete cabe completo
  const slots = [];
  for (let m = openMin; m + packageMinutes <= closeMin; m += slotDuration) {
    let blocked = false;
    // overflow = el horario de inicio tiene cupo, pero un slot POSTERIOR
    // requerido por la duración total del servicio ya llegó al máximo.
    let overflow = false;
    for (let i = m; i < m + packageMinutes; i += slotDuration) {
      if ((occupancy[i] ?? 0) >= maxParallel) {
        blocked = true;
        if (i > m) overflow = true;
        break;
      }
    }
    const entry = { slot: minutesToHHMM(m), available: !blocked };
    if (blocked) {
      entry.reason = overflow
        ? `Tu servicio ocupa ${bookingNumberSlot} horario${bookingNumberSlot > 1 ? 's' : ''} seguidos (${packageMinutes} min) y uno de los horarios siguientes ya alcanzó el máximo de ${maxParallel} reservación${maxParallel > 1 ? 'es' : ''}.`
        : `Este horario ya alcanzó el máximo de ${maxParallel} reservación${maxParallel > 1 ? 'es' : ''}.`;
      entry.overflow = overflow;
    }
    slots.push(entry);
  }

  return {
    closed: false,
    slotDuration,
    maxParallel,
    packageMinutes,
    bookingNumberSlot,
    open: minutesToHHMM(openMin),
    close: minutesToHHMM(closeMin),
    slots,
  };
}

export default factories.createCoreController('api::appointment.appointment', ({ strapi }) => ({
  /**
   * GET /api/appointments/available-slots
   * Query: date=YYYY-MM-DD, packageId=N | extraServiceIds=1,2,3, excludeAppointmentId=N
   * Requiere packageId O al menos un extraServiceId.
   */
  async availableSlots(ctx) {
    const date = String(ctx.query.date ?? '');
    const packageId = Number(ctx.query.packageId) || undefined;
    const excludeAppointmentId = ctx.query.excludeAppointmentId
      ? Number(ctx.query.excludeAppointmentId)
      : undefined;
    const extraServiceIds = String(ctx.query.extraServiceIds ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ctx.badRequest('date inválido');
    if (!packageId && extraServiceIds.length === 0) {
      return ctx.badRequest('Se requiere packageId o extraServiceIds');
    }

    const result = await getDayContext(date, packageId, excludeAppointmentId, extraServiceIds);
    ctx.body = result;
  },

  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const data = ctx.request.body?.data ?? {};
    delete data.user;
    delete data.status;
    delete data.adminNotes;

    const { date, timeSlot, package: packageId, vehicle: vehicleId, extraServices } = data;
    const extraIds = Array.isArray(extraServices)
      ? extraServices.map((e) => (typeof e === 'object' ? e.id : Number(e))).filter(Boolean)
      : [];
    if (!date || !timeSlot || !vehicleId) {
      return ctx.badRequest('Faltan datos: date, timeSlot, vehicle');
    }
    if (!packageId && extraIds.length === 0) {
      return ctx.badRequest('Se requiere paquete o al menos un servicio extra');
    }

    // Validar disponibilidad contra la misma lógica del endpoint
    const day = await getDayContext(date, packageId, undefined, extraIds);
    if (day.closed) return ctx.badRequest(day.reason ?? 'Día cerrado');
    if (day.error) return ctx.badRequest(day.error);
    const slot = day.slots.find((s) => s.slot === timeSlot);
    if (!slot) return ctx.badRequest('Slot fuera del horario del día');
    if (!slot.available) return ctx.badRequest(slot.reason ?? 'Slot ya está ocupado');

    // Ownership del vehículo
    const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id: vehicleId },
      populate: { user: true },
    });
    if (!vehicle) return ctx.notFound('Vehículo no encontrado');
    if (vehicle.user?.id !== userId) return ctx.forbidden('El vehículo no es tuyo');

    const created = await strapi.entityService.create('api::appointment.appointment', {
      data: { ...data, user: userId, status: 'pending' },
      populate: { package: true, vehicle: true, extraServices: true },
    });
    return { data: created };
  },

  async update(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const { id } = ctx.params;
    const role = ctx.state.user?.role?.type ?? ctx.state.user?.role?.name?.toLowerCase();
    const isAdmin = role === 'admin' || (role?.includes && role.includes('admin'));

    const current = await strapi.db.query('api::appointment.appointment').findOne({
      where: { id },
      populate: { user: true, package: true, extraServices: true },
    });
    if (!current) return ctx.notFound('Reservación no encontrada');
    if (!isAdmin && current.user?.id !== userId) {
      return ctx.forbidden('No es tu reservación');
    }

    const data = ctx.request.body?.data ?? {};
    // Sólo admin puede asignar user o status libremente
    if (!isAdmin) {
      delete data.user;
      delete data.status;
      delete data.adminNotes;
    }

    // Si cambia fecha o hora, validar disponibilidad
    const newDate = data.date ?? current.date;
    const newSlot = data.timeSlot ?? current.timeSlot;
    const newPackageId =
      (typeof data.package === 'object' ? data.package?.id : data.package) ??
      current.package?.id;

    const dateChanged = data.date && data.date !== current.date;
    const slotChanged = data.timeSlot && data.timeSlot !== current.timeSlot;
    const packageChanged =
      data.package && newPackageId && newPackageId !== current.package?.id;

    if (dateChanged || slotChanged || packageChanged) {
      const currentExtraIds = (current.extraServices ?? []).map((e) => e.id);
      const day = await getDayContext(newDate, newPackageId, Number(id), currentExtraIds);
      if (day.closed) return ctx.badRequest(day.reason ?? 'Día cerrado');
      if (day.error) return ctx.badRequest(day.error);
      const slot = day.slots.find((s) => s.slot === newSlot);
      if (!slot) return ctx.badRequest('Slot fuera del horario del día');
      if (!slot.available) return ctx.badRequest(slot.reason ?? 'Slot ya está ocupado');
    }

    const willComplete = data.status === 'completed' && current.status !== 'completed';

    const updated = await strapi.entityService.update('api::appointment.appointment', id, {
      data,
      populate: { package: true, vehicle: true, user: true, extraServices: true },
    });

    // Si la reservación acaba de marcarse como completada → crear visit + service
    // automáticamente con los extras y el precio correcto. Esto dispara el
    // lifecycle de loyalty (+1 visita, promo automática cada 3).
    if (willComplete) {
      try {
        // Necesitamos package.pricing y vehicle populados para calcular el precio
        const full = await strapi.db.query('api::appointment.appointment').findOne({
          where: { id },
          populate: {
            user: true,
            vehicle: true,
            package: { populate: { pricing: true } },
            extraServices: { populate: { pricing: true } },
          },
        });
        if (full) await createVisitAndServiceFromAppointment(full);
      } catch (err) {
        strapi.log.error(`[appointment.update] No se pudo crear visit/service: ${err}`);
      }
    }

    return { data: updated };
  },

  async find(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const role = ctx.state.user?.role?.type ?? ctx.state.user?.role?.name?.toLowerCase();
    const isAdmin = role === 'admin' || (role?.includes && role.includes('admin'));

    const filters = isAdmin ? {} : { user: { id: userId } };
    if (ctx.query.filters && typeof ctx.query.filters === 'object') {
      Object.assign(filters, ctx.query.filters);
      if (!isAdmin) filters.user = { id: userId };
    }

    const items = await strapi.db.query('api::appointment.appointment').findMany({
      where: filters,
      populate: { package: true, vehicle: true, extraServices: true, ...(isAdmin ? { user: true } : {}) },
      orderBy: { date: 'desc' },
      limit: 200,
    });
    return { data: items, meta: {} };
  },

  async findOne(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');
    const { id } = ctx.params;
    const item = await strapi.db.query('api::appointment.appointment').findOne({
      where: { id },
      populate: { package: true, vehicle: true, user: true, extraServices: true },
    });
    if (!item) return ctx.notFound('Reservación no encontrada');
    const role = ctx.state.user?.role?.type ?? ctx.state.user?.role?.name?.toLowerCase();
    const isAdmin = role === 'admin' || (role?.includes && role.includes('admin'));
    if (!isAdmin && item.user?.id !== userId) return ctx.forbidden('No es tu reservación');
    return { data: item };
  },
}));
