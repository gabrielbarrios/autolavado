import { strapiServerFetch } from "./server";
import type { Visit, Service } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

/**
 * Ninguna de estas consultas manda `filters[user]`: el rol `authenticated` no
 * puede leer `plugin::users-permissions.user`, así que Strapi rechazaba esa
 * clave con 400 "Invalid key user". El backend filtra por el JWT — ver
 * backend/src/utils/owner-scope.ts.
 */
export async function listMyVisits(): Promise<Visit[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Visit>>("/api/visits", {
    query: {
      "sort[0]": "date:desc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function listMyServices(): Promise<Service[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Service>>("/api/services", {
    query: {
      "filters[status][$eq]": "completed",
      "sort[0]": "date:desc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

/**
 * Servicios del cliente que siguen en el tablero (waiting | in_progress | to_pay).
 * Es lo que alimenta el seguimiento "¿dónde está mi auto?".
 */
export async function listMyActiveServices(): Promise<Service[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Service>>("/api/services", {
    query: {
      "filters[status][$in][0]": "waiting",
      "filters[status][$in][1]": "in_progress",
      "filters[status][$in][2]": "to_pay",
      "sort[0]": "date:asc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

/**
 * Resultado de consultar los servicios activos sin lanzar. `ok: false` significa
 * que la consulta falló (permisos, red, Strapi caído) — que NO es lo mismo que
 * "el cliente no tiene nada en curso", y la UI debe decir cosas distintas.
 */
export type ActiveServicesResult = { ok: boolean; services: Service[] };

/**
 * Igual que `listMyActiveServices` pero nunca lanza: envuelve el error para que
 * la página siga renderizando y a la vez pueda mostrar que algo falló.
 */
export async function loadMyActiveServices(): Promise<ActiveServicesResult> {
  try {
    return { ok: true, services: await listMyActiveServices() };
  } catch (error) {
    console.error("[services] No se pudieron consultar los servicios activos del cliente", error);
    return { ok: false, services: [] };
  }
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
