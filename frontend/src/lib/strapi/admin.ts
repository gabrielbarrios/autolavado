import { strapiServerFetch } from "./server";
import type { User } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

export async function listAllUsers(): Promise<User[]> {
  // El plugin users-permissions devuelve un array directo, no envuelto en {data, meta}.
  const res = await strapiServerFetch<User[] | StrapiCollectionResponse<User>>("/api/users", {
    query: {
      "populate[role]": "true",
      "pagination[pageSize]": "200",
    },
    cache: "no-store",
  });
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string | null;
}

/**
 * Todo el que atiende el negocio: empleados, admins y super admins. Va por
 * `/api/qr/staff` y no por `/api/users`: el empleado no tiene permiso para
 * listar usuarios (es el padrón de clientes) y aquí solo hace falta el
 * personal, para el selector "Acreditar a" del tablero.
 */
export async function listStaff(): Promise<StaffMember[]> {
  const res = await strapiServerFetch<{ staff: StaffMember[] }>("/api/qr/staff", {
    cache: "no-store",
  });
  return res.staff ?? [];
}

export interface EmployeeStatRow {
  id: number;
  name: string;
  email: string;
  role: string;
  washes: number;
  earnings: number;
}

export interface EmployeeStats {
  admins: EmployeeStatRow[];
  daily: { date: string; washes: number; earnings: number }[];
  unassigned: { washes: number; earnings: number };
  totals: { admins: number; washes: number; earnings: number };
}

