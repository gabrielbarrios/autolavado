import { strapiServerFetch } from "./server";
import type { ExtraService } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";
import type { VehicleTypePricePayload } from "./packages";

interface ListOpts {
  featuredOnly?: boolean;
  pageSize?: number;
}

export async function listExtraServices(opts: ListOpts = {}): Promise<ExtraService[]> {
  const query: Record<string, string | number | undefined> = {
    "populate[image]": "true",
    "populate[pricing]": "true",
    "filters[active][$eq]": "true",
    "sort[0]": "order:asc",
    "pagination[pageSize]": opts.pageSize ?? 100,
  };
  if (opts.featuredOnly) {
    query["filters[featured][$eq]"] = "true";
  }
  // Server fetch + no-store a propósito: reenvía el JWT para que Strapi decida
  // si incluye `pricing.vipPrice`, y evita que una respuesta cacheada con
  // precios VIP se le sirva a un visitante anónimo.
  const res = await strapiServerFetch<StrapiCollectionResponse<ExtraService>>(
    "/api/extra-services",
    {
      query,
      cache: "no-store",
    },
  );
  return res.data ?? [];
}

/** Para el admin: incluye inactivos */
export async function listAllExtraServicesAdmin(): Promise<ExtraService[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<ExtraService>>(
    "/api/extra-services",
    {
      query: {
        "populate[image]": "true",
        "populate[pricing]": "true",
        "sort[0]": "order:asc",
        "pagination[pageSize]": "200",
      },
      cache: "no-store",
    },
  );
  return res.data ?? [];
}

/* ------------------------------------------------------------------ */
/* Administración del catálogo                                         */
/* ------------------------------------------------------------------ */

export interface ExtraServicePayload {
  name: string;
  slug: string;
  description?: string;
  estimatedDuration?: number | null;
  featured: boolean;
  active: boolean;
  order?: number;
  pricing: VehicleTypePricePayload[];
  /** Sin precio de catálogo: la caja cotiza el monto al cobrar. */
  quoteOnRequest?: boolean;
}

/**
 * `status=published` es necesario: el content-type tiene draftAndPublish y sin
 * él la entrada nace como borrador, invisible para `find` (y por tanto para el
 * cliente). El rol admin tiene el permiso `create` (ver backend/src/index.ts).
 */
export async function createExtraService(payload: ExtraServicePayload) {
  return strapiServerFetch("/api/extra-services", {
    method: "POST",
    query: { status: "published" },
    body: { data: payload },
  });
}

/** ¿Ya hay un servicio con este slug? Mira borradores y publicados. */
export async function extraServiceSlugTaken(slug: string): Promise<boolean> {
  const res = await strapiServerFetch<StrapiCollectionResponse<ExtraService>>(
    "/api/extra-services",
    {
      query: { "filters[slug][$eq]": slug, "fields[0]": "slug", status: "draft" },
      cache: "no-store",
    },
  );
  return (res.data ?? []).length > 0;
}
