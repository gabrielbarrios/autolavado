import Image from "next/image";
import Link from "next/link";
import { Sparkles, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import { extraServicePriceRange } from "@/lib/pricing";
import type { ExtraService } from "@/types/models";

const FALLBACK: ExtraService[] = [
  { id: -1, name: "Encerado express líquido + lavado básico", slug: "encerado-express", price: 250, description: "Aplicación rápida de cera líquida para brillo inmediato.", featured: true, order: 1, active: true },
  { id: -2, name: "Lavado de asientos de tela", slug: "asientos-tela", price: 100, description: "Limpieza profunda de asientos de tela.", featured: true, order: 2, active: true },
  { id: -3, name: "Lavado de asientos de piel", slug: "asientos-piel", price: 200, description: "Limpieza y acondicionado de asientos de piel.", featured: true, order: 3, active: true },
  { id: -4, name: "Lavado de cielo", slug: "cielo", price: 250, description: "Limpieza del cielo / techo interior.", featured: false, order: 4, active: true },
];

export function ExtraServicesShowcase({
  services,
  showAll = false,
  limit = 3,
  title = "Otros servicios",
  subtitle = "Servicios sueltos que puedes agregar a tu visita.",
}: {
  services?: ExtraService[];
  showAll?: boolean;
  /** Cuántos mostrar cuando !showAll. Por defecto 3 para emparejar Paquetes destacados. */
  limit?: number;
  title?: string;
  subtitle?: string;
}) {
  const list = services?.length ? services : FALLBACK;
  const featured = list.filter((s) => s.featured);
  // Si no hay marcados como featured, usa el listado completo (sin ser arbitrarios con el límite).
  const pool = featured.length > 0 ? featured : list;
  const items = showAll ? list : pool.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>
        {!showAll && (
          <Button asChild variant="outline">
            <Link href="/otros-servicios">Ver todos</Link>
          </Button>
        )}
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((s) => {
          const { min, max } = extraServicePriceRange(s);
          const hasRange = min !== max && min > 0;
          return (
            <Card
              key={s.id}
              className="group flex h-full flex-col overflow-hidden border-border/60 bg-card/50 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="relative h-32 w-full shrink-0 bg-muted">
                {s.image ? (
                  <Image
                    src={strapiMediaUrl(s.image, "small") ?? ""}
                    alt={s.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                {s.featured && (
                  <Badge className="absolute right-3 top-3 z-10" variant="default">
                    Destacado
                  </Badge>
                )}
              </div>
              <CardContent className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-base font-semibold leading-tight">{s.name}</h3>
                {s.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                )}
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div>
                    {s.estimatedDuration ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {s.estimatedDuration} min
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1">
                    {hasRange && <span className="text-xs text-muted-foreground">desde</span>}
                    <span className="text-2xl font-bold tracking-tight">{formatPrice(min || Number(s.price))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
