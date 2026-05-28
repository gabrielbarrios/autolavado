"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import {
  scanQR,
  registerVisit,
  walkInService,
  completeService,
  type QRScanResult,
  type RegisterVisitResult,
  type WalkInServicePayload,
  type WalkInServiceResult,
  type CompleteServiceResult,
} from "@/lib/strapi/qr";
import { redeemPromotion } from "@/lib/strapi/promotions";
import { updateAppointmentStatus } from "@/lib/strapi/appointments";
import { StrapiError } from "@/lib/strapi/client";
import type { ActionResult } from "./auth";

export async function scanQRAction(qrToken: string): Promise<ActionResult<QRScanResult>> {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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

export async function completeServiceAction(
  serviceId: number,
): Promise<ActionResult<CompleteServiceResult>> {
  await requireAdmin();
  try {
    const data = await completeService(serviceId);
    revalidatePath("/en-progreso");
    revalidatePath("/servicios");
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo completar el servicio",
    };
  }
}

export async function redeemPromotionAction(promotionId: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await redeemPromotion(promotionId);
    revalidatePath("/escanear");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo aplicar" };
  }
}
