import { formatPrice } from "@/lib/utils";
import type {
  ExtraService,
  Package,
  Vehicle,
  VehicleType,
  VehicleTypeDef,
  VehicleTypePrice,
} from "@/types/models";

/**
 * Los tipos de auto con los que nació la app. Ya NO son la lista real —esa vive
 * en Strapi (api::vehicle-type) y se lee con `listVehicleTypes()`— pero se
 * conservan como respaldo: si el catálogo no carga, los selectores siguen
 * ofreciendo algo en vez de quedarse vacíos.
 */
export const FALLBACK_VEHICLE_TYPES: VehicleTypeDef[] = [
  { id: -1, slug: "chico", name: "Chico", order: 1 },
  { id: -2, slug: "sedan", name: "Sedán", order: 2 },
  { id: -3, slug: "suv", name: "SUV (Camioneta)", order: 3 },
  { id: -4, slug: "camioneta_grande", name: "Camioneta grande", order: 4 },
  { id: -5, slug: "combi", name: "Combi / Van", order: 5 },
];

/** "camioneta_grande" → "Camioneta grande". Para slugs que ya no están en el catálogo. */
function prettifySlug(slug: string): string {
  const words = slug.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Etiqueta de un tipo de auto. `types` es el catálogo vivo: pásalo donde lo
 * tengas a mano (o usa el hook `useVehicleTypes`) para que un tipo renombrado
 * en Strapi se lea con su nombre nuevo. Sin catálogo cae al respaldo y, si el
 * slug tampoco está ahí (un tipo borrado que sigue guardado en un auto viejo),
 * lo muestra legible en vez de crudo.
 */
export function vehicleTypeLabel(
  t: VehicleType | string | null | undefined,
  types?: VehicleTypeDef[],
): string {
  if (!t) return "—";
  if (t === "uber_taxi") return "Uber / Taxi";
  const found = (types ?? FALLBACK_VEHICLE_TYPES).find((v) => v.slug === t);
  if (found) return found.name;
  const fallback = FALLBACK_VEHICLE_TYPES.find((v) => v.slug === t);
  return fallback ? fallback.name : prettifySlug(t);
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

/**
 * ¿Este paquete o servicio tiene precio para ese tipo de auto?
 *
 * Sirve para no ofrecer lo que no aplica: si "cuatrimoto" solo tiene fila de
 * precio en el paquete Moto, al elegir cuatrimoto el resto de paquetes no debe
 * aparecer. Sin tipo elegido no filtra nada (se ve el catálogo completo, con su
 * precio "desde").
 *
 * Basta con que exista la fila: darle precio a un tipo es justamente la forma
 * de decir "este servicio aplica a estos autos".
 *
 * Excepción: un extra marcado como "a cotizar" no tiene filas de precio
 * justamente porque el costo depende del tamaño del auto — aplica a todos, así
 * que el filtro no lo puede esconder.
 */
export function appliesToVehicleType(
  item: { pricing?: VehicleTypePrice[] | null; quoteOnRequest?: boolean },
  vehicleType?: VehicleType | null,
): boolean {
  if (!vehicleType) return true;
  if (item.quoteOnRequest) return true;
  return (item.pricing ?? []).some((p) => p.vehicleType === vehicleType);
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
  // A cotizar: no tiene precio de catálogo, lo pone la caja al cobrar.
  if (extra.quoteOnRequest) return 0;
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
  if (extra.quoteOnRequest) return { min: 0, max: 0 };
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

/**
 * Frase que ve el cliente cuando el servicio se cotiza en sucursal. Está en un
 * solo lugar porque aparece en el home, en /otros-servicios, en /paquetes y al
 * reservar: si cambia el texto, cambia en todos.
 */
export const QUOTE_ON_REQUEST_LABEL =
  "El precio depende del tamaño del carro, favor de cotizar el costo";

/** Versión corta, para donde no cabe la frase completa (tarjetas, resúmenes). */
export const QUOTE_ON_REQUEST_SHORT = "A cotizar";

/**
 * Texto de precio de un servicio extra, ya resuelto: el monto para ese auto o,
 * si se cotiza en sucursal, el aviso. Centralizado para que las seis pantallas
 * que muestran extras digan lo mismo.
 */
export function extraServicePriceText(
  extra: ExtraService,
  vehicle?: Vehicle | null,
  ctx: PriceContext = {},
  short = false,
): string {
  if (extra.quoteOnRequest) return short ? QUOTE_ON_REQUEST_SHORT : QUOTE_ON_REQUEST_LABEL;
  return formatPrice(computeExtraServicePrice(extra, vehicle, ctx));
}

/** ¿El extra tiene al menos un precio configurado? */
export function extraServiceHasPricing(extra: ExtraService): boolean {
  return Boolean(extra.pricing && extra.pricing.length > 0);
}
