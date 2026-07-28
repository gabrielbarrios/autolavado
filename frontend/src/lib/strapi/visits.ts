import { strapiServerFetch } from "./server";
import type { Visit, Service } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

export async function listMyVisits(userId: number): Promise<Visit[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Visit>>("/api/visits", {
    query: {
      "filters[user][id][$eq]": userId,
      "populate[package]": "true",
      "populate[vehicle]": "true",
      "sort[0]": "date:desc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function listMyServices(userId: number): Promise<Service[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Service>>("/api/services", {
    query: {
      "filters[user][id][$eq]": userId,
      "filters[status][$eq]": "completed",
      "populate[package]": "true",
      "populate[vehicle]": "true",
      "sort[0]": "date:desc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

/**
 * Servicios del cliente que siguen en el tablero (waiting | in_progress | to_pay).
 * Es lo que alimenta el seguimiento "¿dónde está mi auto?" en /perfil.
 */
export async function listMyActiveServices(userId: number): Promise<Service[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Service>>("/api/services", {
    query: {
      "filters[user][id][$eq]": userId,
      "filters[status][$in][0]": "waiting",
      "filters[status][$in][1]": "in_progress",
      "filters[status][$in][2]": "to_pay",
      "populate[package]": "true",
      "populate[vehicle]": "true",
      "populate[extraServices]": "true",
      "sort[0]": "date:asc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function listAllServices(): Promise<Service[]> {
  // /servicios es el historial — solo los completados. Los in_progress viven en /en-progreso.
  const res = await strapiServerFetch<StrapiCollectionResponse<Service>>("/api/services", {
    query: {
      "filters[status][$eq]": "completed",
      "populate[package]": "true",
      "populate[vehicle]": "true",
      "populate[user]": "true",
      "populate[performedBy]": "true",
      "populate[extraServices]": "true",
      "sort[0]": "date:desc",
      "pagination[pageSize]": "200",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}
