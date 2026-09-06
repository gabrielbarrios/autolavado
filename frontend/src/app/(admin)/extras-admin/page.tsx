import { requireAdmin } from "@/lib/auth/guards";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAllExtraServicesAdmin } from "@/lib/strapi/extra-services";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import { extraServicePriceRange, QUOTE_ON_REQUEST_SHORT } from "@/lib/pricing";
import { ExtraServiceForm } from "@/components/admin/extra-service-form";

export const metadata = { title: "Otros servicios" };

export default async function ExtrasAdminPage() {
  // Pantalla de administración: el empleado se queda en su dashboard.
  await requireAdmin();
  const items = await listAllExtraServicesAdmin().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Otros servicios</h1>
          <p className="text-muted-foreground">
            Servicios sueltos (encerado, lavado de asientos, lavado de cielo, etc.).
          </p>
        </div>
        <ExtraServiceForm />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Aún no hay servicios extras. Crea el primero con el botón de arriba.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <div className="relative h-32 w-full bg-muted">
                {s.image && (
                  <Image
                    src={strapiMediaUrl(s.image, "small") ?? ""}
                    alt={s.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{s.name}</h3>
                  <div className="flex shrink-0 gap-1">
                    {s.featured && <Badge variant="default">Destacado</Badge>}
                    {!s.active && <Badge variant="outline">Inactivo</Badge>}
                  </div>
                </div>
                {s.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                )}
                <div className="flex items-end justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {s.estimatedDuration ? `${s.estimatedDuration} min` : ""}
                  </span>
                  {(() => {
                    if (s.quoteOnRequest) {
                      return (
                        <span className="text-xs font-medium text-amber-400">
                          {QUOTE_ON_REQUEST_SHORT}
                        </span>
                      );
                    }
                    const { min, max } = extraServicePriceRange(s);
                    if (min === 0 && max === 0) {
                      return <span className="text-xs text-amber-400">Sin precio</span>;
                    }
                    return (
                      <span className="text-2xl font-bold">
                        {min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}
                      </span>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
