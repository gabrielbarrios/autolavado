import { strapiFetch } from "./client";
import { strapiServerFetch } from "./server";
import type { Product } from "@/types/models";
import type { StrapiCollectionResponse, StrapiSingleResponse } from "@/types/strapi";

export async function listProducts(category?: string): Promise<Product[]> {
  const query: Record<string, string | undefined> = {
    "filters[active][$eq]": "true",
    "populate[images]": "true",
    "sort[0]": "createdAt:desc",
    "pagination[pageSize]": "100",
  };
  if (category) query["filters[category][$eq]"] = category;
  const res = await strapiFetch<StrapiCollectionResponse<Product>>("/api/products", {
    query,
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await strapiFetch<StrapiCollectionResponse<Product>>("/api/products", {
    query: { "filters[slug][$eq]": slug, "populate[images]": "true" },
    cache: "no-store",
  });
  return res.data?.[0] ?? null;
}

export async function listAllProductsAdmin(): Promise<Product[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Product>>("/api/products", {
    query: {
      "populate[images]": "true",
      "sort[0]": "createdAt:desc",
      "pagination[pageSize]": "200",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}
