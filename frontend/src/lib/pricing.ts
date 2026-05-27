import type {
  ExtraService,
  Package,
  Vehicle,
  VehicleType,
  VehicleTypePrice,
} from "@/types/models";

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "chico", label: "Chico" },
  { value: "sedan", label: "Sedán" },
  { value: "suv", label: "SUV (Camioneta)" },
  { value: "camioneta_grande", label: "Camioneta grande" },
  { value: "combi", label: "Combi / Van" },
];

const TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(VEHICLE_TYPES.map((t) => [t.value, t.label])),
  uber_taxi: "Uber / Taxi",
};

export function vehicleTypeLabel(t: VehicleType | string | null | undefined): string {
  if (!t) return "—";
  return TYPE_LABELS[t] ?? t;
}

/**
 * Precio efectivo de una fila pricing según si el vehículo es Uber/Taxi:
 * - Uber/Taxi y `uberTaxiPrice` definido → uberTaxiPrice
 * - Caso contrario → price
 */
function effectiveRowPrice(row: VehicleTypePrice, isUberTaxi: boolean): number {
  if (isUberTaxi && row.uberTaxiPrice != null) return Number(row.uberTaxiPrice);
  return Number(row.price);
}

/**
 * Devuelve el precio del paquete para un vehículo dado:
 * 1. Si hay vehicleType → busca esa fila y aplica regla de uberTaxiPrice por fila.
 * 2. Si no hay vehicleType pero isUberTaxi=true → menor precio efectivo Uber del array.
 * 3. Sin selección → menor `price` normal del array (fallback "desde $X").
 * 4. Legacy: fila vehicleType="uber_taxi" o top-level `uberTaxiPrice`.
 */
export function computePackagePrice(pkg: Package, vehicle?: Vehicle | null): number {
  const pricing = pkg.pricing ?? [];
  const isUberTaxi = !!vehicle?.isUberTaxi;
  const type = vehicle?.vehicleType;

  if (type) {
    const entry = pricing.find((p) => p.vehicleType === type);
    if (entry) return effectiveRowPrice(entry, isUberTaxi);
  }

  const normalRows = pricing.filter((p) => p.vehicleType !== "uber_taxi");

  if (isUberTaxi) {
    if (normalRows.length > 0) {
      return Math.min(...normalRows.map((r) => effectiveRowPrice(r, true)));
    }
    // Legacy
    const legacyRow = pricing.find((p) => p.vehicleType === "uber_taxi");
    if (legacyRow) return Number(legacyRow.price);
    if (pkg.uberTaxiPrice != null) return Number(pkg.uberTaxiPrice);
  }

  if (normalRows.length > 0) {
    return Math.min(...normalRows.map((r) => Number(r.price)));
  }
  return 0;
}

/**
 * Rango de precios NORMALES del paquete (min/max) — sólo `price`, ignora `uberTaxiPrice`.
 * Útil para mostrar "desde $X" cuando el cliente aún no activó el switch Uber/Taxi.
 */
export function packagePriceRange(pkg: Package): { min: number; max: number } {
  const prices: number[] = [];
  if (pkg.pricing) {
    for (const p of pkg.pricing) {
      if (p.vehicleType === "uber_taxi") continue;
      prices.push(Number(p.price));
    }
  }
  if (prices.length === 0 && pkg.uberTaxiPrice != null) prices.push(Number(pkg.uberTaxiPrice));
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** ¿El paquete tiene al menos un precio configurado? */
export function packageHasPricing(pkg: Package): boolean {
  return Boolean(pkg.pricing && pkg.pricing.length > 0);
}

/**
 * Precio del servicio extra para un vehículo dado.
 * Misma jerarquía que computePackagePrice.
 */
export function computeExtraServicePrice(
  extra: ExtraService,
  vehicle?: Vehicle | null,
): number {
  const pricing = extra.pricing ?? [];
  const isUberTaxi = !!vehicle?.isUberTaxi;
  const type = vehicle?.vehicleType;

  if (type) {
    const entry = pricing.find((p) => p.vehicleType === type);
    if (entry) return effectiveRowPrice(entry, isUberTaxi);
  }

  const normalRows = pricing.filter((p) => p.vehicleType !== "uber_taxi");

  if (isUberTaxi) {
    if (normalRows.length > 0) {
      return Math.min(...normalRows.map((r) => effectiveRowPrice(r, true)));
    }
    const legacyRow = pricing.find((p) => p.vehicleType === "uber_taxi");
    if (legacyRow) return Number(legacyRow.price);
    if (extra.uberTaxiPrice != null) return Number(extra.uberTaxiPrice);
  }

  if (normalRows.length > 0) {
    return Math.min(...normalRows.map((r) => Number(r.price)));
  }
  return Number(extra.price ?? 0);
}

/**
 * Rango de precios NORMALES del extra (min/max) — sólo `price`, ignora `uberTaxiPrice`.
 * Útil para mostrar "desde $X" cuando el cliente aún no activó el switch Uber/Taxi.
 */
export function extraServicePriceRange(
  extra: ExtraService,
): { min: number; max: number } {
  const prices: number[] = [];
  if (extra.pricing) {
    for (const p of extra.pricing) {
      if (p.vehicleType === "uber_taxi") continue;
      prices.push(Number(p.price));
    }
  }
  if (prices.length === 0) {
    if (extra.uberTaxiPrice != null) prices.push(Number(extra.uberTaxiPrice));
    if (extra.price != null) prices.push(Number(extra.price));
  }
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** ¿El extra tiene al menos un precio configurado? */
export function extraServiceHasPricing(extra: ExtraService): boolean {
  return Boolean(extra.pricing && extra.pricing.length > 0);
}
