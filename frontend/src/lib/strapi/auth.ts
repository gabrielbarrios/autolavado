import "server-only";
import { strapiFetch } from "./client";
import { strapiServerFetch } from "./server";
import type { User } from "@/types/models";

export interface AuthResponse {
  jwt: string;
  user: User;
}

export async function strapiLogin(identifier: string, password: string): Promise<AuthResponse> {
  return strapiFetch<AuthResponse>("/api/auth/local", {
    method: "POST",
    body: { identifier, password },
  });
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export async function strapiRegister(payload: RegisterPayload): Promise<AuthResponse> {
  return strapiFetch<AuthResponse>("/api/auth/local/register", {
    method: "POST",
    body: payload,
  });
}

export async function strapiForgotPassword(email: string): Promise<{ ok: true }> {
  return strapiFetch<{ ok: true }>("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function strapiResetPassword(payload: {
  code: string;
  password: string;
  passwordConfirmation: string;
}) {
  return strapiFetch("/api/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export async function strapiMe(): Promise<User | null> {
  try {
    return await strapiServerFetch<User>("/api/users/me?populate[role]=true&populate[avatar]=true", {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
