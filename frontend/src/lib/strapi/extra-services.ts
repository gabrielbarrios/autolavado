import { strapiServerFetch } from "./server";
import type { ExtraService } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

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
