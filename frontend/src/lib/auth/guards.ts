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
  if (session.role !== "admin") redirect("/perfil");
  return session;
}

export async function requireGuest(redirectTo = "/perfil") {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/dashboard" : redirectTo);
}
