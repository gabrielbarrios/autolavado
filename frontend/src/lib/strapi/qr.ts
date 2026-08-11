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

/** Servicios activos agrupados por estado del pipeline. */
export interface ServiceBoard {
  waiting: Service[];
  in_progress: Service[];
  to_pay: Service[];
}

export async function listBoardServices(): Promise<ServiceBoard> {
  const res = await strapiServerFetch<{ board: ServiceBoard }>("/api/qr/board", {
    cache: "no-store",
  });
  return res.board ?? { waiting: [], in_progress: [], to_pay: [] };
}

/**
 * IDs de las reservaciones que ya tienen un service vivo en el tablero, para
 * que /reservaciones no ofrezca mandarlas dos veces.
 */
export async function listBoardAppointmentIds(): Promise<Set<number>> {
  const board = await listBoardServices();
  const all = [...board.waiting, ...board.in_progress, ...board.to_pay];
  return new Set(all.map((s) => s.appointment?.id).filter((id): id is number => !!id));
}

export interface AppointmentToBoardResult {
  service: { id: number; totalAmount: number; status: ServiceStatus };
}

/**
 * Adelanta una reservación al tablero (/en-progreso) en estado `waiting`.
 * Para cuando el cliente llega antes de su cita y hay cupo.
 */
export async function appointmentToBoard(
  appointmentId: number,
): Promise<AppointmentToBoardResult> {
  return strapiServerFetch<AppointmentToBoardResult>("/api/qr/appointment-to-board", {
    method: "POST",
    body: { appointmentId },
  });
}

/** waiting → in_progress: un empleado toma el auto. */
export async function startService(
  serviceId: number,
  performedByAdminId?: number,
): Promise<{ service: { id: number; status: ServiceStatus } }> {
  return strapiServerFetch("/api/qr/start-service", {
    method: "POST",
    body: { serviceId, ...(performedByAdminId ? { performedByAdminId } : {}) },
  });
}

/** in_progress → to_pay: el empleado termina el lavado. */
export async function finishService(
  serviceId: number,
): Promise<{ service: { id: number; status: ServiceStatus } }> {
  return strapiServerFetch("/api/qr/finish-service", {
    method: "POST",
    body: { serviceId },
  });
}

export interface ChargeServiceResult {
  service: {
    id: number;
    status: ServiceStatus;
    subtotalAmount: number;
    promotionDiscount: number;
    manualDiscount: number;
    totalAmount: number;
    promotionTitle: string | null;
  };
  promotionGenerated: Promotion | null;
  loyaltyProgress: LoyaltyProgress | null;
}

/** Una promo aplicable a un servicio concreto, con el descuento ya calculado. */
export interface ApplicablePromotion {
  id: number;
  code: string;
  title: string;
  description: string | null;
  kind: "personal" | "campaign";
  appliesTo: "all" | "package" | "extras";
  discountType: "percent" | "fixed" | "free";
  discountValue: number;
  discountLabel: string;
  /** Pesos que descontaría en ESTE ticket. */
  discountAmount: number;
}

export interface AvailablePromotionsResult {
  service: { id: number; packagePrice: number; extrasPrice: number; subtotal: number };
  promotions: ApplicablePromotion[];
  /** El descuento manual es exclusivo del super admin. */
  canApplyManualDiscount: boolean;
}

export async function availablePromotions(serviceId: number): Promise<AvailablePromotionsResult> {
  return strapiServerFetch<AvailablePromotionsResult>("/api/qr/available-promotions", {
    query: { serviceId },
    cache: "no-store",
  });
}

export interface ChargeServicePayload {
  serviceId: number;
  promotionId?: number | null;
  manualDiscount?: number;
  discountNote?: string;
}

/** to_pay → completed: la caja cobra al cliente y se dispara la fidelidad. */
export async function chargeService(payload: ChargeServicePayload): Promise<ChargeServiceResult> {
  return strapiServerFetch<ChargeServiceResult>("/api/qr/charge-service", {
    method: "POST",
    body: payload,
  });
}

/** Cualquier estado activo → cancelled. No dispara fidelidad. */
export async function cancelService(
  serviceId: number,
  reason?: string,
): Promise<{ service: { id: number; status: ServiceStatus } }> {
  return strapiServerFetch("/api/qr/cancel-service", {
    method: "POST",
    body: { serviceId, ...(reason ? { reason } : {}) },
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
  service: { id: number; totalAmount: number; status: ServiceStatus };
}

export async function walkInService(payload: WalkInServicePayload): Promise<WalkInServiceResult> {
  return strapiServerFetch<WalkInServiceResult>("/api/qr/walk-in-service", {
    method: "POST",
    body: payload,
  });
}
