import { VISITS_FOR_REWARD } from "@/lib/constants";
import type { LoyaltyProgress, LoyaltyRow, SiteSetting, Vehicle } from "@/types/models";

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

/** "Chevrolet Aveo · ABC-123". Espejo de `describeVehicle` en el backend. */
export function vehicleLabel(vehicle: Pick<Vehicle, "brand" | "model" | "plate">): string {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim() || "Tu auto";
  return vehicle.plate ? `${name} · ${vehicle.plate}` : name;
}

/**
 * Cuántas visitas necesita ESTE auto para cerrar su ciclo. Manda lo que el
 * backend fijó en su última visita (`visitsRequired`); si aún no tiene
 * visitas, el umbral de la configuración según sea Uber/Taxi o normal.
 */
export function resolveVisitsRequired(
  progress: LoyaltyProgress | null | undefined,
  setting: SiteSetting | null | undefined,
  vehicle: Pick<Vehicle, "isUberTaxi"> | null | undefined,
): number {
  if (progress?.visitsRequired && progress.visitsRequired > 0) return progress.visitsRequired;
  const { normal, uber } = loyaltyThresholds(setting);
  return vehicle?.isUberTaxi ? uber : normal;
}

/**
 * Una fila por auto del cliente con su contador (0 si aún no tiene). Misma
 * regla que `loyaltyByVehicle` en el backend, que es lo que ve el escáner.
 *
 * `legacyCount`: visitas de un contador de antes del cambio a "por auto" (sin
 * `vehicle`). No se pierden: el backend se las suma al primer auto que se lave.
 */
export function buildLoyaltyRows(
  vehicles: Vehicle[],
  progresses: LoyaltyProgress[],
  setting: SiteSetting | null | undefined,
): { rows: LoyaltyRow[]; legacyCount: number } {
  const rows = vehicles.map((vehicle) => {
    const progress = progresses.find((p) => p.vehicle?.id === vehicle.id) ?? null;
    return {
      vehicleId: vehicle.id,
      vehicleLabel: vehicleLabel(vehicle),
      isUberTaxi: vehicle.isUberTaxi === true,
      currentCount: progress?.currentCount ?? 0,
      visitsRequired: resolveVisitsRequired(progress, setting, vehicle),
    };
  });
  const legacy = progresses.find((p) => !p.vehicle);
  return { rows, legacyCount: legacy?.currentCount ?? 0 };
}
