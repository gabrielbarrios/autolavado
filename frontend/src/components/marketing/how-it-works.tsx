import { UserPlus, CalendarCheck, Sparkles } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta",
    description: "Regístrate, agrega tus autos y obtén tu QR personal en menos de un minuto.",
  },
  {
    icon: CalendarCheck,
    title: "Reserva tu paquete",
    description: "Elige paquete, vehículo y horario. Confirmamos automáticamente.",
  },
  {
    icon: Sparkles,
    title: "Disfruta y acumula",
    description: "Cada visita suma. A las 3, una promoción aparece en tu cuenta.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border/40 bg-card/30">
      <div className="container mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Tres pasos. Cero complicaciones.
          </h2>
        </div>
        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/10 ring-1 ring-primary/20">
                  <s.icon className="h-7 w-7 text-primary" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
                <p className="max-w-xs text-sm text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
