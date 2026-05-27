import { strapiFetch } from "./client";
import type { SiteSetting } from "@/types/models";
import type { StrapiSingleResponse } from "@/types/strapi";

export async function getSiteSetting(): Promise<SiteSetting | null> {
  try {
    const res = await strapiFetch<StrapiSingleResponse<SiteSetting>>("/api/site-setting", {
      query: {
        "populate[logo]": "true",
        "populate[heroVideo]": "true",
        "populate[heroImage]": "true",
        "populate[gallery]": "true",
        "populate[businessHours]": "true",
        "populate[closedDates]": "true",
        "populate[faqs]": "true",
        "populate[testimonials][populate]": "avatar",
        "populate[contactInfo]": "true",
      },
      cache: "no-store",
    });
    return res.data ?? null;
  } catch {
    return null;
  }
}
