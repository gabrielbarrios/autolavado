import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";

export async function requireUser(redirectTo = "/login"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}

export async function requireAdmin(redirectTo = "/login"): Promise<Session> {
  const session = await requireUser(redirectTo);
  // El super admin es un superconjunto del admin: también accede al panel.
  if (session.role !== "admin" && session.role !== "superadmin") redirect("/perfil");
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
    const isAdminLike = session.role === "admin" || session.role === "superadmin";
    redirect(isAdminLike ? "/dashboard" : redirectTo);
  }
}
