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
    const roleName = typeof user.role === "string" ? user.role : user.role?.name?.toLowerCase() ?? "cliente";
    const role = roleName.includes("admin") ? "admin" : "cliente";
    return { ok: true, data: { role } };
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
    const roleName = typeof user.role === "string" ? user.role : user.role?.name?.toLowerCase() ?? "cliente";
    const role = roleName.includes("admin") ? "admin" : "cliente";
    return { ok: true, data: { role } };
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
