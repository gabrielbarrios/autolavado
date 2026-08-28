export const STRAPI_API_URL =
  process.env.STRAPI_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";

export const PUBLIC_STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "autolavado_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

export const APPOINTMENT_STATUSES = ["pending", "approved", "cancelled", "completed"] as const;
export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export const PRODUCT_CATEGORIES = ["limpieza", "interior", "exterior", "accesorios", "otros"] as const;
export const DISCOUNT_TYPES = ["percent", "fixed", "free"] as const;

export const VISITS_FOR_REWARD = 3;

/**
 * Interruptor de la tienda online (productos, carrito y pedidos). Con `false`
 * desaparece de todos los menús y sus rutas devuelven 404, pero el código sigue
 * ahí: para reactivarla basta con ponerlo en `true`.
 */
export const STORE_ENABLED = false;
