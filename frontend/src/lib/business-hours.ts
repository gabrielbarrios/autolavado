import type { BusinessHour, ClosedDate, WeekDay } from "@/types/models";

export const WEEK_DAYS: WeekDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS_ES: Record<WeekDay, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export function dayLabel(day: WeekDay): string {
  return DAY_LABELS_ES[day] ?? day;
}

/**
 * Normaliza el formato de tiempo que devuelve Strapi (`HH:mm:ss.SSS` o `HH:mm:ss`)
 * a `HH:mm` para visualización y cálculos.
 */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const match = /^(\d{2}):(\d{2})/.exec(t);
  return match ? `${match[1]}:${match[2]}` : t;
}

/** Devuelve el horario indexado por día (monday..sunday). */
export function hoursByDay(items: BusinessHour[] | undefined): Partial<Record<WeekDay, BusinessHour>> {
  const out: Partial<Record<WeekDay, BusinessHour>> = {};
  if (!items) return out;
  for (const h of items) {
    if (h.day) out[h.day] = h;
  }
  return out;
}

/** Convierte una fecha YYYY-MM-DD al WeekDay correspondiente. */
export function weekDayFromISODate(iso: string): WeekDay {
  const d = new Date(`${iso}T00:00:00`);
  // 0=Sun..6=Sat → WEEK_DAYS empieza en Monday
  const jsDay = d.getDay();
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return WEEK_DAYS[idx];
}

/** ¿La fecha está cerrada (fija o por horario sin apertura)? */
export function isDateClosed(
  isoDate: string,
  businessHours: BusinessHour[] | undefined,
  closedDates: ClosedDate[] | undefined,
): { closed: boolean; reason?: string } {
  const blocked = closedDates?.find((c) => c.date === isoDate);
  if (blocked) return { closed: true, reason: blocked.reason ?? "Cerrado" };

  const day = weekDayFromISODate(isoDate);
  const hours = hoursByDay(businessHours)[day];
  if (!hours || hours.closed) return { closed: true, reason: "Sin horario asignado" };
  if (!hours.open || !hours.close) return { closed: true, reason: "Sin horario asignado" };
  return { closed: false };
}

/** Genera slots de `intervalMinutes` entre `open` y `close`. Acepta el formato de Strapi. */
export function generateSlots(open: string, close: string, intervalMinutes = 60): string[] {
  const o = formatTime(open);
  const c = formatTime(close);
  if (!o || !c) return [];
  const [oh, om] = o.split(":").map(Number);
  const [ch, cm] = c.split(":").map(Number);
  const start = oh * 60 + om;
  const end = ch * 60 + cm;
  const out: string[] = [];
  for (let t = start; t + intervalMinutes <= end; t += intervalMinutes) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    out.push(`${h}:${m}`);
  }
  return out;
}
