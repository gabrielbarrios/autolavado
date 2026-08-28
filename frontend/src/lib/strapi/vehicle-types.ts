import { strapiFetch } from "./client";
import type { VehicleTypeDef } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";

/**
 * Catálogo de tipos de auto. Va por `strapiFetch` (anónimo) porque es lectura
 * pública y no depende de la sesión: la web pública también necesita la lista
 * para mostrar precios por tipo.
 *
 * Los inactivos se filtran acá: siguen existiendo para que los autos ya
 * guardados con ese slug conserven su etiqueta, pero no se ofrecen al elegir.
 */
export async function listVehicleTypes(): Promise<VehicleTypeDef[]> {
  const res = await strapiFetch<StrapiCollectionResponse<VehicleTypeDef>>("/api/vehicle-types", {
    query: { "sort[0]": "order:asc", "sort[1]": "name:asc", "pagination[pageSize]": "100" },
    cache: "no-store",
  });
  return (res.data ?? []).filter((t) => t.active !== false);
}
