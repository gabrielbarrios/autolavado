import { strapiServerFetch } from "./server";
import type {
  User,
  Vehicle,
  Promotion,
  LoyaltyProgress,
  Appointment,
  Service,
  ServiceStatus,
  VehicleType,
} from "@/types/models";

export interface QRScanResult {
  user: User;
  vehicles: Vehicle[];
  loyaltyProgress: LoyaltyProgress | null;
  activePromotions: Promotion[];
  todayAppointments: Appointment[];
  /** Todas las reservaciones del cliente (últimas 50, más recientes primero). */
  appointments: Appointment[];
}

export async function scanQR(qrToken: string): Promise<QRScanResult> {
  return strapiServerFetch<QRScanResult>("/api/qr/scan", {
    method: "POST",
    body: { qrToken },
  });
}

export interface RegisterVisitPayload {
  userId: number;
  vehicleId: number;
  packageId: number;
  notes?: string;
  extraServiceIds?: number[];
}

export interface RegisterVisitResult {
  service: { id: number; totalAmount: number; status: ServiceStatus };
}

export async function registerVisit(payload: RegisterVisitPayload): Promise<RegisterVisitResult> {
  return strapiServerFetch<RegisterVisitResult>("/api/qr/register-visit", {
    method: "POST",
    body: payload,
  });
}

export interface CompleteServiceResult {
  service: { id: number; status: ServiceStatus };
  promotionGenerated: Promotion | null;
  loyaltyProgress: LoyaltyProgress | null;
}

export async function completeService(
  serviceId: number,
  performedByAdminId?: number,
): Promise<CompleteServiceResult> {
  return strapiServerFetch<CompleteServiceResult>("/api/qr/complete-service", {
    method: "POST",
    body: { serviceId, ...(performedByAdminId ? { performedByAdminId } : {}) },
  });
}

export async function listInProgressServices(): Promise<Service[]> {
  const res = await strapiServerFetch<{ services: Service[] }>("/api/qr/in-progress-services", {
    cache: "no-store",
  });
  return res.services ?? [];
}

export interface WalkInServicePayload {
  customerName?: string;
  vehicleType?: VehicleType;
  isUberTaxi?: boolean;
  packageId?: number;
  extraServiceIds?: number[];
  notes?: string;
}

export interface WalkInServiceResult {
  service: { id: number; totalAmount: number; status: ServiceStatus };
}

export async function walkInService(payload: WalkInServicePayload): Promise<WalkInServiceResult> {
  return strapiServerFetch<WalkInServiceResult>("/api/qr/walk-in-service", {
    method: "POST",
    body: payload,
  });
}
