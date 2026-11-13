"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Every 10 minutes, same cadence as NewAppointmentWatcher. */
const POLL_MS = 10 * 60 * 1000;
const CHANGED_EVENT = "appointments:changed";

/**
 * Call after approving/cancelling/rescheduling an appointment so the badge
 * re-counts right away instead of waiting for the next poll.
 */
export function notifyAppointmentsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

/**
 * Red round counter in the top bar with the number of pending appointments.
 * Renders nothing while there are none. Staff only: the endpoint answers 403
 * to a customer, which leaves the count at 0.
 */
export function PendingAppointmentsBadge() {
  const pathname = usePathname();
  const [count, setCount] = React.useState(0);

  // Keyed on pathname: every navigation re-counts (and restarts the timer),
  // so the badge follows what the staff just did on another screen.
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/appointments", { cache: "no-store" });
        if (!res.ok) return; // session/permission problem: keep the last value
        const data = (await res.json()) as { pendingCount?: number };
        if (!cancelled) setCount(data.pendingCount ?? 0);
      } catch {
        // Offline: retry on the next cycle.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    const id = setInterval(load, POLL_MS);
    window.addEventListener(CHANGED_EVENT, load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(CHANGED_EVENT, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  if (count <= 0) return null;

  const label =
    count === 1 ? "1 reservación pendiente" : `${count} reservaciones pendientes`;

  return (
    <Link
      href="/reservaciones?status=pending"
      aria-label={label}
      title={label}
      className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-red-600 px-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {count > 99 ? "99+" : count}
    </Link>
  );
}
