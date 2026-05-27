import { strapiServerFetch } from "./server";
import type { Promotion, LoyaltyProgress } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

export async function listMyPromotions(userId: number): Promise<Promotion[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Promotion>>("/api/promotions", {
    query: {
      "filters[user][id][$eq]": userId,
      "filters[used][$eq]": "false",
      "sort[0]": "validUntil:asc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function getMyLoyaltyProgress(userId: number): Promise<LoyaltyProgress | null> {
  const res = await strapiServerFetch<StrapiCollectionResponse<LoyaltyProgress>>("/api/loyalty-progresses", {
    query: { "filters[user][id][$eq]": userId },
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
