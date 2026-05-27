import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "../constants";
import { strapiFetch, type StrapiFetchOptions } from "./client";

/**
 * Helper de fetch para Strapi desde el servidor que inyecta el JWT del usuario logueado.
 * Next.js 16: `cookies()` es async — siempre await.
 */
export async function strapiServerFetch<T = unknown>(path: string, opts: StrapiFetchOptions = {}): Promise<T> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return strapiFetch<T>(path, { ...opts, token: opts.token ?? token });
}

/** Fetch con el token de administrador (server-only, para llamadas privilegiadas). */
export async function strapiAdminFetch<T = unknown>(path: string, opts: StrapiFetchOptions = {}): Promise<T> {
  const token = process.env.STRAPI_ADMIN_API_TOKEN;
  return strapiFetch<T>(path, { ...opts, token });
}
