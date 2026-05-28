import { Card, CardContent } from "@/components/ui/card";
import { listInProgressServices } from "@/lib/strapi/qr";
import { InProgressList } from "@/components/admin/in-progress-list";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Servicios en progreso" };

export default async function EnProgresoPage() {
  const services = await listInProgressServices().catch(() => []);
  const total = services.reduce((acc, s) => acc + Number(s.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Servicios en progreso</h1>
        <p className="text-muted-foreground">
          Servicios iniciados que aún no se han completado. Marca cada uno como completado
          cuando termines — solo entonces se registra la visita y se suma a fidelidad.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">En progreso</p>
            <p className="mt-1 text-2xl font-bold">{services.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total estimado</p>
            <p className="mt-1 text-2xl font-bold">{formatPrice(total)}</p>
          </CardContent>
        </Card>
      </div>

      <InProgressList services={services} />
    </div>
  );
}
