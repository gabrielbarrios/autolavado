import { VISITS_FOR_REWARD } from "@/lib/constants";
import type { LoyaltyProgress, SiteSetting, Vehicle } from "@/types/models";

/**
 * Umbrales del programa de fidelidad tal como los dejó el dueño en
 * Configuración del sitio. Uber/Taxi sin valor propio cuenta como auto normal.
 * Espejo de `loadLoyaltyConfig` en backend/src/utils/loyalty.ts.
 */
export function loyaltyThresholds(setting: SiteSetting | null | undefined) {
  const normal =
    setting?.visitsForReward && setting.visitsForReward > 0
      ? setting.visitsForReward
      : VISITS_FOR_REWARD;
  const uber =
    setting?.visitsForRewardUber && setting.visitsForRewardUber > 0
      ? setting.visitsForRewardUber
      : normal;
  return { normal, uber };
}

/**
 * Cuántas visitas necesita ESTE cliente para cerrar su ciclo. Manda lo que el
 * backend fijó en su última visita (`visitsRequired`, según el auto lavado);
 * si aún no tiene visitas se deduce de sus autos: todos Uber → umbral Uber.
 * Misma regla que `visitsRequiredForCustomer` en el backend.
 */
export function resolveVisitsRequired(
  loyalty: LoyaltyProgress | null | undefined,
  setting: SiteSetting | null | undefined,
  vehicles: Vehicle[] = [],
): number {
  if (loyalty?.visitsRequired && loyalty.visitsRequired > 0) return loyalty.visitsRequired;
  const { normal, uber } = loyaltyThresholds(setting);
  const allUber = vehicles.length > 0 && vehicles.every((v) => v.isUberTaxi);
  return allUber ? uber : normal;
}
