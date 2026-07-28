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
 * ¿Este usuario paga tarifa VIP? Sirve donde el precio lo define OTRO usuario y
 * no el de la sesión — p.ej. el escáner QR, donde manda el cliente escaneado.
 * El rol puede venir como string o como el objeto de Strapi.
 */
export function isVipUser(user?: { role?: unknown } | null): boolean {
  const role = user?.role;
  if (!role) return false;
  if (typeof role === "string") return role === "vip";
  const { type, name } = role as { type?: string; name?: string };
  return type?.toLowerCase() === "vip" || name?.toLowerCase() === "vip";
}

/** Contexto de precio: características del auto + si el cliente es VIP. */
export interface PriceContext {
  /** El cliente tiene rol VIP. El backend sólo manda `vipPrice` si puede verlo. */
  isVip?: boolean;
}

/**
 * Precio efectivo de una fila pricing. Espeja `resolveRowPrice` del backend
 * (backend/src/utils/pricing.ts) — si cambias la jerarquía, cámbiala en ambos:
 * 1. vipPrice      → cliente VIP y la fila lo tiene definido
 * 2. uberTaxiPrice → auto marcado como Uber/Taxi
 * 3. price         → precio normal del tipo de auto
 *
 * El precio VIP gana sobre el de Uber/Taxi: es la tarifa negociada del cliente.
 */
function effectiveRowPrice(
  row: VehicleTypePrice,
  isUberTaxi: boolean,
  isVip = false,
): number {
  if (isVip && row.vipPrice != null) return Number(row.vipPrice);
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
export function computePackagePrice(
  pkg: Package,
  vehicle?: Vehicle | null,
  ctx: PriceContext = {},
): number {
  const pricing = pkg.pricing ?? [];
  const isUberTaxi = !!vehicle?.isUberTaxi;
  const isVip = !!ctx.isVip;
  const type = vehicle?.vehicleType;

  if (type) {
    const entry = pricing.find((p) => p.vehicleType === type);
    if (entry) return effectiveRowPrice(entry, isUberTaxi, isVip);
  }

  const normalRows = pricing.filter((p) => p.vehicleType !== "uber_taxi");

  if (isUberTaxi) {
    if (normalRows.length > 0) {
      return Math.min(...normalRows.map((r) => effectiveRowPrice(r, true, isVip)));
    }
    // Legacy
    const legacyRow = pricing.find((p) => p.vehicleType === "uber_taxi");
    if (legacyRow) return Number(legacyRow.price);
    if (pkg.uberTaxiPrice != null) return Number(pkg.uberTaxiPrice);
  }

  if (normalRows.length > 0) {
    return Math.min(...normalRows.map((r) => effectiveRowPrice(r, false, isVip)));
  }
  return 0;
}

/**
 * Rango de precios del paquete (min/max) — ignora `uberTaxiPrice`.
 * Útil para mostrar "desde $X" cuando el cliente aún no activó el switch Uber/Taxi.
 * Con `isVip` usa la tarifa VIP de cada fila que la tenga configurada.
 */
export function packagePriceRange(
  pkg: Package,
  ctx: PriceContext = {},
): { min: number; max: number } {
  const prices: number[] = [];
  if (pkg.pricing) {
    for (const p of pkg.pricing) {
      if (p.vehicleType === "uber_taxi") continue;
      prices.push(effectiveRowPrice(p, false, !!ctx.isVip));
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
  ctx: PriceContext = {},
): number {
  const pricing = extra.pricing ?? [];
  const isUberTaxi = !!vehicle?.isUberTaxi;
  const isVip = !!ctx.isVip;
  const type = vehicle?.vehicleType;

  if (type) {
    const entry = pricing.find((p) => p.vehicleType === type);
    if (entry) return effectiveRowPrice(entry, isUberTaxi, isVip);
  }

  const normalRows = pricing.filter((p) => p.vehicleType !== "uber_taxi");

  if (isUberTaxi) {
    if (normalRows.length > 0) {
      return Math.min(...normalRows.map((r) => effectiveRowPrice(r, true, isVip)));
    }
    const legacyRow = pricing.find((p) => p.vehicleType === "uber_taxi");
    if (legacyRow) return Number(legacyRow.price);
    if (extra.uberTaxiPrice != null) return Number(extra.uberTaxiPrice);
  }

  if (normalRows.length > 0) {
    return Math.min(...normalRows.map((r) => effectiveRowPrice(r, false, isVip)));
  }
  return Number(extra.price ?? 0);
}

/**
 * Rango de precios del extra (min/max) — ignora `uberTaxiPrice`.
 * Útil para mostrar "desde $X" cuando el cliente aún no activó el switch Uber/Taxi.
 * Con `isVip` usa la tarifa VIP de cada fila que la tenga configurada.
 */
export function extraServicePriceRange(
  extra: ExtraService,
  ctx: PriceContext = {},
): { min: number; max: number } {
  const prices: number[] = [];
  if (extra.pricing) {
    for (const p of extra.pricing) {
      if (p.vehicleType === "uber_taxi") continue;
      prices.push(effectiveRowPrice(p, false, !!ctx.isVip));
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
