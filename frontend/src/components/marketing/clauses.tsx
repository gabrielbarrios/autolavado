import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CLAUSES, clausesTitle } from "@/lib/clauses";

/**
 * Aviso de cláusulas. En el home va como sección (`variant="section"`, con
 * título y enlace a la página completa); en /clausulas se reusa la misma lista
 * sin envoltorio para que ambos textos no puedan separarse.
 */
export function Clauses({
  businessName,
  variant = "section",
}: {
  businessName?: string | null;
  variant?: "section" | "page";
}) {
  const list = (
    <ol className="space-y-3">
      {CLAUSES.map((text, i) => (
        <li key={text} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-500">
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed text-foreground/90">{text}</span>
        </li>
      ))}
    </ol>
  );

  if (variant === "page") return list;

  return (
    <section className="container mx-auto max-w-3xl px-4 py-20">
      <div className="mb-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-7 w-7 text-amber-500" />
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {clausesTitle(businessName)}
        </h2>
        <p className="mt-3 text-muted-foreground">
          Al dejar tu auto con nosotros aceptas estas condiciones.
        </p>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="p-6 sm:p-8">{list}</CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/clausulas" className="font-medium text-primary hover:underline">
          Ver las cláusulas completas
        </Link>
      </p>
    </section>
  );
}
