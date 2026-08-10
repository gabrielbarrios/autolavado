import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { listMyServices, loadMyActiveServices } from "@/lib/strapi/visits";
import { listMyAppointments } from "@/lib/strapi/appointments";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Historial" };

const statusVariant = {
  pending: "warning",
  approved: "info",
  cancelled: "destructive",
  completed: "success",
} as const;

const statusLabel = {
  pending: "Pendiente",
  approved: "Aprobada",
  cancelled: "Cancelada",
  completed: "Completada",
} as const;

export default async function HistorialPage() {
  const { user } = await requireUser();
  const [services, appointments, active] = await Promise.all([
    listMyServices().catch(() => []),
    listMyAppointments(user.id).catch(() => []),
    loadMyActiveServices(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
        <p className="text-muted-foreground">Tus servicios completados y tus próximas reservaciones.</p>
      </div>

      {/* Los lavados en curso no salen en la tabla de abajo (solo lista los
          `completed`), así que se enlazan acá para que no queden invisibles. */}
      {active.services.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm">
                <span className="font-semibold">
                  {active.services.length === 1
                    ? "Tienes un lavado en curso"
                    : `Tienes ${active.services.length} lavados en curso`}
                </span>{" "}
                <span className="text-muted-foreground">— todavía no aparece aquí abajo.</span>
              </p>
            </div>
            <Link
              href="/mi-auto"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver estado <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Servicios completados</h2>
        {services.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Aún no tienes servicios registrados.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Desktop: tabla */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Paquete</th>
                      <th className="px-4 py-3 font-medium">Auto</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {services.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3">{formatDate(s.date)}</td>
                        <td className="px-4 py-3 font-medium">{s.package?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatPrice(s.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="divide-y divide-border/40 md:hidden">
                {services.map((s) => (
                  <div key={s.id} className="space-y-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate font-medium">{s.package?.name ?? "—"}</p>
                      <p className="shrink-0 font-mono font-semibold">{formatPrice(s.totalAmount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(s.date)}</p>
                    {s.vehicle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {s.vehicle.brand} {s.vehicle.model}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reservaciones</h2>
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No tienes reservaciones aún.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {appointments.map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{a.package?.name ?? "Paquete"}</p>
                    <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.date)} · {a.timeSlot}
                  </p>
                  {a.vehicle && (
                    <p className="text-xs text-muted-foreground">
                      {a.vehicle.brand} {a.vehicle.model} · {a.vehicle.plate}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
