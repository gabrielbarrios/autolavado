"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { StrapiError } from "@/lib/strapi/client";
import {
  createSnack,
  updateSnack,
  deleteSnack,
  createSnackCategory,
  updateSnackCategory,
  deleteSnackCategory,
  type SnackPayload,
} from "@/lib/strapi/snacks";
import type { ActionResult } from "./auth";

/** La lista es del dueño: crear, editar y borrar son de admin, no del mostrador. */
function message(err: unknown, fallback: string): string {
  return err instanceof StrapiError ? err.message : fallback;
}

/** La lista se ve en el panel y en la página pública: hay que refrescar las dos. */
function revalidateSnacks() {
  revalidatePath("/snacks-admin");
  revalidatePath("/snacks");
}

function parseName(raw: FormDataEntryValue | string | null, max = 80): string {
  return String(raw ?? "").trim().slice(0, max);
}

/** El precio llega de un `<input type="number">`: puede venir vacío o con coma. */
function parsePrice(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim().replace(",", ".");
  if (!value) return null;
  const price = Number(value);
  if (!isFinite(price) || price <= 0) return null;
  return Math.round(price * 100) / 100;
}

/** El `<select>` de categoría manda "" cuando el snack no va en ninguna. */
function parseCategory(raw: FormDataEntryValue | number | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/* ------------------------------------------------------------------ */
/* Snacks                                                              */
/* ------------------------------------------------------------------ */

export async function createSnackAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = parseName(formData.get("name"));
  if (!name) return { ok: false, error: "Ponle un nombre al snack" };

  const price = parsePrice(formData.get("price"));
  if (price === null) return { ok: false, error: "El precio debe ser mayor a cero" };

  try {
    const payload: SnackPayload = {
      name,
      price,
      category: parseCategory(formData.get("category")),
      active: true,
    };
    await createSnack(payload);
    revalidateSnacks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo agregar el snack") };
  }
}

export async function updateSnackAction(
  id: number,
  values: { name: string; price: number; category: number | null },
): Promise<ActionResult> {
  await requireAdmin();

  const name = parseName(values.name);
  if (!name) return { ok: false, error: "Ponle un nombre al snack" };

  const price = parsePrice(String(values.price));
  if (price === null) return { ok: false, error: "El precio debe ser mayor a cero" };

  try {
    await updateSnack(id, { name, price, category: parseCategory(values.category) });
    revalidateSnacks();
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
    revalidateSnacks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo actualizar el snack") };
  }
}

export async function deleteSnackAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteSnack(id);
    revalidateSnacks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo eliminar el snack") };
  }
}

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

export async function createSnackCategoryAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = parseName(formData.get("name"), 60);
  if (!name) return { ok: false, error: "Ponle un nombre a la categoría" };

  try {
    await createSnackCategory({ name, active: true });
    revalidateSnacks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo crear la categoría") };
  }
}

export async function renameSnackCategoryAction(id: number, name: string): Promise<ActionResult> {
  await requireAdmin();

  const clean = parseName(name, 60);
  if (!clean) return { ok: false, error: "Ponle un nombre a la categoría" };

  try {
    await updateSnackCategory(id, { name: clean });
    revalidateSnacks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo renombrar la categoría") };
  }
}

/**
 * Eliminar una categoría deja sus snacks sin agrupar, no los borra: la lista de
 * precios no se pierde por reorganizar el menú.
 */
export async function deleteSnackCategoryAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteSnackCategory(id);
    revalidateSnacks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err, "No se pudo eliminar la categoría") };
  }
}
