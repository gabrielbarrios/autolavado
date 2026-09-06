"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { strapiLogin, strapiRegister, strapiForgotPassword } from "@/lib/strapi/auth";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/cookies";
import { loginSchema, registerSchema, forgotSchema } from "@/lib/validations/auth";
import { StrapiError } from "@/lib/strapi/client";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> };

/**
 * A dónde mandar a alguien recién autenticado: "admin" = panel, "cliente" =
 * perfil. Empleados y super admins también van al panel. Se mira `type` antes
 * que `name` porque el nombre del rol es texto libre del panel de Strapi.
 */
function landingRole(user: { role?: string | { name?: string; type?: string } }): string {
  const role = user.role;
  const type = (typeof role === "string" ? role : role?.type ?? "").toLowerCase();
  const name = (typeof role === "string" ? role : role?.name ?? "").toLowerCase();
  const isStaff =
    ["admin", "superadmin", "employee"].includes(type) ||
    name.includes("admin") ||
    name.includes("emplead");
  return isStaff ? "admin" : "cliente";
}

function zodToFields(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".");
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ role: string }>> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos", fields: zodToFields(parsed.error) };

  try {
    const { jwt, user } = await strapiLogin(parsed.data.identifier, parsed.data.password);
    await setSessionCookie(jwt);
    return { ok: true, data: { role: landingRole(user) } };
  } catch (err) {
    const msg = err instanceof StrapiError ? err.message : "No se pudo iniciar sesión";
    return { ok: false, error: msg };
  }
}

export async function registerAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ role: string }>> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos", fields: zodToFields(parsed.error) };

  try {
    const { jwt, user } = await strapiRegister({
      username: parsed.data.email,
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      phone: parsed.data.phone || undefined,
    });
    await setSessionCookie(jwt);
    return { ok: true, data: { role: landingRole(user) } };
  } catch (err) {
    const msg = err instanceof StrapiError ? err.message : "No se pudo crear la cuenta";
    return { ok: false, error: msg };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function forgotAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "Correo inválido" };
  try {
    await strapiForgotPassword(parsed.data.email);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar el correo" };
  }
}
