// @ts-nocheck
/**
 * Reglas de las promociones. Vive aparte porque lo consultan tres lados:
 * el catálogo del cliente (/promotions/available), la lista que ve el cajero
 * al cobrar y el cálculo real del descuento en chargeService.
 *
 * Hay dos tipos de promoción:
 *  - `personal`: la gana un cliente (fidelidad). Va ligada a un `user`, se usa
 *    una vez y luego queda `used = true`.
 *  - `campaign`: campaña del negocio ("miércoles de chicas"). No tiene dueño,
 *    se puede aplicar cuantas veces sea mientras esté vigente.
 *
 * Las condiciones que no se pueden verificar solas (cumpleaños, nombre, etc.)
 * NO se automatizan: la promo aparece en la lista del cajero y él decide si
 * aplica. Por eso `availability` solo modela cuándo está *disponible*.
 */

import { computeItemPrice } from './pricing';

/** 0 = domingo … 6 = sábado, igual que Date#getDay. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function parseWeekdays(value) {
  if (Array.isArray(value)) return value.map(Number).filter((n) => n >= 0 && n <= 6);
  if (typeof value === 'string') {
    try {
      return parseWeekdays(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * ¿La promo se puede aplicar en este momento?
 *
 * `now` se recibe como parámetro (y no se lee de Date.now dentro) para que el
 * cajero y el cliente evalúen el mismo instante, y para poder probarlo.
 * El día de la semana se toma en la zona horaria del servidor; para "miércoles"
 * eso basta porque la ventana es de 24 h.
 */
export function isPromotionAvailable(promo, now = new Date()) {
  if (!promo) return false;
  if (promo.active === false) return false;
  // Las personales son de un solo uso; las campañas no se gastan.
  if (promo.kind !== 'campaign' && promo.used) return false;

  switch (promo.availability) {
    case 'always':
      return true;

    case 'weekdays': {
      const days = parseWeekdays(promo.weekdays);
      if (days.length === 0) return false;
      if (!days.includes(now.getDay())) return false;
      // Un día de la semana puede además acotarse a un rango (ej. "los
      // miércoles de septiembre"). Si no hay rango, aplica siempre.
      return withinRange(promo, now);
    }

    case 'dateRange':
    default:
      return withinRange(promo, now);
  }
}

function withinRange(promo, now) {
  if (promo.validFrom && now < new Date(promo.validFrom)) return false;
  if (promo.validUntil && now > new Date(promo.validUntil)) return false;
  return true;
}

/**
 * Precio del paquete y de los extras de un servicio ya registrado, por separado.
 * Hace falta porque una promo puede aplicar solo a lavado o solo a extras.
 * `service` debe venir con package.pricing, extraServices.pricing y vehicle.
 */
export function servicePriceBreakdown(service, isVip = false) {
  const vehicleLike = service.vehicle ?? {
    vehicleType: service.vehicleType,
    isUberTaxi: service.isUberTaxi,
  };
  const packagePrice = service.package ? computeItemPrice(service.package, vehicleLike, isVip) : 0;
  const extrasPrice = (service.extraServices ?? []).reduce(
    (acc, e) => acc + computeItemPrice(e, vehicleLike, isVip),
    0,
  );
  return { packagePrice, extrasPrice, total: packagePrice + extrasPrice };
}

/** Sobre qué parte del ticket pega la promo. */
export function discountBase(promo, breakdown) {
  if (promo.appliesTo === 'package') return breakdown.packagePrice;
  if (promo.appliesTo === 'extras') return breakdown.extrasPrice;
  return breakdown.total;
}

/**
 * Cuánto descuenta una promo sobre un servicio. Nunca pasa de la base
 * aplicable: un "-$200" sobre extras de $150 descuenta $150, no regala $50.
 */
export function computePromotionDiscount(promo, breakdown) {
  const base = discountBase(promo, breakdown);
  if (base <= 0) return 0;

  let raw = 0;
  if (promo.discountType === 'percent') {
    raw = (base * Number(promo.discountValue ?? 0)) / 100;
  } else if (promo.discountType === 'fixed') {
    raw = Number(promo.discountValue ?? 0);
  } else if (promo.discountType === 'free') {
    raw = base;
  }

  return round2(Math.min(Math.max(raw, 0), base));
}

export function round2(n) {
  return Math.round(Number(n ?? 0) * 100) / 100;
}

/** Texto corto del descuento, para listas y tarjetas. */
export function describeDiscount(promo) {
  if (promo.discountType === 'percent') return `${Number(promo.discountValue ?? 0)}%`;
  if (promo.discountType === 'fixed') return `-$${Number(promo.discountValue ?? 0)}`;
  return 'Gratis';
}
