"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/guards";
import {
  scanQR,
  registerVisit,
  walkInService,
  appointmentToBoard,
  startService,
  finishService,
  revertServiceToWaiting,
  chargeService,
  cancelService,
  availablePromotions,
  type AvailablePromotionsResult,
  type ChargeServicePayload,
  type QRScanResult,
  type RegisterVisitResult,
  type WalkInServicePayload,
  type WalkInServiceResult,
  type AppointmentToBoardResult,
  type ChargeServiceResult,
  setServiceExtras,
  type SetServiceExtrasResult,
} from "@/lib/strapi/qr";
import { redeemPromotion } from "@/lib/strapi/promotions";
import { updateAppointmentStatus } from "@/lib/strapi/appointments";
import { StrapiError } from "@/lib/strapi/client";
import type { ActionResult } from "./auth";

export async function scanQRAction(qrToken: string): Promise<ActionResult<QRScanResult>> {
  await requireStaff();
  if (!qrToken?.trim()) return { ok: false, error: "Token vacío" };
  try {
    const data = await scanQR(qrToken.trim());
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "QR no válido" };
  }
}

export async function registerVisitAction(payload: {
  userId: number;
  vehicleId: number;
  packageId: number;
  notes?: string;
  extraServiceIds?: number[];
}): Promise<ActionResult<RegisterVisitResult>> {
  await requireStaff();
  try {
    const data = await registerVisit(payload);
    revalidatePath("/dashboard");
    revalidatePath("/servicios");
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo registrar la visita" };
  }
}

/**
 * Marca una cita como completada → el controller del appointment dispara
 * la creación automática de Visit + Service con extras y precio computado.
 */
export async function completeAppointmentFromQRAction(
  appointmentId: number,
): Promise<ActionResult> {
  await requireStaff();
  try {
    await updateAppointmentStatus(appointmentId, "completed");
    revalidatePath("/dashboard");
    revalidatePath("/reservaciones");
    revalidatePath("/servicios");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo completar la cita",
    };
  }
}

export async function walkInServiceAction(
  payload: WalkInServicePayload,
): Promise<ActionResult<WalkInServiceResult>> {
  await requireStaff();
  try {
    const data = await walkInService(payload);
    revalidatePath("/dashboard");
    revalidatePath("/servicios");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo registrar el servicio",
    };
  }
}

/**
 * El cliente llegó antes de su cita y hay cupo → manda la reservación al
 * tablero de /en-progreso como `waiting` para que un empleado inicie el lavado.
 */
export async function sendAppointmentToBoardAction(
  appointmentId: number,
): Promise<ActionResult<AppointmentToBoardResult>> {
  await requireStaff();
  try {
    const data = await appointmentToBoard(appointmentId);
    revalidatePath("/reservaciones");
    revalidatePath("/en-progreso");
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo mandar al tablero",
    };
  }
}

/** waiting → in_progress: un empleado toma el auto. */
export async function startServiceAction(
  serviceId: number,
  performedByAdminId?: number,
): Promise<ActionResult<{ service: { id: number; status: string } }>> {
  await requireStaff();
  try {
    const data = await startService(serviceId, performedByAdminId);
    revalidatePath("/en-progreso");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo iniciar el servicio",
    };
  }
}

/** in_progress → to_pay: el empleado termina el lavado. */
export async function finishServiceAction(
  serviceId: number,
): Promise<ActionResult<{ service: { id: number; status: string } }>> {
  await requireStaff();
  try {
    const data = await finishService(serviceId);
    revalidatePath("/en-progreso");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo terminar el lavado",
    };
  }
}

/** in_progress → waiting: regresa el lavado a la fila (empleado mal asignado, pausa). */
export async function revertServiceToWaitingAction(
  serviceId: number,
  reason?: string,
): Promise<ActionResult<{ service: { id: number; status: string } }>> {
  await requireStaff();
  try {
    const data = await revertServiceToWaiting(serviceId, reason);
    revalidatePath("/en-progreso");
    revalidatePath("/servicios");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo regresar el servicio a espera",
    };
  }
}

/** Cambia los extras de un auto en el tablero; el total se recalcula en el backend. */
export async function setServiceExtrasAction(
  serviceId: number,
  extraServiceIds: number[],
): Promise<ActionResult<SetServiceExtrasResult>> {
  await requireStaff();
  try {
    const data = await setServiceExtras(serviceId, extraServiceIds);
    revalidatePath("/en-progreso");
    return { ok: true, data };
  } catch (err) {
    // Un error que no es de Strapi (conexión rechazada, respuesta que no es
    // JSON) casi siempre es "Strapi apagado o reiniciando": se dice tal cual y
    // se deja rastro en el servidor para no adivinar.
    console.error("[qr] set-extras failed", err);
    if (err instanceof StrapiError) return { ok: false, error: err.message };
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `No se pudieron guardar los extras: no hubo respuesta de Strapi (${detail})`,
    };
  }
}

/** Promos aplicables a un servicio, para el diálogo de cobro. */
export async function availablePromotionsAction(
  serviceId: number,
): Promise<ActionResult<AvailablePromotionsResult>> {
  await requireStaff();
  try {
    return { ok: true, data: await availablePromotions(serviceId) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudieron cargar las promociones",
    };
  }
}

/**
 * to_pay → completed: la caja cobra al cliente (dispara fidelidad).
 * El descuento va en el payload; el backend lo recalcula y valida — nunca se
 * confía en el monto que mande el navegador.
 */
export async function chargeServiceAction(
  payload: ChargeServicePayload,
): Promise<ActionResult<ChargeServiceResult>> {
  await requireStaff();
  try {
    const data = await chargeService(payload);
    revalidatePath("/en-progreso");
    revalidatePath("/servicios");
    revalidatePath("/dashboard");
    revalidatePath("/empleados");
    // Cobrar cierra la reservación ligada, si el service vino de una.
    revalidatePath("/reservaciones");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo cobrar el servicio",
    };
  }
}

/** Cualquier estado activo → cancelled. */
export async function cancelServiceAction(
  serviceId: number,
  reason?: string,
): Promise<ActionResult<{ service: { id: number; status: string } }>> {
  await requireStaff();
  try {
    const data = await cancelService(serviceId, reason);
    revalidatePath("/en-progreso");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo cancelar el servicio",
    };
  }
}

export async function redeemPromotionAction(promotionId: number): Promise<ActionResult> {
  await requireStaff();
  try {
    await redeemPromotion(promotionId);
    revalidatePath("/escanear");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo aplicar" };
  }
}
