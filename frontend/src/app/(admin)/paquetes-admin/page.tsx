import { requireAdmin } from "@/lib/auth/guards";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPackages } from "@/lib/strapi/packages";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import { packagePriceRange } from "@/lib/pricing";
import { PackageForm } from "@/components/admin/package-form";

export const metadata = { title: "Paquetes" };

export default async function PaquetesAdminPage() {
  // Pantalla de administración: el empleado se queda en su dashboard.
  await requireAdmin();
  const packages = await listPackages().catch(() => []);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paquetes</h1>
          <p className="text-muted-foreground">Los paquetes de lavado que ofrece el negocio.</p>
        </div>
        <PackageForm />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {p.image && (
              <div className="relative h-32 w-full bg-muted">
                <Image
                  src={strapiMediaUrl(p.image, "small") ?? ""}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            )}
            <CardContent className="space-y-2 p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {p.featured && <Badge variant="default">Destacado</Badge>}
              </div>
              {(() => {
                const { min, max } = packagePriceRange(p);
                if (min === 0) {
                  return <p className="text-sm text-amber-400">Sin precios configurados</p>;
                }
                return (
                  <p className="text-2xl font-bold">
                    {min === max
                      ? formatPrice(min)
                      : `${formatPrice(min)} - ${formatPrice(max)}`}
                  </p>
                );
              })()}
              <p className="text-xs text-muted-foreground">{p.durationMinutes} min</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
