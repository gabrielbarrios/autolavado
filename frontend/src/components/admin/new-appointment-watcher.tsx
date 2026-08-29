"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatTime } from "@/lib/business-hours";

interface FreshAppointment {
  id: number;
  date: string;
  timeSlot: string;
  customer: string | null;
  vehicle: string | null;
  packageName: string | null;
}

/** Cada 10 minutos. */
const POLL_MS = 10 * 60 * 1000;

/**
 * Avisa al personal cuando entra una reservación mientras el panel está
 * abierto. Vive en el layout del admin, así que sigue corriendo al navegar
 * entre sus páginas (tablero, walk-in, clientes…) sin reiniciar el contador.
 *
 * La primera consulta solo fija la línea base: se avisa de lo que llegue
 * DESPUÉS de abrir el panel, nunca de lo que ya estaba pendiente.
 */
export function NewAppointmentWatcher() {
  const router = useRouter();
  const [fresh, setFresh] = React.useState<FreshAppointment[]>([]);
  // En una ref y no en estado: cambiarlo no tiene por qué repintar nada, y el
  // intervalo necesita leer siempre el último valor.
  const sinceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const qs = sinceRef.current === null ? "" : `?since=${sinceRef.current}`;
        const res = await fetch(`/api/admin/appointments${qs}`, { cache: "no-store" });
        if (!res.ok) return; // sesión caída o permisos: se reintenta al siguiente ciclo
        const data = (await res.json()) as { latestId: number; new: FreshAppointment[] };
        if (cancelled) return;

        sinceRef.current = Math.max(data.latestId ?? 0, sinceRef.current ?? 0);
        if (data.new?.length > 0) {
          setFresh(data.new);
          // Las pantallas del panel (tablero, reservaciones) se refrescan solas
          // para que el aviso y lo que se ve en la tabla coincidan.
          router.refresh();
        }
      } catch {
        // Sin red: se vuelve a intentar en el siguiente ciclo.
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  const count = fresh.length;

  return (
    <Dialog open={count > 0} onOpenChange={(open) => !open && setFresh([])}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {count === 1 ? "Llegó una nueva reservación" : `Llegaron ${count} reservaciones nuevas`}
          </DialogTitle>
          <DialogDescription>
            {count === 1 ? "Entró mientras trabajabas." : "Entraron mientras trabajabas."} Revísalas
            para aprobarlas o cancelarlas.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {fresh.map((a) => (
            <li key={a.id} className="rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
              <p className="font-medium">
                {formatDate(a.date)} · {formatTime(a.timeSlot)}
              </p>
              <p className="text-xs text-muted-foreground">
                {[a.customer, a.vehicle, a.packageName].filter(Boolean).join(" · ") ||
                  "Sin detalles"}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button asChild onClick={() => setFresh([])}>
            <Link href="/reservaciones?status=pending">Ver reservaciones</Link>
          </Button>
          <Button variant="outline" onClick={() => setFresh([])}>
            Después
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
