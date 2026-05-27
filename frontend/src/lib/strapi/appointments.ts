import { strapiServerFetch } from "./server";
import type { Appointment, AppointmentStatus } from "@/types/models";
import type { StrapiCollectionResponse, StrapiSingleResponse } from "@/types/strapi";

export async function listMyAppointments(_userId?: number): Promise<Appointment[]> {
  // El backend ya filtra por usuario autenticado
  const res = await strapiServerFetch<StrapiCollectionResponse<Appointment>>("/api/appointments", {
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function listAllAppointments(status?: AppointmentStatus): Promise<Appointment[]> {
  const query: Record<string, string | undefined> = {};
  if (status) query["filters[status][$eq]"] = status;
  const res = await strapiServerFetch<StrapiCollectionResponse<Appointment>>("/api/appointments", {
    query,
    cache: "no-store",
  });
  return res.data ?? [];
}

export interface CreateAppointmentPayload {
  vehicle: number;
  package?: number;
  date: string;
  timeSlot: string;
  customerNotes?: string;
  extraServices?: number[];
}

export async function createAppointment(payload: CreateAppointmentPayload) {
  return strapiServerFetch<StrapiSingleResponse<Appointment>>("/api/appointments", {
    method: "POST",
    body: { data: payload },
  });
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus, adminNotes?: string) {
  return strapiServerFetch<StrapiSingleResponse<Appointment>>(`/api/appointments/${id}`, {
    method: "PUT",
    body: { data: { status, adminNotes } },
  });
}

export interface AvailableSlotsResponse {
  closed: boolean;
  reason?: string;
  error?: string;
  slotDuration: number;
  maxParallel: number;
  packageMinutes?: number;
  bookingNumberSlot?: number;
  open?: string;
  close?: string;
  slots: { slot: string; available: boolean }[];
}

export async function fetchAvailableSlots(
  date: string,
  packageId: number | null,
  extraServiceIds: number[] = [],
  excludeAppointmentId?: number,
): Promise<AvailableSlotsResponse | null> {
  try {
    return await strapiServerFetch<AvailableSlotsResponse>("/api/appointments/available-slots", {
      query: {
        date,
        ...(packageId ? { packageId } : {}),
        ...(extraServiceIds.length > 0 ? { extraServiceIds: extraServiceIds.join(",") } : {}),
        excludeAppointmentId,
      },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function updateAppointment(
  id: number,
  payload: Partial<{
    date: string;
    timeSlot: string;
    status: AppointmentStatus;
    adminNotes: string;
    vehicle: number;
    package: number;
  }>,
) {
  return strapiServerFetch<StrapiSingleResponse<Appointment>>(`/api/appointments/${id}`, {
    method: "PUT",
    body: { data: payload },
  });
}
