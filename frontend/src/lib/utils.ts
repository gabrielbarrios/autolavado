import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { StrapiMedia } from "@/types/strapi";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string, currency = "MXN") {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateTime(value: string | Date) {
  return formatDate(value, { hour: "2-digit", minute: "2-digit" });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function absoluteStrapiUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export type StrapiImageFormat = "thumbnail" | "small" | "medium" | "large";

/**
 * Devuelve la URL absoluta de una imagen de Strapi eligiendo el formato más adecuado.
 * Strapi genera variantes automáticas: thumbnail (~150px), small (~500px), medium (~750px), large (~1000px).
 * Si el formato preferido no existe, baja al más cercano disponible y al original como fallback.
 *
 * - `thumbnail`: avatares, miniaturas de carrito (~48-80px)
 * - `small`: cards de listado (~150-300px)
 * - `medium`: cards de showcase, headers (~400-700px) ← default
 * - `large`: páginas de detalle, hero
 */
export function strapiMediaUrl(
  media: StrapiMedia | null | undefined,
  preferred: StrapiImageFormat = "medium",
): string | null {
  if (!media) return null;

  const fallbacks: Record<StrapiImageFormat, StrapiImageFormat[]> = {
    thumbnail: ["thumbnail", "small", "medium", "large"],
    small: ["small", "medium", "thumbnail", "large"],
    medium: ["medium", "small", "large", "thumbnail"],
    large: ["large", "medium", "small", "thumbnail"],
  };

  for (const fmt of fallbacks[preferred]) {
    const url = media.formats?.[fmt]?.url;
    if (url) return absoluteStrapiUrl(url);
  }
  return absoluteStrapiUrl(media.url);
}
