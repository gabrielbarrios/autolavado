"use server";

import { requireSuperAdmin } from "@/lib/auth/guards";
import {
  employeeEarnings,
  employeeTimes,
  type EarningsGranularity,
  type EmployeeEarnings,
  type EmployeeTimes,
} from "@/lib/strapi/admin";
import { StrapiError } from "@/lib/strapi/client";
import type { ActionResult } from "./auth";

/**
 * Tiempos por empleado de un día. Es una action (y no data del server component)
 * porque los límites del día los calcula el navegador con su zona horaria.
 */
export async function employeeTimesAction(
  fromISO: string,
  toISO: string,
): Promise<ActionResult<EmployeeTimes>> {
  await requireSuperAdmin();
  try {
    return { ok: true, data: await employeeTimes(fromISO, toISO) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudieron cargar los tiempos",
    };
  }
}

/** Ganancias por día / semana / mes. Ventana y zona horaria las decide el navegador. */
export async function employeeEarningsAction(
  fromISO: string,
  toISO: string,
  granularity: EarningsGranularity,
  tzOffset: number,
): Promise<ActionResult<EmployeeEarnings>> {
  await requireSuperAdmin();
  try {
    return { ok: true, data: await employeeEarnings(fromISO, toISO, granularity, tzOffset) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudieron cargar las ganancias",
    };
  }
}
