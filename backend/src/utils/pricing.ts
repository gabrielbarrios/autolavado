// @ts-nocheck
/**
 * Cálculo y visibilidad de precios. Fuente única de verdad del backend: lo usan
 * `appointment.update` (al completar una cita), `qr.appointmentToBoard`,
 * `qr.registerVisit` y `qr.walkInService`, además de los controllers de
 * `package` y `extra-service` para ocultar el precio VIP a quien no debe verlo.
 *
 * Jerarquía de precio de una fila de `shared.vehicle-type-price`:
 *   1. vipPrice       → si el cliente tiene rol VIP y la fila lo tiene definido
 *   2. uberTaxiPrice  → si el auto está marcado como Uber/Taxi
 *   3. price          → precio normal del tipo de auto
 *
 * El precio VIP gana sobre el de Uber/Taxi: es la tarifa negociada del cliente.
 */

/** Roles que pueden VER el precio VIP en la API pública. */
const VIP_PRICE_VIEWER_ROLES = ['admin', 'superadmin', 'vip'];

/** Roles que PAGAN precio VIP. */
const VIP_PRICED_ROLES = ['vip'];

function roleTypeOf(user) {
  return user?.role?.type ?? null;
}

/** ¿Este user (con role poblado) paga tarifa VIP? */
export function isVipUser(user) {
  return VIP_PRICED_ROLES.includes(roleTypeOf(user));
}

/** ¿Este user (con role poblado) puede ver el campo vipPrice? */
export function canSeeVipPrices(user) {
  return VIP_PRICE_VIEWER_ROLES.includes(roleTypeOf(user));
}

/** Carga un user por id con el role poblado y responde si paga tarifa VIP. */
export async function isVipUserId(userId) {
  if (!userId) return false;
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    populate: { role: true },
  });
  return isVipUser(user);
}

/**
 * Precio efectivo de una fila de pricing.
 * `opts`: { isUberTaxi, isVip }
 */
export function resolveRowPrice(row, opts = {}) {
  if (!row) return null;
  const { isUberTaxi = false, isVip = false } = opts;
  if (isVip && row.vipPrice != null) return Number(row.vipPrice);
  if (isUberTaxi && row.uberTaxiPrice != null) return Number(row.uberTaxiPrice);
  if (row.price != null) return Number(row.price);
  return null;
}

/**
 * Precio de un item con `pricing` (paquete o extra) para un vehículo dado.
 * Cae al menor precio normal del array cuando no hay fila para ese tipo de auto,
 * y por último al `price` legacy top-level del item.
 *
 * `vehicleLike`: { vehicleType, isUberTaxi } — sirve tanto un Vehicle real como
 * los datos sueltos de un walk-in.
 */
export function computeItemPrice(item, vehicleLike, isVip = false) {
  if (!item) return 0;
  // "A cotizar": el precio depende del auto y lo pone la caja al cobrar
  // (service.extrasCharge). En el catálogo vale 0 para no inventar un total.
  if (item.quoteOnRequest) return 0;
  const pricing = Array.isArray(item.pricing) ? item.pricing : [];
  const isUberTaxi = !!vehicleLike?.isUberTaxi;
  const vehicleType = vehicleLike?.vehicleType;

  if (vehicleType) {
    const row = pricing.find((p) => p.vehicleType === vehicleType);
    const price = resolveRowPrice(row, { isUberTaxi, isVip });
    if (price != null) return price;
  }

  const normalRows = pricing.filter((p) => p.vehicleType !== 'uber_taxi');

  if (isUberTaxi) {
    if (normalRows.length > 0) {
      return Math.min(
        ...normalRows.map((r) => resolveRowPrice(r, { isUberTaxi: true, isVip }) ?? 0),
      );
    }
    // Legacy: fila uber_taxi o campo top-level uberTaxiPrice
    const legacyRow = pricing.find((p) => p.vehicleType === 'uber_taxi');
    if (legacyRow?.price != null) return Number(legacyRow.price);
    if (item.uberTaxiPrice != null) return Number(item.uberTaxiPrice);
  }

  if (normalRows.length > 0) {
    return Math.min(...normalRows.map((r) => resolveRowPrice(r, { isVip }) ?? 0));
  }
  return Number(item.price ?? 0);
}

/** Paquete + extras para un vehículo dado. `extras` con `pricing` populado. */
export function computeTotal({ pkg, extras = [], vehicleLike, isVip = false }) {
  let total = pkg ? computeItemPrice(pkg, vehicleLike, isVip) : 0;
  for (const extra of extras) {
    total += computeItemPrice(extra, vehicleLike, isVip);
  }
  return total;
}

/**
 * Total de una reservación. `appointment` debe venir con package.pricing,
 * vehicle y extraServices.pricing populados (ver APPOINTMENT_PRICING_POPULATE).
 * El rol VIP se resuelve desde `appointment.user`.
 */
export async function computeAppointmentTotal(appointment) {
  const isVip = await isVipUserId(appointment?.user?.id ?? appointment?.user);
  return computeTotal({
    pkg: appointment.package,
    extras: appointment.extraServices ?? [],
    vehicleLike: appointment.vehicle,
    isVip,
  });
}

/** Populate necesario para que `computeAppointmentTotal` calcule bien. */
export const APPOINTMENT_PRICING_POPULATE = {
  user: true,
  vehicle: true,
  package: { populate: { pricing: true } },
  extraServices: { populate: { pricing: true } },
};

/**
 * Quita `vipPrice` de las filas de pricing de una entidad (o lista) antes de
 * responder. Se aplica a todo el que no sea admin/empleado/VIP.
 */
export function stripVipPrices(data) {
  if (Array.isArray(data)) return data.map(stripVipPrices);
  if (!data || typeof data !== 'object') return data;
  if (!Array.isArray(data.pricing)) return data;
  return {
    ...data,
    pricing: data.pricing.map(({ vipPrice, ...rest }) => rest),
  };
}
