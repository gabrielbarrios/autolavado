import { strapiServerFetch } from "./server";
import type { Package } from "@/types/models";
import type { StrapiCollectionResponse, StrapiSingleResponse } from "@/types/strapi";

/**
 * Todas las lecturas van por `strapiServerFetch` a propósito: reenvía el JWT de
 * la sesión, y Strapi usa ese rol para decidir si incluye `pricing.vipPrice`.
 * Con `strapiFetch` (anónimo) un cliente VIP nunca vería su tarifa.
 */
interface ListOpts {
  featuredOnly?: boolean;
  pageSize?: number;
}

const PACKAGE_POPULATE = {
  "populate[image]": "true",
  "populate[pricing]": "true",
};

export async function listPackages(opts: ListOpts = {}): Promise<Package[]> {
  const query: Record<string, string | number | undefined> = {
    ...PACKAGE_POPULATE,
    "sort[0]": "order:asc",
    "pagination[pageSize]": opts.pageSize ?? 50,
  };
  if (opts.featuredOnly) {
    query["filters[featured][$eq]"] = "true";
  }
  const res = await strapiServerFetch<StrapiCollectionResponse<Package>>("/api/packages", {
    query,
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function getPackageBySlug(slug: string): Promise<Package | null> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Package>>("/api/packages", {
    query: {
      ...PACKAGE_POPULATE,
      "filters[slug][$eq]": slug,
    },
    cache: "no-store",
  });
  return res.data?.[0] ?? null;
}

export async function getPackage(id: number): Promise<Package | null> {
  try {
    const res = await strapiServerFetch<StrapiSingleResponse<Package>>(`/api/packages/${id}`, {
      query: PACKAGE_POPULATE,
    });
    return res.data ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Administración del catálogo                                         */
/* ------------------------------------------------------------------ */

/** Fila de precio tal como la espera el componente `shared.vehicle-type-price`. */
export interface VehicleTypePricePayload {
  vehicleType: string;
  price: number;
  uberTaxiPrice?: number | null;
  vipPrice?: number | null;
}

export interface PackagePayload {
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  benefits?: string[];
  featured: boolean;
  order?: number;
  pricing: VehicleTypePricePayload[];
}

/**
 * `status=published` es necesario: el content-type tiene draftAndPublish y sin
 * él la entrada nace como borrador, invisible para `find` (y por tanto para el
 * cliente). El rol admin tiene el permiso `create` (ver backend/src/index.ts).
 */
export async function createPackage(payload: PackagePayload) {
  return strapiServerFetch("/api/packages", {
    method: "POST",
    query: { status: "published" },
    body: { data: payload },
  });
}

/** ¿Ya hay un paquete con este slug? Mira borradores y publicados. */
export async function packageSlugTaken(slug: string): Promise<boolean> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Package>>("/api/packages", {
    query: { "filters[slug][$eq]": slug, "fields[0]": "slug", status: "draft" },
    cache: "no-store",
  });
  return (res.data ?? []).length > 0;
}