export async function employeeStats(): Promise<EmployeeStats | null> {
  try {
    return await strapiServerFetch<EmployeeStats>("/api/qr/employee-stats", {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

/** Un auto lavado: cuánto estuvo en `in_progress` y quién lo atendió. */
export interface EmployeeTimeRow {
  id: number;
  startedAt: string;
  finishedAt: string;
  /** Segundos que el auto estuvo en status "trabajando". */
  seconds: number;
  /** `completed` = ya cobrado; `to_pay` = terminado pero aún en caja; `cancelled`. */
  status: string;
  /** Total del ticket (paquete + extras − descuentos). Definitivo solo si `completed`. */
  totalAmount: number;
  /** Nombres de los servicios extra que llevó el lavado. */
  extras: string[];
  employee: { id: number; name: string } | null;
  vehicle: string;
  customer: string | null;
  package: string | null;
}

export interface EmployeeTimeGroup {
  id: number | null;
  name: string;
  cars: number;
  totalSeconds: number;
  avgSeconds: number;
  fastestSeconds: number | null;
  slowestSeconds: number | null;
}

export interface EmployeeTimes {
  from: string;
  to: string;
  rows: EmployeeTimeRow[];
  byEmployee: EmployeeTimeGroup[];
  /** Autos que empezaron en la ventana y siguen sin marcarse como terminados. */
  stillRunning: number;
  totals: { cars: number; totalSeconds: number; avgSeconds: number };
}

/**
 * La ventana se pasa como dos instantes ISO calculados en el navegador: el
 * "día" es el de quien mira, no el del servidor (que corre en UTC).
 */
export async function employeeTimes(fromISO: string, toISO: string): Promise<EmployeeTimes> {
  return strapiServerFetch<EmployeeTimes>("/api/qr/employee-times", {
    query: { from: fromISO, to: toISO },
    cache: "no-store",
  });
}

export type { EarningsGranularity } from "@/lib/report-dates";
import type { EarningsGranularity } from "@/lib/report-dates";

/**
 * Efectivo, tarjeta y transferencia. `unknown` son los servicios cobrados antes
 * de que existiera `paymentMethod`; los cuatro suman siempre lo mismo que `earnings`.
 */
export type PaymentSplitKey = "cash" | "card" | "transfer" | "unknown";
export type PaymentSplit = Record<PaymentSplitKey, { washes: number; earnings: number }>;

/** Cuántos extras y cuánto generaron (a precio de catálogo, antes de descuentos). */
export interface ExtrasTotals {
  count: number;
  earnings: number;
}

export interface ExtrasItemRow extends ExtrasTotals {
  id: number;
  name: string;
}

/** Extras de un empleado en la ventana, con el detalle de cada servicio extra. */
export interface ExtrasEmployeeRow extends ExtrasTotals {
  id: number | null;
  name: string;
  items: ExtrasItemRow[];
}

export interface ExtrasBreakdown {
  totals: ExtrasTotals;
  byExtra: ExtrasItemRow[];
  byEmployee: ExtrasEmployeeRow[];
}

export interface EmployeeEarningsBucket {
  /** YYYY-MM-DD del inicio del periodo en la zona horaria del navegador. */
  key: string;
  start: string;
  end: string;
  washes: number;
  earnings: number;
  /** Ganancias del periodo por empleado; la clave es el id o "unassigned". */
  byEmployee: Record<string, number>;
  byPayment: PaymentSplit;
  /** Servicios extra vendidos en el periodo. */
  extras: ExtrasTotals;
}

export interface EmployeeEarningsRow {
  id: number | null;
  name: string;
  role: string | null;
  washes: number;
  earnings: number;
  subtotal: number;
  promotionDiscount: number;
  manualDiscount: number;
  avgTicket: number;
  /** Extra services this employee sold in the window (catalog price, before discounts). */
  extras: ExtrasTotals;
  byPayment: PaymentSplit;
}

export interface EmployeeEarnings {
  from: string;
  to: string;
  granularity: EarningsGranularity;
  series: EmployeeEarningsBucket[];
  byEmployee: EmployeeEarningsRow[];
  /** Servicios extra: cuántos, quién los hizo y cuánto generó cada uno. */
  extras: ExtrasBreakdown;
  totals: {
    washes: number;
    earnings: number;
    subtotal: number;
    promotionDiscount: number;
    manualDiscount: number;
    avgTicket: number;
    byPayment: PaymentSplit;
  };
}

/**
 * Ganancias de una ventana agrupadas por día / semana / mes. Igual que los
 * tiempos: la ventana y el offset de zona horaria vienen del navegador para
 * que los cortes de día sean los de quien mira y no los del servidor (UTC).
 */
export async function employeeEarnings(
  fromISO: string,
  toISO: string,
  granularity: EarningsGranularity,
  tzOffset: number,
): Promise<EmployeeEarnings> {
  return strapiServerFetch<EmployeeEarnings>("/api/qr/employee-earnings", {
    query: { from: fromISO, to: toISO, granularity, tzOffset },
    cache: "no-store",
  });
}

/** One charged car on the "Trabajos" list. */
export interface JobRow {
  id: number;
  /** When it was charged (ISO). */
  date: string;
  /** Board stamps: waiting→in_progress and in_progress→to_pay. Null if it skipped the board. */
  startedAt: string | null;
  finishedAt: string | null;
  /** Seconds between the two stamps; null when either is missing. */
  seconds: number | null;
  vehicle: string;
  customer: string | null;
  employee: { id: number; name: string } | null;
  package: string | null;
  extras: string[];
  paymentMethod: "cash" | "card" | "transfer" | null;
  /** What actually came in: package + extras − discounts. */
  totalAmount: number;
  discount: number;
}

/** The earnings report plus the per-car list; optionally narrowed to one employee. */
export interface JobsReport extends EmployeeEarnings {
  jobs: JobRow[];
}

export async function jobsReport(
  fromISO: string,
  toISO: string,
  granularity: EarningsGranularity,
  tzOffset: number,
  employeeId: number | null,
): Promise<JobsReport> {
  return strapiServerFetch<JobsReport>("/api/qr/jobs", {
    query: {
      from: fromISO,
      to: toISO,
      granularity,
      tzOffset,
      ...(employeeId ? { employeeId } : {}),
    },
    cache: "no-store",
  });
}

export async function adminStats() {
  // Estadísticas calculadas con queries paralelas; usa `pagination[pageSize]=1` con `pagination[withCount]=true` para obtener total.
  const safe = async <T>(p: Promise<T>) => p.catch(() => null);

  const [users, visits, appointments, orders] = await Promise.all([
    safe(
      strapiServerFetch<StrapiCollectionResponse<unknown>>("/api/users/count", { cache: "no-store" }),
    ),
    safe(
      strapiServerFetch<StrapiCollectionResponse<unknown>>("/api/visits", {
        query: { "pagination[pageSize]": "1", "pagination[withCount]": "true" },
        cache: "no-store",
      }),
    ),
    safe(
      strapiServerFetch<StrapiCollectionResponse<unknown>>("/api/appointments", {
        query: {
          "filters[status][$eq]": "pending",
          "pagination[pageSize]": "1",
          "pagination[withCount]": "true",
        },
        cache: "no-store",
      }),
    ),
    safe(
      strapiServerFetch<StrapiCollectionResponse<unknown>>("/api/orders", {
        query: { "pagination[pageSize]": "1", "pagination[withCount]": "true" },
        cache: "no-store",
      }),
    ),
  ]);

  return {
    usersCount: typeof users === "number" ? users : 0,
    visitsCount: visits?.meta?.pagination?.total ?? 0,
    pendingAppointments: appointments?.meta?.pagination?.total ?? 0,
    ordersCount: orders?.meta?.pagination?.total ?? 0,
  };
}
