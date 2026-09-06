import { requireAdmin } from "@/lib/auth/guards";
import { listAllSnacks, listAllSnackCategories } from "@/lib/strapi/snacks";
import { SnackList } from "@/components/admin/snack-list";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Snacks" };

export default async function SnacksAdminPage() {
  // Pantalla de administración: el empleado se queda en su dashboard.
  await requireAdmin();
  const [snacks, categories] = await Promise.all([
    listAllSnacks().catch(() => []),
    listAllSnackCategories().catch(() => []),
  ]);
  const active = snacks.filter((s) => s.active !== false);
  // Los snacks sin precio no cuentan para el rango: no valen cero, no tienen.
  const prices = active.map((s) => s.price).filter((p): p is number => p != null);
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;
  // Con un solo precio (o todos iguales) "de $45 a $45" sobra.
  const range =
    prices.length === 0
      ? ""
      : min === max
        ? ` · ${formatPrice(min)}`
        : ` · de ${formatPrice(min)} a ${formatPrice(max)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Snacks</h1>
        <p className="text-muted-foreground">
          {`Lo que se vende en el mostrador mientras el cliente espera. ${active.length} a la venta${range}.`}
        </p>
      </div>

      <SnackList snacks={snacks} categories={categories} />
    </div>
  );
}
