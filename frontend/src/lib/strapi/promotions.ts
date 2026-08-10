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
