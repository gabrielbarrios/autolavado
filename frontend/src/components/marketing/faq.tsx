"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Faq } from "@/types/models";

const FALLBACK: Faq[] = [
  { id: 1, question: "¿Necesito agendar cita?", answer: "Recomendamos agendar para garantizar horario, pero también recibimos clientes sin cita según disponibilidad." },
  { id: 2, question: "¿Cómo funcionan las promociones?", answer: "Cada 3 visitas confirmadas, el sistema genera automáticamente una promoción aplicable a tu próximo servicio." },
  { id: 3, question: "¿Puedo registrar varios autos?", answer: "Sí, desde tu panel puedes registrar todos los autos que quieras y elegirlos al reservar." },
  { id: 4, question: "¿Qué pasa con mi QR?", answer: "Tu QR es único e intransferible. El personal lo escanea para registrar visitas y aplicar promociones." },
  { id: 5, question: "¿Aceptan pagos en línea?", answer: "Por el momento el pago se realiza en sucursal. Pronto integraremos pagos en línea." },
];

export function FAQ({ faqs }: { faqs?: Faq[] }) {
  const list = faqs?.length ? faqs : FALLBACK;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="container mx-auto max-w-3xl px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
      </div>
      <div className="space-y-3">
        {list.map((f) => {
          const isOpen = open === f.id;
          return (
            <div key={f.id} className="rounded-xl border border-border/60 bg-card/50">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold sm:text-base">{f.question}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && <div className="px-5 pb-5 text-sm text-muted-foreground">{f.answer}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
