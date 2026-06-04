import type { StrapiMedia } from "./strapi";

export type UserRole = "admin" | "superadmin" | "cliente";

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

export type VehicleType = "chico" | "sedan" | "suv" | "camioneta_grande" | "combi";

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

export type ServiceStatus = "in_progress" | "completed";

export interface Service {
  id: number;
  documentId?: string;
  date: string;
  notes?: string | null;
  totalAmount: number;
  user?: User;
  /** Admin que realizó/completó el servicio (para historial y supervisión). */
  performedBy?: User | null;
  vehicle?: Vehicle;
  package?: Package;
  extraServices?: ExtraService[];
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

export interface Promotion {
  id: number;
  documentId?: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  used: boolean;
  usedAt?: string | null;
  user?: User;
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
