import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { listMyServices } from "@/lib/strapi/visits";
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
  const [services, appointments] = await Promise.all([
    listMyServices(user.id).catch(() => []),
    listMyAppointments(user.id).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
        <p className="text-muted-foreground">Tus servicios completados y tus próximas reservaciones.</p>
      </div>

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
