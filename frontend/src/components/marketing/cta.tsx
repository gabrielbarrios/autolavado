import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-blue-600/20 via-card/60 to-cyan-500/10 px-8 py-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
        <div className="relative">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Empieza a acumular beneficios desde tu primera visita
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Registro gratis. Sin compromisos. Tu QR personal queda listo de inmediato.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" variant="premium">
              <Link href="/registro">
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/paquetes">Explorar paquetes</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
