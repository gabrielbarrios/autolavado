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
