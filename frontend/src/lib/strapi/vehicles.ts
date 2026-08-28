import { strapiServerFetch } from "./server";
import type { Vehicle, VehicleType } from "@/types/models";
import type { StrapiCollectionResponse, StrapiSingleResponse } from "@/types/strapi";

/** Lista los vehículos del usuario autenticado. El backend filtra por el JWT. */
export async function listMyVehicles(_userId?: number): Promise<Vehicle[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Vehicle>>("/api/vehicles", {
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function getVehicle(id: number): Promise<Vehicle | null> {
  try {
    const res = await strapiServerFetch<StrapiSingleResponse<Vehicle>>(`/api/vehicles/${id}`, {
      cache: "no-store",
    });
    return res.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Payload que se envía al backend. El campo `user` lo asigna el controller
 * desde el JWT, así que no se manda desde aquí.
 */
export interface CreateVehiclePayload {
  brand: string;
  model: string;
  year: number;
  color: string;
  plate?: string;
  notes?: string;
  /** Slug de un Tipo de auto (api::vehicle-type). */
  vehicleType?: VehicleType;
  isUberTaxi?: boolean;
}

export async function createVehicle(payload: CreateVehiclePayload) {
  return strapiServerFetch<StrapiSingleResponse<Vehicle>>("/api/vehicles", {
    method: "POST",
    body: { data: payload },
  });
}

export async function updateVehicle(id: number, payload: Partial<CreateVehiclePayload>) {
  return strapiServerFetch<StrapiSingleResponse<Vehicle>>(`/api/vehicles/${id}`, {
    method: "PUT",
    body: { data: payload },
  });
}

export async function deleteVehicle(id: number) {
  return strapiServerFetch(`/api/vehicles/${id}`, { method: "DELETE" });
}
