import "server-only";
import { redirect } from "next/navigation";
import { getSession, isStaffRole, type Session } from "./session";

export async function requireUser(redirectTo = "/login"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}

/**
 * Cualquiera que atienda el negocio: empleado, admin o super admin. Es el
 * portero del grupo de rutas `(admin)` — a qué páginas de dentro llega cada uno
 * lo deciden `requireAdmin` / `requireSuperAdmin` en la página misma.
 */
export async function requireStaff(redirectTo = "/login"): Promise<Session> {
  const session = await requireUser(redirectTo);
  if (!isStaffRole(session.role)) redirect("/perfil");
  return session;
}

export async function requireAdmin(redirectTo = "/login"): Promise<Session> {
  const session = await requireUser(redirectTo);
  // El super admin es un superconjunto del admin: también accede al panel.
  if (session.role !== "admin" && session.role !== "superadmin") {
    // El empleado sí tiene panel, solo que esta pantalla no es suya.
    redirect(session.role === "employee" ? "/dashboard" : "/perfil");
  }
  return session;
}

export async function requireSuperAdmin(redirectTo = "/login"): Promise<Session> {
  const session = await requireUser(redirectTo);
  if (session.role !== "superadmin") redirect("/dashboard");
  return session;
}

export async function requireGuest(redirectTo = "/perfil") {
  const session = await getSession();
  if (session) {
    redirect(isStaffRole(session.role) ? "/dashboard" : redirectTo);
  }
}
