import { STRAPI_API_URL } from "../constants";

export interface StrapiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  // Next.js fetch extensions
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
}

function buildUrl(path: string, query?: StrapiFetchOptions["query"]) {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, STRAPI_API_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function strapiFetch<T = unknown>(path: string, opts: StrapiFetchOptions = {}): Promise<T> {
  const { body, token, query, headers, ...rest } = opts;
  const url = buildUrl(path, query);

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const errMsg =
      json && typeof json === "object" && "error" in json
        ? (json as { error?: { message?: string } }).error?.message
        : undefined;
    const message = errMsg ?? `Strapi request failed (${res.status})`;
    throw new StrapiError(message, res.status, json);
  }

  return json as T;
}

export class StrapiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "StrapiError";
    this.status = status;
    this.body = body;
  }
}
