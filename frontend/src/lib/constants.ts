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
 * Lo que se muestra en lugar del precio de un snack cuando no tiene: el precio
 * es opcional y sin él se pregunta en caja. Está aquí y no en lib/strapi/snacks
 * porque lo pinta también el panel, que es un componente cliente.
 */
export const SNACK_NO_PRICE_LABEL = "Consultar";

/**
 * Las únicas pantallas del panel a las que entra un empleado: la operación del
 * día. Todo lo demás (catálogo, promociones, clientes, snacks) es de admin y lo
 * bloquea `requireAdmin()` en cada página.
 *
 * Esta lista la usan el menú lateral (AdminShell) y `isEmployeeRoute()`. Su
 * espejo en el backend son los `EMPLOYEE_PERMISSIONS` de backend/src/index.ts:
 * si aquí se agrega una pantalla, allá hay que agregar sus permisos.
 */
export const EMPLOYEE_ROUTES = [
  "/dashboard",
  "/escanear",
  "/walk-in",
  "/en-progreso",
  "/reservaciones",
] as const;

/**
 * Interruptor de la tienda online (productos, carrito y pedidos). Con `false`
 * desaparece de todos los menús y sus rutas devuelven 404, pero el código sigue
 * ahí: para reactivarla basta con ponerlo en `true`.
 */
export const STORE_ENABLED = false;
