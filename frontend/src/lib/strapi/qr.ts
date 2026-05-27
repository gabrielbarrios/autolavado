import { strapiServerFetch } from "./server";
import type {
  User,
  Vehicle,
  Promotion,
  LoyaltyProgress,
  Appointment,
  VehicleType,
} from "@/types/models";

export interface QRScanResult {
  user: User;
  vehicles: Vehicle[];
  loyaltyProgress: LoyaltyProgress | null;
  activePromotions: Promotion[];
  todayAppointments: Appointment[];
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
  visit: { id: number; date: string };
  service: { id: number };
  promotionGenerated?: Promotion | null;
  loyaltyProgress: LoyaltyProgress;
}

export async function registerVisit(payload: RegisterVisitPayload): Promise<RegisterVisitResult> {
  return strapiServerFetch<RegisterVisitResult>("/api/qr/register-visit", {
    method: "POST",
    body: payload,
  });
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
  service: { id: number; totalAmount: number };
}

export async function walkInService(payload: WalkInServicePayload): Promise<WalkInServiceResult> {
  return strapiServerFetch<WalkInServiceResult>("/api/qr/walk-in-service", {
    method: "POST",
    body: payload,
  });
}
