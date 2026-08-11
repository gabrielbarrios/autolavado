import type { Promotion } from "@/types/models";
import { formatDate } from "@/lib/utils";

const DAY_NAMES = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

/** "20% off", "-$50", "Gratis". */
export function discountLabel(promo: Pick<Promotion, "discountType" | "discountValue">): string {
  if (promo.discountType === "percent") return `${promo.discountValue}% off`;
  if (promo.discountType === "fixed") return `-$${promo.discountValue}`;
  return "Gratis";
}

/** "Solo lavado", "Solo servicios extra", "Lavado y extras". */
export function appliesToLabel(appliesTo: Promotion["appliesTo"]): string {
  if (appliesTo === "package") return "Solo lavado";
  if (appliesTo === "extras") return "Solo servicios extra";
  return "Lavado y extras";
}

/**
 * Frase legible de cuándo aplica: "Todos los miércoles", "Del 3 al 7 de sep",
 * "Siempre disponible". Se usa igual en el panel del admin y en la página del
 * cliente para que ambos lean lo mismo.
 */
export function availabilityLabel(promo: Promotion): string {
  const { availability, weekdays, validFrom, validUntil } = promo;

  if (availability === "always") return "Siempre disponible";

  if (availability === "weekdays") {
    const days = (weekdays ?? []).map((d) => DAY_NAMES[d]).filter(Boolean);
    const base =
      days.length === 0
        ? "Días por definir"
        : days.length === 1
          ? `Todos los ${days[0]}`
          : `Todos los ${days.slice(0, -1).join(", ")} y ${days[days.length - 1]}`;
    if (validFrom && validUntil) {
      return `${base}, del ${formatDate(validFrom)} al ${formatDate(validUntil)}`;
    }
    return base;
  }

  if (validFrom && validUntil) return `Del ${formatDate(validFrom)} al ${formatDate(validUntil)}`;
  if (validUntil) return `Hasta el ${formatDate(validUntil)}`;
  if (validFrom) return `A partir del ${formatDate(validFrom)}`;
  return "Sin fechas";
}
