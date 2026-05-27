import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strapiMediaUrl } from "@/lib/utils";
import type { SiteSetting } from "@/types/models";

export function Hero({ setting }: { setting?: SiteSetting | null }) {
  const businessName = setting?.businessName?.trim() || "Tu auto";
  const tagline = setting?.tagline?.trim() || "Tu auto, impecable. Cada visita.";
  const description =
    setting?.description?.trim() ||
    "Reserva en segundos, registra tus autos, acumula visitas y recibe promociones automáticas. Una experiencia premium de autolavado, gestionada digitalmente.";
  const visitsForReward = setting?.visitsForReward ?? 3;
  const heroImage = setting?.heroImage ? strapiMediaUrl(setting.heroImage, "large") : null;
  const heroVideoUrl = setting?.heroVideo ? strapiMediaUrl(setting.heroVideo, "large") : null;

  return (
    <section className="relative overflow-hidden">
      {heroVideoUrl ? (
        <video
          src={heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          aria-hidden
        />
      ) : heroImage ? (
        <Image
          src={heroImage}
          alt={businessName}
          fill
          sizes="100vw"
          className="object-cover opacity-25"
          aria-hidden
        />
      ) : null}
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="absolute inset-0 bg-radial-fade" aria-hidden />

      <div className="container relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:pt-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Programa de fidelidad: {visitsForReward} visitas = 1 promoción gratis
          </span>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">{tagline}</h1>
          <p className="mt-6 text-balance text-lg text-muted-foreground sm:text-xl">{description}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" variant="premium">
              <Link href="/registro">
                Crear cuenta gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/paquetes">Ver paquetes</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Servicios garantizados
            </span>
            <span className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" /> 4.9 / 5 calificación promedio
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
