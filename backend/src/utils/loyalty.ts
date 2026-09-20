// @ts-nocheck
/**
 * Programa de fidelidad: cuántas visitas hacen falta para ganar la promoción.
 *
 * Hay dos umbrales, ambos en Configuración del sitio:
 *  - `visitsForReward`: autos normales.
 *  - `visitsForRewardUber`: autos marcados como Uber/Taxi. Vacío = el normal.
 *
 * La regla es POR VISITA: cada lavado cuenta según el auto que se lavó. Un
 * cliente con un auto normal y un Uber cierra el ciclo con el umbral del auto
 * de su última visita. Se eligió así (y no un contador aparte por tipo) para
 * que el cliente siga viendo una sola barra de progreso.
 *
 * Vive aparte porque lo consultan el lifecycle de visitas (index.ts), que es
 * quien regala la promoción, y el endpoint de escaneo del cajero, que solo
 * quiere saber cuánto le falta al cliente.
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

/** Umbral que aplica a un lavado según el auto: Uber/Taxi o normal. */
export function visitsRequiredFor(config, vehicleLike) {
  return vehicleLike?.isUberTaxi ? config.visitsForRewardUber : config.visitsForReward;
}

/**
 * Cuántas visitas necesita ESTE cliente para cerrar su ciclo, para mostrarlo
 * (barra del cliente, ficha del escáner). Manda lo que fijó su última visita;
 * si aún no tiene ninguna, se deduce de sus autos: todos Uber → umbral Uber,
 * cualquier otro caso → normal.
 */
export function visitsRequiredForCustomer(config, progress, vehicles = []) {
  if (Number(progress?.visitsRequired) > 0) return Number(progress.visitsRequired);
  const allUber = vehicles.length > 0 && vehicles.every((v) => v?.isUberTaxi);
  return allUber ? config.visitsForRewardUber : config.visitsForReward;
}
