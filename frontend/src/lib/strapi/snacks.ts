import { strapiFetch } from "./client";
import { strapiServerFetch } from "./server";
import type { Snack, SnackCategory } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

/**
 * Lista de snacks del mostrador. El content type NO tiene draftAndPublish, así
 * que lo que se crea se ve al instante (a diferencia de `product`, que necesita
 * `status=published` al crearse).
 *
 * El orden es el que puso el dueño y, a igualdad, alfabético: la lista se lee
 * en pantalla mientras alguien espera en la caja.
 */
const LIST_QUERY = {
  "populate[category]": "true",
  "sort[0]": "order:asc",
  "sort[1]": "name:asc",
  "pagination[pageSize]": "200",
};

const CATEGORY_QUERY = {
  "sort[0]": "order:asc",
  "sort[1]": "name:asc",
  "pagination[pageSize]": "100",
};

/** Todos los snacks, activos o no (vista de administración). */
export async function listAllSnacks(): Promise<Snack[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Snack>>("/api/snacks", {
    query: LIST_QUERY,
    cache: "no-store",
  });
  return res.data ?? [];
}

/**
 * Solo los que están a la venta hoy. Va por `strapiFetch` (anónimo) porque la
 * página /snacks la ve cualquiera, con sesión o sin ella; el rol `public` tiene
 * `find` sobre snacks (ver PUBLIC_PERMISSIONS en backend/src/index.ts).
 */
export async function listActiveSnacks(): Promise<Snack[]> {
  const res = await strapiFetch<StrapiCollectionResponse<Snack>>("/api/snacks", {
    query: { ...LIST_QUERY, "filters[active][$eq]": "true" },
    cache: "no-store",
  });
  return res.data ?? [];
}

/** Todas las categorías, activas o no (vista de administración). */
export async function listAllSnackCategories(): Promise<SnackCategory[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<SnackCategory>>(
    "/api/snack-categories",
    { query: CATEGORY_QUERY, cache: "no-store" },
  );
  return res.data ?? [];
}

/** Las categorías que se muestran en la página pública. */
export async function listActiveSnackCategories(): Promise<SnackCategory[]> {
  const res = await strapiFetch<StrapiCollectionResponse<SnackCategory>>("/api/snack-categories", {
    query: { ...CATEGORY_QUERY, "filters[active][$eq]": "true" },
    cache: "no-store",
  });
  return res.data ?? [];
}

export interface SnackPayload {
  name: string;
  /** Opcional: `null` es "se pregunta en caja", distinto de cero. */
  price?: number | null;
  /** Id de la categoría, o `null` para dejarlo sin agrupar. */
  category?: number | null;
  order?: number;
  active: boolean;
}

export async function createSnack(payload: SnackPayload) {
  return strapiServerFetch("/api/snacks", { method: "POST", body: { data: payload } });
}

export async function updateSnack(id: number, payload: Partial<SnackPayload>) {
  return strapiServerFetch(`/api/snacks/${id}`, { method: "PUT", body: { data: payload } });
}

export async function deleteSnack(id: number) {
  return strapiServerFetch(`/api/snacks/${id}`, { method: "DELETE" });
}

export interface SnackCategoryPayload {
  name: string;
  order?: number;
  active: boolean;
}

export async function createSnackCategory(payload: SnackCategoryPayload) {
  return strapiServerFetch("/api/snack-categories", { method: "POST", body: { data: payload } });
}

export async function updateSnackCategory(id: number, payload: Partial<SnackCategoryPayload>) {
  return strapiServerFetch(`/api/snack-categories/${id}`, {
    method: "PUT",
    body: { data: payload },
  });
}

/** Borrar la categoría NO borra sus snacks: quedan "Sin categoría". */
export async function deleteSnackCategory(id: number) {
  return strapiServerFetch(`/api/snack-categories/${id}`, { method: "DELETE" });
}
