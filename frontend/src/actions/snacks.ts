"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { StrapiError } from "@/lib/strapi/client";
import { createSnack, updateSnack, deleteSnack, type SnackPayload } from "@/lib/strapi/snacks";
import type { ActionResult } from "./auth";

/** La lista es del dueño: crear, editar y borrar son de admin, no del mostrador. */
function message(err: unknown, fallback: string): string {
  return err instanceof StrapiError ? err.message : fallback;
}

function parseName(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim().slice(0, 80);
}

/** El precio llega de un `<input type="number">`: puede venir vacío o con coma. */
function parsePrice(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim().replace(",", ".");
  if (!value) return null;
  const price = Number(value);
  if (!isFinite(price) || price <= 0) return null;
  return Math.round(price * 100) / 100;
}

export async function createSnackAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = parseName(formData.get("name"));
  if (!name) return { ok: false, error: "Ponle un nombre al snack" };

  const price = parsePrice(formData.get("price"));
  if (price === null) return { ok: false, error: "El precio debe ser mayor a cero" };

  try {
    const payload: SnackPayload = { name, price, active: true };
    await createSnack(payload);
    revalidatePath("/snacks-admin");
    revalidatePath("/snacks");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo agregar el snack") };
  }
}

export async function updateSnackAction(
  id: number,
  values: { name: string; price: number },
): Promise<ActionResult> {
  await requireAdmin();

  const name = parseName(values.name);
  if (!name) return { ok: false, error: "Ponle un nombre al snack" };

  const price = parsePrice(String(values.price));
  if (price === null) return { ok: false, error: "El precio debe ser mayor a cero" };

  try {
    await updateSnack(id, { name, price });
    revalidatePath("/snacks-admin");
    revalidatePath("/snacks");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo guardar el snack") };
  }
}

/** Sacarlo de la venta sin perder el precio, para cuando vuelva a haber. */
export async function toggleSnackAction(id: number, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    await updateSnack(id, { active });
    revalidatePath("/snacks-admin");
    revalidatePath("/snacks");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo actualizar el snack") };
  }
}

export async function deleteSnackAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteSnack(id);
    revalidatePath("/snacks-admin");
    revalidatePath("/snacks");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo eliminar el snack") };
  }
}
