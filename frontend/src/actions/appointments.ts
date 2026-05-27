"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/auth/guards";
import { appointmentSchema } from "@/lib/validations/appointment";
import {
  createAppointment,
  updateAppointmentStatus,
  updateAppointment,
} from "@/lib/strapi/appointments";
import { StrapiError } from "@/lib/strapi/client";
import type { AppointmentStatus } from "@/types/models";
import type { ActionResult } from "./auth";

export async function createAppointmentAction(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const extrasRaw = String(formData.get("extraServiceIds") ?? "");
  const extraServiceIds = extrasRaw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const rawPackageId = Number(formData.get("packageId"));
  const parsed = appointmentSchema.safeParse({
    packageId: Number.isFinite(rawPackageId) && rawPackageId > 0 ? rawPackageId : undefined,
    vehicleId: Number(formData.get("vehicleId")),
    date: formData.get("date"),
    timeSlot: formData.get("timeSlot"),
    customerNotes: formData.get("customerNotes"),
    extraServiceIds,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await createAppointment({
      vehicle: parsed.data.vehicleId,
      package: parsed.data.packageId,
      date: parsed.data.date,
      timeSlot: parsed.data.timeSlot,
      customerNotes: parsed.data.customerNotes || undefined,
      extraServices: parsed.data.extraServiceIds.length > 0 ? parsed.data.extraServiceIds : undefined,
    });
    revalidatePath("/perfil");
    revalidatePath("/reservar");
    revalidatePath("/historial");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo crear la reservación" };
  }
}

export async function setAppointmentStatusAction(
  id: number,
  status: AppointmentStatus,
  adminNotes?: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await updateAppointmentStatus(id, status, adminNotes);
    revalidatePath("/reservaciones");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo actualizar" };
  }
}

export async function rescheduleAppointmentAction(
  id: number,
  payload: { date: string; timeSlot: string; packageId?: number; adminNotes?: string },
): Promise<ActionResult> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return { ok: false, error: "Fecha inválida" };
  }
  if (!/^\d{2}:\d{2}$/.test(payload.timeSlot)) {
    return { ok: false, error: "Hora inválida" };
  }
  try {
    await updateAppointment(id, {
      date: payload.date,
      timeSlot: payload.timeSlot,
      ...(payload.packageId ? { package: payload.packageId } : {}),
      ...(payload.adminNotes !== undefined ? { adminNotes: payload.adminNotes } : {}),
    });
    revalidatePath("/reservaciones");
    revalidatePath("/perfil");
    revalidatePath("/historial");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo reagendar",
    };
  }
}
