"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Re-renderiza el Server Component padre cada `intervalMs` para que el cliente
 * vea avanzar el estado de su auto sin recargar la página. Se pausa cuando la
 * pestaña no está visible.
 */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
