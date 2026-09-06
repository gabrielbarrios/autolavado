import { Card, CardContent } from "@/components/ui/card";
import { listActiveSnacks, listActiveSnackCategories } from "@/lib/strapi/snacks";
import { SNACK_NO_PRICE_LABEL } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { Snack } from "@/types/models";

export const metadata = { title: "Snacks" };

/**
 * La lista de precios del mostrador, tal cual. Es pública y sin sesión: sirve
 * para que el cliente decida mientras espera su auto, así que no hay carrito ni
 * botón de compra — se paga en caja.
 *
 * Se agrupa por categoría en el orden que dejó el dueño. Los snacks sin
 * categoría van al final bajo "Otros": nunca se esconden por no estar
 * clasificados.
 */
export default async function SnacksPage() {
  const [snacks, categories] = await Promise.all([
    listActiveSnacks().catch(() => []),
    listActiveSnackCategories().catch(() => []),
  ]);

  const groups: { key: string; title: string | null; items: Snack[] }[] = [
    ...categories.map((category) => ({
      key: String(category.id),
      title: category.name,
      items: snacks.filter((s) => s.category?.id === category.id),
    })),
    {
      key: "otros",
      title: categories.length > 0 ? "Otros" : null,
      items: snacks.filter(
        (s) => !s.category || !categories.some((c) => c.id === s.category?.id),
      ),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Snacks</h1>
        <p className="mt-4 text-muted-foreground">
          Bebidas y botanas mientras esperas tu auto. Pregunta por ellos en el mostrador.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Por el momento no hay snacks disponibles. Vuelve pronto.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              {group.title && (
                <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>
              )}
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/40">
                    {group.items.map((snack) => (
                      <li key={snack.id} className="flex items-baseline gap-4 px-5 py-4">
                        <span className="min-w-0 flex-1 font-medium">{snack.name}</span>
                        {/* Línea punteada: la lista se lee de un vistazo desde la fila. */}
                        <span
                          aria-hidden
                          className="hidden flex-1 border-b border-dashed border-border/60 sm:block"
                        />
                        {snack.price == null ? (
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {SNACK_NO_PRICE_LABEL}
                          </span>
                        ) : (
                          <span className="shrink-0 font-mono text-lg font-semibold">
                            {formatPrice(snack.price)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
