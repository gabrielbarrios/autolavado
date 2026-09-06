import { Card, CardContent } from "@/components/ui/card";
import { listActiveSnacks } from "@/lib/strapi/snacks";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Snacks" };

/**
 * La lista de precios del mostrador, tal cual. Es pública y sin sesión: sirve
 * para que el cliente decida mientras espera su auto, así que no hay carrito ni
 * botón de compra — se paga en caja.
 */
export default async function SnacksPage() {
  const snacks = await listActiveSnacks().catch(() => []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Snacks</h1>
        <p className="mt-4 text-muted-foreground">
          Bebidas y botanas mientras esperas tu auto. Pregunta por ellos en el mostrador.
        </p>
      </div>

      {snacks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Por el momento no hay snacks disponibles. Vuelve pronto.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/40">
              {snacks.map((snack) => (
                <li key={snack.id} className="flex items-baseline gap-4 px-5 py-4">
                  <span className="min-w-0 flex-1 font-medium">{snack.name}</span>
                  {/* Línea punteada: la lista se lee de un vistazo desde la fila. */}
                  <span aria-hidden className="hidden flex-1 border-b border-dashed border-border/60 sm:block" />
                  <span className="shrink-0 font-mono text-lg font-semibold">
                    {formatPrice(snack.price)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
