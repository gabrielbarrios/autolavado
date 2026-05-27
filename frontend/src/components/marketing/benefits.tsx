import { Leaf, Clock, Gift, BadgeCheck, QrCode, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    icon: Leaf,
    title: "Lavado eco-friendly",
    description: "Productos biodegradables y técnicas que ahorran agua sin sacrificar calidad.",
  },
  {
    icon: Clock,
    title: "Rápido y eficiente",
    description: "Tu auto listo en el tiempo prometido. Conoce la duración exacta de cada paquete.",
  },
  {
    icon: Gift,
    title: "Promociones automáticas",
    description: "Cada 3 visitas obtienes una promoción aplicable a tu próximo servicio.",
  },
  {
    icon: BadgeCheck,
    title: "Técnicos certificados",
    description: "Personal capacitado en detallado y cuidado de pinturas premium.",
  },
  {
    icon: QrCode,
    title: "Identidad QR única",
    description: "Tu QR personal acelera el registro de visitas y la aplicación de promociones.",
  },
  {
    icon: Calendar,
    title: "Reservas en línea",
    description: "Elige paquete, auto y horario en segundos. Sin llamadas, sin filas.",
  },
];

export function Benefits() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Una experiencia diseñada para ti
        </h2>
        <p className="mt-4 text-muted-foreground">
          Más que un lavado: una plataforma completa para cuidar tus autos.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b) => (
          <Card key={b.title} className="border-border/60 bg-card/50 transition-colors hover:border-primary/40">
            <CardContent className="p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
