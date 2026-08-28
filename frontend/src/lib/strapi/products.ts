import { strapiFetch } from "./client";
import { strapiServerFetch } from "./server";
import type { Product, ProductCategory } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

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

/* ------------------------------------------------------------------ */
/* Administración del catálogo                                         */
/* ------------------------------------------------------------------ */

export interface ProductPayload {
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  category: ProductCategory;
  active: boolean;
}

/**
 * `status=published` es necesario: el content-type tiene draftAndPublish y sin
 * él la entrada nace como borrador, invisible para la tienda. El rol admin
 * tiene el permiso `create` (ver backend/src/index.ts).
 */
export async function createProduct(payload: ProductPayload) {
  return strapiServerFetch("/api/products", {
    method: "POST",
    query: { status: "published" },
    body: { data: payload },
  });
}

/** ¿Ya hay un producto con este slug? Mira borradores y publicados. */
export async function productSlugTaken(slug: string): Promise<boolean> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Product>>("/api/products", {
    query: { "filters[slug][$eq]": slug, "fields[0]": "slug", status: "draft" },
    cache: "no-store",
  });
  return (res.data ?? []).length > 0;
}
