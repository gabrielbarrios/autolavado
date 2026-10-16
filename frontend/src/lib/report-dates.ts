import type { DateRange } from "react-day-picker";

/**
 * Date helpers shared by the earnings reports (Empleados and Trabajos). Every
 * window is computed in the browser's time zone: the "day" is the viewer's,
 * not the server's (which runs in UTC).
 */

export type EarningsGranularity = "day" | "week" | "month";

export const GRANULARITY_OPTIONS: { value: EarningsGranularity; label: string }[] = [
  { value: "day", label: "Por día" },
  { value: "week", label: "Por semana" },
  { value: "month", label: "Por mes" },
];

/**
 * Presets by granularity. Each resolves to a [from, to) window in the
 * browser's time zone; "custom" uses the calendar picker.
 */
export const PRESETS: Record<EarningsGranularity, { value: string; label: string }[]> = {
  day: [
    { value: "today", label: "Hoy" },
    { value: "yesterday", label: "Ayer" },
    { value: "last7", label: "Últimos 7 días" },
    { value: "last30", label: "Últimos 30 días" },
    { value: "custom", label: "Fechas elegidas" },
  ],
  week: [
    { value: "thisWeek", label: "Esta semana" },
    { value: "lastWeek", label: "Semana pasada" },
    { value: "last4w", label: "Últimas 4 semanas" },
    { value: "last12w", label: "Últimas 12 semanas" },
    { value: "custom", label: "Fechas elegidas" },
  ],
  month: [
    { value: "thisMonth", label: "Este mes" },
    { value: "lastMonth", label: "Mes pasado" },
    { value: "last6m", label: "Últimos 6 meses" },
    { value: "last12m", label: "Últimos 12 meses" },
    { value: "custom", label: "Fechas elegidas" },
  ],
};

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Reads YYYY-MM-DD as a local date (new Date("YYYY-MM-DD") would be UTC). */
export function fromInputDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** [from, to) window for a preset; `to` is exclusive. Null for "custom" or unknown. */
export function presetBounds(preset: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "yesterday":
      return { from: addDays(today, -1), to: today };
    case "last7":
      return { from: addDays(today, -6), to: addDays(today, 1) };
    case "last30":
      return { from: addDays(today, -29), to: addDays(today, 1) };
    case "thisWeek": {
      const from = startOfWeek(now);
      return { from, to: addDays(from, 7) };
    }
    case "lastWeek": {
      const to = startOfWeek(now);
      return { from: addDays(to, -7), to };
    }
    case "last4w":
      return { from: addDays(startOfWeek(now), -21), to: addDays(startOfWeek(now), 7) };
    case "last12w":
      return { from: addDays(startOfWeek(now), -77), to: addDays(startOfWeek(now), 7) };
    case "thisMonth": {
      const from = startOfMonth(now);
      return { from, to: addMonths(from, 1) };
    }
    case "lastMonth": {
      const to = startOfMonth(now);
      return { from: addMonths(to, -1), to };
    }
    case "last6m":
      return { from: addMonths(startOfMonth(now), -5), to: addMonths(startOfMonth(now), 1) };
    case "last12m":
      return { from: addMonths(startOfMonth(now), -11), to: addMonths(startOfMonth(now), 1) };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Short period label for axes and tables. */
export function bucketLabel(key: string, granularity: EarningsGranularity): string {
  const d = fromInputDate(key);
  if (!d) return key;
  if (granularity === "month") return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  if (granularity === "week") {
    const end = addDays(d, 6);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Long period label (tooltips and tables). */
export function bucketLongLabel(key: string, granularity: EarningsGranularity): string {
  const d = fromInputDate(key);
  if (!d) return key;
  if (granularity === "month") {
    return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  }
  if (granularity === "week") {
    const end = addDays(d, 6);
    const f = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    return `Semana del ${f(d)} al ${f(end)}`;
  }
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

/** "3 oct 2026" or "1 oct 2026 – 7 oct 2026"; `to` is exclusive. */
export function rangeLabel(fromISO: string, toISO: string): string {
  const f = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const from = new Date(fromISO);
  // `to` is exclusive: the last included day is the one before.
  const last = addDays(new Date(toISO), -1);
  return from.getTime() >= last.getTime() ? f(from) : `${f(from)} – ${f(last)}`;
}

/** Calendar button text: "3 oct 2026" or "1 – 7 oct 2026". */
export function dateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Elegir fechas";
  const f = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  if (!range.to || range.to.getTime() === range.from.getTime()) return f(range.from);
  return `${f(range.from)} – ${f(range.to)}`;
}

/**
 * Granularity that keeps a chart readable for a window: days up to a month,
 * weeks up to about half a year, months beyond that.
 */
export function granularityForSpan(from: Date, to: Date): EarningsGranularity {
  const days = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 31) return "day";
  if (days <= 190) return "week";
  return "month";
}
