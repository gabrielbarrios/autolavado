import { strapiServerFetch } from "./server";
import type { Promotion, LoyaltyProgress } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

/**
 * Sin `filters[user]`: esa clave devolvía 400 "Invalid key user" para el rol
 * `authenticated`. El backend filtra por el JWT (backend/src/utils/owner-scope.ts).
 */
export async function listMyPromotions(): Promise<Promotion[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Promotion>>("/api/promotions", {
    query: {
      "filters[used][$eq]": "false",
      "sort[0]": "validUntil:asc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

/**
 * Lo que el cliente puede usar HOY: sus promos de fidelidad sin gastar más las
 * campañas vigentes. Las reglas de disponibilidad (día de la semana, rango de
 * fechas) las evalúa el backend para que cliente y caja vean lo mismo.
 */
export async function listAvailablePromotions(): Promise<Promotion[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Promotion>>(
    "/api/promotions/available",
    { cache: "no-store" },
  );
  return res.data ?? [];
}

export async function getMyLoyaltyProgress(): Promise<LoyaltyProgress | null> {
  const res = await strapiServerFetch<StrapiCollectionResponse<LoyaltyProgress>>("/api/loyalty-progresses", {
    cache: "no-store",
  });
  return res.data?.[0] ?? null;
}

export async function redeemPromotion(id: number) {
  return strapiServerFetch(`/api/promotions/${id}`, {
    method: "PUT",
    body: { data: { used: true, usedAt: new Date().toISOString() } },
  });
}

/* ------------------------------------------------------------------ */
/* Administración del catálogo de campañas                             */
/* ------------------------------------------------------------------ */

export interface PromotionPayload {
  title: string;
  description?: string;
  code: string;
  kind: "campaign";
  availability: "always" | "weekdays" | "dateRange";
  weekdays?: number[];
  appliesTo: "all" | "package" | "extras";
  discountType: "percent" | "fixed" | "free";
  discountValue: number;
  validFrom?: string | null;
  validUntil?: string | null;
  active: boolean;
}

/** Todas las promociones, campañas y personales (vista de admin). */
export async function listAllPromotions(): Promise<Promotion[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Promotion>>("/api/promotions", {
    query: { "populate[user]": "true", "pagination[pageSize]": "300" },
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function createPromotion(payload: PromotionPayload) {
  return strapiServerFetch("/api/promotions", { method: "POST", body: { data: payload } });
}

export async function updatePromotion(id: number, payload: Partial<PromotionPayload>) {
  return strapiServerFetch(`/api/promotions/${id}`, { method: "PUT", body: { data: payload } });
}

export async function deletePromotion(id: number) {
  return strapiServerFetch(`/api/promotions/${id}`, { method: "DELETE" });
}
