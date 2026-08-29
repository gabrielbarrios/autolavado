"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { StrapiError } from "@/lib/strapi/client";
import {
  createPackage,
  packageSlugTaken,
  type PackagePayload,
  type VehicleTypePricePayload,
} from "@/lib/strapi/packages";
import {
  createExtraService,
  extraServiceSlugTaken,
  type ExtraServicePayload,
} from "@/lib/strapi/extra-services";
import { createProduct, productSlugTaken, type ProductPayload } from "@/lib/strapi/products";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { listVehicleTypes } from "@/lib/strapi/vehicle-types";
import type { ProductCategory } from "@/types/models";
import type { ActionResult } from "./auth";

/** "Lavado Premium" → "lavado-premium" (el campo `slug` es un uid requerido). */
function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "servicio"
  );
}

/**
 * Slug libre: el uid es único, así que si el nombre choca con algo que ya
 * existe se le añade sufijo (-2, -3…) en vez de reventar con un 400 de Strapi.
 */
async function freeSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  if (!(await taken(base))) return base;
  for (let i = 2; i <= 20; i++) {
    const candidate = `${base}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return isFinite(n) && n >= 0 ? n : null;
}

/**
 * Filas del componente `shared.vehicle-type-price`. El formulario manda un
 * trío de campos por tipo de auto (`price_sedan`, `uber_sedan`, `vip_sedan`);
 * los tipos sin precio normal simplemente no generan fila.
 *
 * Los tipos se leen del catálogo (api::vehicle-type), el mismo que pinta la
 * rejilla del formulario: así un tipo nuevo creado en Strapi se guarda sin
 * tocar este archivo.
 */
async function parsePricing(formData: FormData): Promise<VehicleTypePricePayload[]> {
  const types = await listVehicleTypes().catch(() => []);
  const rows: VehicleTypePricePayload[] = [];
  for (const { slug } of types) {
    const price = num(formData, `price_${slug}`);
    if (price === null) continue;
    rows.push({
      vehicleType: slug,
      price,
      uberTaxiPrice: num(formData, `uber_${slug}`),
      vipPrice: num(formData, `vip_${slug}`),
    });
  }
  return rows;
}

function strapiMessage(err: unknown, fallback: string): string {
  if (err instanceof StrapiError) {
    // El choque de uid es el error típico y su mensaje crudo no dice nada útil.
    if (/unique/i.test(err.message)) return "Ya existe otro con ese nombre";
    return err.message;
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Paquetes de lavado                                                  */
/* ------------------------------------------------------------------ */

export async function createPackageAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Ponle un nombre al paquete" };

  const durationMinutes = num(formData, "durationMinutes") ?? 30;
  if (durationMinutes < 5) return { ok: false, error: "La duración mínima son 5 minutos" };

  const pricing = await parsePricing(formData);
  if (pricing.length === 0) {
    return { ok: false, error: "Pon al menos un precio por tipo de auto" };
  }

  const benefits = String(formData.get("benefits") ?? "")
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  try {
    const payload: PackagePayload = {
      name,
      slug: await freeSlug(slugify(name), packageSlugTaken),
      description: String(formData.get("description") ?? "").trim() || undefined,
      durationMinutes,
      benefits: benefits.length > 0 ? benefits : undefined,
      featured: formData.get("featured") === "on",
      order: num(formData, "order") ?? 0,
      pricing,
    };
    await createPackage(payload);
    revalidatePath("/paquetes-admin");
    revalidatePath("/paquetes");
    revalidatePath("/reservar");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: strapiMessage(err, "No se pudo crear el paquete") };
  }
}

/* ------------------------------------------------------------------ */
/* Otros servicios (extras)                                            */
/* ------------------------------------------------------------------ */

export async function createExtraServiceAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Ponle un nombre al servicio" };

  // O precios por tipo de auto, o "se cotiza en sucursal". Nunca las dos.
  const quoteOnRequest = formData.get("quoteOnRequest") === "on";
  const pricing = quoteOnRequest ? [] : await parsePricing(formData);
  if (!quoteOnRequest && pricing.length === 0) {
    return {
      ok: false,
      error: "Pon al menos un precio por tipo de auto, o marca que se cotiza en sucursal",
    };
  }

  try {
    const payload: ExtraServicePayload = {
      name,
      slug: await freeSlug(slugify(name), extraServiceSlugTaken),
      description: String(formData.get("description") ?? "").trim() || undefined,
      estimatedDuration: num(formData, "estimatedDuration"),
      featured: formData.get("featured") === "on",
      active: formData.get("active") === "on",
      order: num(formData, "order") ?? 0,
      pricing,
      quoteOnRequest,
    };
    await createExtraService(payload);
    revalidatePath("/extras-admin");
    revalidatePath("/otros-servicios");
    revalidatePath("/reservar");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: strapiMessage(err, "No se pudo crear el servicio") };
  }
}

/* ------------------------------------------------------------------ */
/* Productos de la tienda                                              */
/* ------------------------------------------------------------------ */

export async function createProductAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Ponle un nombre al producto" };

  const price = num(formData, "price");
  if (price === null || price <= 0) return { ok: false, error: "El precio debe ser mayor a cero" };

  const stock = num(formData, "stock") ?? 0;

  // La categoría llega de un radio, pero el enum lo manda el schema de Strapi:
  // si viniera algo raro, se guarda como "otros" en vez de reventar con un 400.
  const rawCategory = String(formData.get("category") ?? "otros");
  const category = (
    PRODUCT_CATEGORIES.includes(rawCategory as ProductCategory) ? rawCategory : "otros"
  ) as ProductCategory;

  try {
    const payload: ProductPayload = {
      name,
      slug: await freeSlug(slugify(name), productSlugTaken),
      description: String(formData.get("description") ?? "").trim() || undefined,
      price,
      stock: Math.round(stock),
      category,
      active: formData.get("active") === "on",
    };
    await createProduct(payload);
    revalidatePath("/productos-admin");
    revalidatePath("/tienda");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: strapiMessage(err, "No se pudo crear el producto") };
  }
}
