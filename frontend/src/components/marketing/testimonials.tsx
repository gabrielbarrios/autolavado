import Image from "next/image";
import { Quote, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { strapiMediaUrl } from "@/lib/utils";
import type { Testimonial } from "@/types/models";

const FALLBACK: Testimonial[] = [
  { id: 1, name: "María González", role: "Cliente desde 2024", message: "El mejor servicio que he probado. El programa de fidelidad realmente vale la pena.", rating: 5 },
  { id: 2, name: "Luis Hernández", role: "Cliente premium", message: "Reservar desde el celular es increíble. Llego, escanean mi QR y listo.", rating: 5 },
  { id: 3, name: "Andrea Ruiz", role: "Cliente VIP", message: "El detallado dejó mi auto como nuevo. 100% recomendado.", rating: 5 },
];

export function Testimonials({ items }: { items?: Testimonial[] }) {
  const list = items?.length ? items : FALLBACK;
  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Clientes que confían en nosotros
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {list.map((t) => (
          <Card key={t.id} className="border-border/60 bg-card/50">
            <CardContent className="p-6">
              <Quote className="mb-4 h-6 w-6 text-primary/60" />
              <p className="text-sm leading-relaxed text-foreground/90">"{t.message}"</p>
              <div className="mt-6 flex items-center gap-3">
                {t.avatar ? (
                  <Image
                    src={strapiMediaUrl(t.avatar, "thumbnail") ?? ""}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    {t.name.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                </div>
                {t.rating ? (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
