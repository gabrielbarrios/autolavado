// Tipos genéricos de Strapi v5
// En v5 los atributos están aplanados directamente en `data` (no como en v4 que iba data.attributes).

export interface StrapiMedia {
  id: number;
  url: string;
  formats?: {
    thumbnail?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
  };
  alternativeText?: string | null;
  width?: number;
  height?: number;
  mime?: string;
  name?: string;
}

export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta: {
    pagination?: StrapiPagination;
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface StrapiErrorResponse {
  data: null;
  error: {
    status: number;
    name: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type StrapiResponse<T> = StrapiCollectionResponse<T> | StrapiSingleResponse<T> | StrapiErrorResponse;
