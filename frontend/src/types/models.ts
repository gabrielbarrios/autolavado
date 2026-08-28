import type { StrapiMedia } from "./strapi";

export type UserRole = "admin" | "superadmin" | "vip" | "cliente";

export interface User {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  name?: string;
  phone?: string | null;
  role: UserRole | { name?: string; type?: string };
  qrToken: string;
  visitCount?: number;
  avatar?: StrapiMedia | null;
  confirmed?: boolean;
  blocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Slug de un tipo de auto. Dejó de ser un enum cerrado: la lista vive en la
 * colección "Tipo de auto" de Strapi (api::vehicle-type) y el dueño la
 * crea/edita/borra desde el Content Manager. Lo que se guarda en autos,
 * servicios y filas de precio sigue siendo este slug.
 */
export type VehicleType = string;

/** Una entrada del catálogo de tipos de auto. */
export interface VehicleTypeDef {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  order?: number;
  active?: boolean;
}

/** Tier de precio: tipos de auto + alias "uber_taxi". Sólo se usa dentro del componente `pricing`. */
export type PricingTier = VehicleType | "uber_taxi";

export interface Vehicle {
  id: number;
  documentId?: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  notes?: string | null;
  vehicleType?: VehicleType;
  isUberTaxi?: boolean;
  photo?: StrapiMedia | null;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleTypePrice {
  id: number;
  vehicleType: PricingTier;
  price: number;
  /** Precio especial Uber/Taxi para este tipo de auto. Si está vacío, se usa `price`. */
  uberTaxiPrice?: number | null;
  /**
   * Precio especial para clientes VIP. Gana sobre `uberTaxiPrice`.
   * El backend sólo lo envía a admins, empleados y clientes VIP: para el resto
   * llega `undefined`, así que nunca se puede filtrar en el front.
   */
  vipPrice?: number | null;
}

export interface ExtraService {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string | null;
  /** @deprecated usar `pricing` por tipo de auto. Sólo se conserva como fallback legacy. */
  price?: number | null;
  /**
   * Precios por tipo de auto + tier "uber_taxi" opcional. Requerido al menos uno
   * para que el extra tenga precio.
   */
  pricing?: VehicleTypePrice[];
  /** @deprecated usar pricing con vehicleType="uber_taxi". Solo legacy/migración. */
  uberTaxiPrice?: number | null;
  estimatedDuration?: number | null;
  image?: StrapiMedia | null;
  featured?: boolean;
  order?: number;
  active?: boolean;
}

export interface Package {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  durationMinutes: number;
  description?: string | null;
  benefits?: string[];
  featured?: boolean;
  order?: number;
  image?: StrapiMedia | null;
  /**
   * Precios por tipo de auto + tier "uber_taxi" opcional. Requerido al menos uno para
   * que el paquete tenga precio.
   */
  pricing?: VehicleTypePrice[];
  /** @deprecated usar pricing con vehicleType="uber_taxi". Solo legacy/migración. */
  uberTaxiPrice?: number | null;
}

export type ServiceStatus =
  | "waiting"
  | "in_progress"
  | "to_pay"
  | "completed"
  | "cancelled";

export interface Service {
  id: number;
  documentId?: string;
  date: string;
  /** Hora en que un empleado tomó el auto (waiting → in_progress). */
  startedAt?: string | null;
  /** Hora en que el empleado terminó el lavado (in_progress → to_pay). */
  finishedAt?: string | null;
  notes?: string | null;
  /** Lo realmente cobrado (ya con descuentos aplicados). */
  totalAmount: number;
  /** Precio antes de descuentos. Solo se llena al cobrar. */
  subtotalAmount?: number | null;
  promotionDiscount?: number | null;
  manualDiscount?: number | null;
  discountNote?: string | null;
  promotion?: Promotion | null;
  user?: User;
  /** Admin que realizó/completó el servicio (para historial y supervisión). */
  performedBy?: User | null;
  vehicle?: Vehicle;
  package?: Package;
  extraServices?: ExtraService[];
  /** Reservación de origen, si el service se adelantó al tablero desde /reservaciones. */
  appointment?: Appointment | null;
  isWalkIn?: boolean;
  customerName?: string | null;
  vehicleType?: VehicleType;
  isUberTaxi?: boolean;
  status?: ServiceStatus;
}

export interface Visit {
  id: number;
  documentId?: string;
  date: string;
  notes?: string | null;
  user?: User;
  vehicle?: Vehicle;
  package?: Package;
  extraServices?: ExtraService[];
}

export type DiscountType = "percent" | "fixed" | "free";

/** `personal` = recompensa de fidelidad de un cliente. `campaign` = oferta del negocio. */
export type PromotionKind = "personal" | "campaign";

/** Cuándo está disponible una promoción. */
export type PromotionAvailability = "always" | "weekdays" | "dateRange";

/** Sobre qué parte del ticket pega el descuento. */
export type PromotionAppliesTo = "all" | "package" | "extras";

export interface Promotion {
  id: number;
  documentId?: string;
  code: string;
  title: string;
  description?: string | null;
  kind?: PromotionKind;
  availability?: PromotionAvailability;
  /** Días de la semana (0 = domingo). Solo cuando availability = "weekdays". */
  weekdays?: number[] | null;
  appliesTo?: PromotionAppliesTo;
  active?: boolean;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  used: boolean;
  usedAt?: string | null;
  user?: User;
  /** Solo lo devuelve /promotions/available: "20%", "-$50", "Gratis". */
  discountLabel?: string;
}

/**
 * Campaña tal como la devuelve `/api/promotions/campaigns` (público): sin
 * `code`, sin dueño y solo las vigentes hoy. Ver el controller de promotion.
 */
export interface PublicCampaign {
  id: number;
  title: string;
  description?: string | null;
  kind?: PromotionKind;
  appliesTo?: PromotionAppliesTo;
  availability?: PromotionAvailability;
  weekdays?: number[] | null;
  discountType: DiscountType;
  discountValue: number;
  validFrom?: string | null;
  validUntil?: string | null;
  discountLabel?: string;
}

export interface LoyaltyProgress {
  id: number;
  documentId?: string;
  currentCount: number;
  cycleStartedAt: string;
  user?: User;
}

export type AppointmentStatus = "pending" | "approved" | "cancelled" | "completed";

export interface Appointment {
  id: number;
  documentId?: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  customerNotes?: string | null;
  adminNotes?: string | null;
  user?: User;
  vehicle?: Vehicle;
  package?: Package;
  extraServices?: ExtraService[];
}

export type ProductCategory = "limpieza" | "interior" | "exterior" | "accesorios" | "otros";

export interface Product {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  description?: string | null;
  category: ProductCategory;
  active: boolean;
  images?: StrapiMedia[];
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: number;
  documentId?: string;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface Order {
  id: number;
  documentId?: string;
  status: OrderStatus;
  total: number;
  customerNotes?: string | null;
  createdAt: string;
  user?: User;
  items?: OrderItem[];
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role?: string | null;
  message: string;
  rating?: number;
  avatar?: StrapiMedia | null;
}

export interface ContactInfo {
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  mapUrl?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export type WeekDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface BusinessHour {
  id: number;
  day: WeekDay;
  open?: string | null;
  close?: string | null;
  closed?: boolean;
}

export interface ClosedDate {
  id: number;
  date: string;
  reason?: string | null;
}

export interface SiteSetting {
  id: number;
  documentId?: string;
  businessName?: string;
  tagline?: string;
  description?: string;
  logo?: StrapiMedia | null;
  heroVideo?: StrapiMedia | null;
  heroImage?: StrapiMedia | null;
  gallery?: StrapiMedia[];
  bookingSlotDuration?: number;
  maxBookingsPerSlot?: number;
  visitsForReward?: number;
  businessHours?: BusinessHour[];
  closedDates?: ClosedDate[];
  faqs?: Faq[];
  testimonials?: Testimonial[];
  contactInfo?: ContactInfo;
}
