import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAllServices } from "@/lib/strapi/visits";
import { formatDate, formatPrice } from "@/lib/utils";
import { vehicleTypeLabel } from "@/lib/pricing";

export const metadata = { title: "Servicios" };

export default async function ServiciosPage() {
  const services = await listAllServices().catch(() => []);

  const total = services.reduce((acc, s) => acc + Number(s.totalAmount ?? 0), 0);
  const walkInCount = services.filter((s) => s.isWalkIn).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
        <p className="text-muted-foreground">Historial de visitas ejecutadas.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total servicios</p>
            <p className="mt-1 text-2xl font-bold">{services.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Walk-ins</p>
            <p className="mt-1 text-2xl font-bold">{walkInCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Ingresos</p>
            <p className="mt-1 text-2xl font-bold">{formatPrice(total)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Auto</th>
                  <th className="px-4 py-3 font-medium">Paquete</th>
                  <th className="px-4 py-3 font-medium">Extras</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Sin servicios registrados.
                    </td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">{formatDate(s.date)}</td>
                      <td className="px-4 py-3">
                        {s.isWalkIn ? (
                          <div>
                            <Badge variant="info" className="text-[10px]">Walk-in</Badge>
                            <p className="mt-0.5">{s.customerName || "Sin nombre"}</p>
                          </div>
                        ) : (
                          <p>{s.user?.name ?? s.user?.email ?? "—"}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.vehicle
                          ? `${s.vehicle.brand} ${s.vehicle.model} · ${s.vehicle.plate || "—"}`
                          : s.vehicleType
                            ? `${vehicleTypeLabel(s.vehicleType)}${s.isUberTaxi ? " · Uber/Taxi" : ""}`
                            : "—"}
                      </td>
                      <td className="px-4 py-3">{s.package?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {s.extraServices && s.extraServices.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.extraServices.map((e) => (
                              <Badge key={e.id} variant="outline" className="text-[10px]">
                                {e.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatPrice(s.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
