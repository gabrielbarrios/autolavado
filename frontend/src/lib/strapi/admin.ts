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

/** Solo los usuarios admin / super admin (empleados). */
export async function listAdmins(): Promise<User[]> {
  const users = await listAllUsers();
  return users.filter((u) => {
    const r =
      typeof u.role === "string"
        ? u.role
        : (u.role?.type ?? u.role?.name ?? "").toLowerCase();
    return r.includes("admin");
  });
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
  status: string;
  totalAmount: number;
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
