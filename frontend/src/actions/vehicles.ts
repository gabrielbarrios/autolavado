"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { vehicleSchema } from "@/lib/validations/vehicle";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/strapi/vehicles";
import { StrapiError } from "@/lib/strapi/client";
import type { ActionResult } from "./auth";

function flatten(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".");
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function createVehicleAction(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const parsed = vehicleSchema.safeParse({
    brand: formData.get("brand"),
    model: formData.get("model"),
    year: Number(formData.get("year")),
    color: formData.get("color"),
    plate: formData.get("plate"),
    notes: formData.get("notes"),
    vehicleType: formData.get("vehicleType"),
    isUberTaxi: formData.get("isUberTaxi") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos", fields: flatten(parsed.error) };
  try {
    await createVehicle({
      ...parsed.data,
      plate: parsed.data.plate || undefined,
      notes: parsed.data.notes || undefined,
    });
    revalidatePath("/autos");
    revalidatePath("/perfil");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo crear" };
  }
}

export async function updateVehicleAction(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const parsed = vehicleSchema.safeParse({
    brand: formData.get("brand"),
    model: formData.get("model"),
    year: Number(formData.get("year")),
    color: formData.get("color"),
    plate: formData.get("plate"),
    notes: formData.get("notes"),
    vehicleType: formData.get("vehicleType"),
    isUberTaxi: formData.get("isUberTaxi") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos", fields: flatten(parsed.error) };
  try {
    await updateVehicle(id, {
      ...parsed.data,
      plate: parsed.data.plate || undefined,
      notes: parsed.data.notes || undefined,
    });
    revalidatePath("/autos");
    revalidatePath("/perfil");
    revalidatePath("/reservar");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo actualizar" };
  }
}

export async function deleteVehicleAction(id: number): Promise<ActionResult> {
  await requireUser();
  try {
    await deleteVehicle(id);
    revalidatePath("/autos");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo eliminar" };
  }
}
