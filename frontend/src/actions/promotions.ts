"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  type PromotionPayload,
} from "@/lib/strapi/promotions";
import { StrapiError } from "@/lib/strapi/client";
import type { ActionResult } from "./auth";

/** Código a partir del título: "Miércoles de chicas" → "MIERCOLES-DE-CHICAS". */
function slugCode(title: string): string {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "PROMO"
  );
}

function parseForm(formData: FormData): PromotionPayload | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Ponle un título a la promoción" };

  const availability = String(formData.get("availability") ?? "always") as
    PromotionPayload["availability"];
  const discountType = String(formData.get("discountType") ?? "percent") as
    PromotionPayload["discountType"];
  const discountValue = Number(formData.get("discountValue") ?? 0);

  if (discountType !== "free" && (!isFinite(discountValue) || discountValue <= 0)) {
    return { error: "El descuento debe ser mayor a cero" };
  }
  if (discountType === "percent" && discountValue > 100) {
    return { error: "Un porcentaje no puede pasar de 100" };
  }

  const weekdays = formData
    .getAll("weekdays")
    .map((v) => Number(v))
    .filter((n) => n >= 0 && n <= 6);
  if (availability === "weekdays" && weekdays.length === 0) {
    return { error: "Elige al menos un día de la semana" };
  }

  const validFrom = String(formData.get("validFrom") ?? "").trim();
  const validUntil = String(formData.get("validUntil") ?? "").trim();
  if (availability === "dateRange") {
    if (!validFrom || !validUntil) return { error: "Un rango necesita fecha de inicio y de fin" };
    if (new Date(validUntil) < new Date(validFrom)) {
      return { error: "La fecha de fin no puede ser anterior a la de inicio" };
    }
  }

  const rawCode = String(formData.get("code") ?? "").trim();

  return {
    title,
    description: String(formData.get("description") ?? "").trim() || undefined,
    code: rawCode ? slugCode(rawCode) : `${slugCode(title)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
    kind: "campaign",
    availability,
    weekdays,
    appliesTo: String(formData.get("appliesTo") ?? "all") as PromotionPayload["appliesTo"],
    discountType,
    discountValue: discountType === "free" ? 0 : discountValue,
    // Un rango sin horas cubre el día completo de fin, no su medianoche.
    validFrom: availability === "always" || !validFrom ? null : new Date(`${validFrom}T00:00:00`).toISOString(),
    validUntil:
      availability === "always" || !validUntil ? null : new Date(`${validUntil}T23:59:59`).toISOString(),
    active: formData.get("active") !== "false",
  };
}

export async function createPromotionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  try {
    await createPromotion(parsed);
    revalidatePath("/promociones-admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo crear la promoción",
    };
  }
}

/** Prender/apagar una campaña sin borrarla. */
export async function togglePromotionAction(id: number, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    await updatePromotion(id, { active });
    revalidatePath("/promociones-admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo actualizar",
    };
  }
}

export async function deletePromotionAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deletePromotion(id);
    revalidatePath("/promociones-admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof StrapiError ? err.message : "No se pudo eliminar",
    };
  }
}
