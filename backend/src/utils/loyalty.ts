// @ts-nocheck
/**
 * Programa de fidelidad: cuántas visitas hacen falta para ganar la promoción.
 *
 * Hay dos umbrales, ambos en Configuración del sitio:
 *  - `visitsForReward`: autos normales.
 *  - `visitsForRewardUber`: autos marcados como Uber/Taxi. Vacío = el normal.
 *
 * La regla es POR AUTO: cada auto del cliente lleva su propio contador
 * (`loyalty-progress` con `user` + `vehicle`) y cierra el ciclo con el umbral
 * que le toca. Un cliente con un Chevy normal y un Versa Uber tiene dos barras:
 * el Chevy gana a las N visitas normales y el Versa a las N visitas Uber, sin
 * mezclarse. La recompensa queda ligada al auto que la ganó (`promotion.vehicle`).
 *
 * Vive aparte porque lo consultan el lifecycle de visitas (index.ts), que es
 * quien regala la promoción, y el endpoint de escaneo del cajero, que solo
 * quiere saber cuánto le falta a cada auto.
 */

export const LOYALTY_DEFAULTS = {
  visitsForReward: 3,
  visitsForRewardUber: 3,
  active: true,
  discountType: 'percent',
  discountValue: 10,
  validDays: 30,
  packageIds: [],
};

/**
 * Configuración de la recompensa de fidelidad, tal como la dejó el dueño en
 * Configuración del sitio → Promoción de fidelidad. Los valores por defecto son
 * los que tenía la app cuando esto vivía hardcodeado (3 visitas, 10%, 30 días),
 * para que un sitio sin configurar siga comportándose igual que antes.
 */
export async function loadLoyaltyConfig() {
  const defaults = LOYALTY_DEFAULTS;
  try {
    // db.query y no entityService: con este último la relación anidada dentro
    // del componente vuelve vacía (verificado contra la base). Se prefiere la
    // versión publicada, que es la que ve el resto de la app.
    const setting =
      (await strapi.db.query('api::site-setting.site-setting').findOne({
        where: { publishedAt: { $notNull: true } },
        populate: { loyaltyReward: { populate: { packages: true } } },
      })) ??
      (await strapi.db.query('api::site-setting.site-setting').findOne({
        populate: { loyaltyReward: { populate: { packages: true } } },
      }));
    const reward = setting?.loyaltyReward ?? {};
    const value = Number(reward.discountValue);
    const visitsForReward =
      Number(setting?.visitsForReward) > 0
        ? Number(setting.visitsForReward)
        : defaults.visitsForReward;
    return {
      visitsForReward,
      // Sin valor propio, los Uber cuentan igual que un auto normal.
      visitsForRewardUber:
        Number(setting?.visitsForRewardUber) > 0
          ? Number(setting.visitsForRewardUber)
          : visitsForReward,
      active: reward.active !== false,
      discountType: ['percent', 'fixed', 'free'].includes(reward.discountType)
        ? reward.discountType
        : defaults.discountType,
      discountValue: Number.isFinite(value) && value >= 0 ? value : defaults.discountValue,
      validDays: Number(reward.validDays) > 0 ? Number(reward.validDays) : defaults.validDays,
      packageIds: (reward.packages ?? []).map((p) => p?.id ?? p).filter(Boolean),
    };
  } catch (err) {
    // Un fallo leyendo la configuración no debe costarle la recompensa al
    // cliente que acaba de completar su ciclo.
    strapi.log.error('[loyalty] No se pudo leer la configuración, usando valores por defecto:', err);
    return defaults;
  }
}

/** Umbral que aplica a un auto: Uber/Taxi o normal. */
export function visitsRequiredFor(config, vehicleLike) {
  return vehicleLike?.isUberTaxi ? config.visitsForRewardUber : config.visitsForReward;
}

/** "Chevrolet Aveo · ABC-123" para textos de promociones y del escáner. */
export function describeVehicle(vehicle) {
  if (!vehicle) return 'tu auto';
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ').trim() || 'tu auto';
  return vehicle.plate ? `${name} · ${vehicle.plate}` : name;
}

/**
 * Progreso de fidelidad de un cliente, un renglón por auto, para mostrarlo
 * (barra del cliente, ficha del escáner). Un auto sin contador todavía sale
 * en 0 con el umbral que le toca. Los contadores viejos sin auto (de antes de
 * que la fidelidad fuera por auto) se devuelven aparte en `legacy`: el
 * lifecycle se los suma al primer auto que se lave.
 */
export function loyaltyByVehicle(config, vehicles = [], progresses = []) {
  const rows = vehicles.map((vehicle) => {
    const progress = progresses.find((p) => p?.vehicle?.id === vehicle.id) ?? null;
    return {
      vehicleId: vehicle.id,
      vehicleLabel: describeVehicle(vehicle),
      isUberTaxi: vehicle.isUberTaxi === true,
      currentCount: progress?.currentCount ?? 0,
      // Manda lo que fijó la última visita de ese auto; sin visitas, la config.
      visitsRequired:
        Number(progress?.visitsRequired) > 0
          ? Number(progress.visitsRequired)
          : visitsRequiredFor(config, vehicle),
    };
  });
  const legacy = progresses.find((p) => p && !p.vehicle) ?? null;
  return {
    rows,
    legacyCount: legacy ? Number(legacy.currentCount ?? 0) : 0,
  };
}
