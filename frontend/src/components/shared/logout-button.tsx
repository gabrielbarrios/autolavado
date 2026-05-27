"use client";

import { logoutAction } from "@/actions/auth";

export function useLogout() {
  return async () => {
    await logoutAction();
  };
}
