import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "../constants";
import { strapiMe } from "../strapi/auth";
import type { User, UserRole } from "@/types/models";

export interface Session {
  user: User;
  role: UserRole;
}

function resolveRole(user: User): UserRole {
  if (typeof user.role === "string") return user.role;
  const type = user.role?.type?.toLowerCase() ?? "";
  const name = user.role?.name?.toLowerCase() ?? "";
  if (type === "superadmin" || name.includes("super")) return "superadmin";
  if (type === "admin" || name.includes("admin")) return "admin";
  if (type === "vip" || name === "vip") return "vip";
  return "cliente";
}

/** El VIP es un cliente con tarifa especial: mismo acceso, distinto precio. */
export function isVipRole(role: UserRole | null | undefined): boolean {
  return role === "vip";
}

/** ¿Este rol puede VER el precio VIP? Admins, empleados y los propios VIP. */
export function canSeeVipPrice(role: UserRole | null | undefined): boolean {
  return role === "vip" || role === "admin" || role === "superadmin";
}

/**
 * Sesión actual (cacheada por request). Devuelve null si no hay cookie o el JWT es inválido.
 * Hace fetch a Strapi /users/me para confirmar la identidad — Strapi es la fuente de verdad.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const user = await strapiMe();
  if (!user) return null;

  return { user, role: resolveRole(user) };
});

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(SESSION_COOKIE_NAME)?.value);
}
