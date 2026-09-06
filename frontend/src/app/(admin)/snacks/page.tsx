import { requireAdmin } from "@/lib/auth/guards";
import { listAllSnacks } from "@/lib/strapi/snacks";
import { SnackList } from "@/components/admin/snack-list";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Snacks" };

export default async function SnacksPage() {
  // Pantalla de administración: el empleado se queda en su dashboard.
  await requireAdmin();
  const snacks = await listAllSnacks().catch(() => []);
  const active = snacks.filter((s) => s.active !== false);
  const prices = active.map((s) => Number(s.price));
  const range =
    prices.length > 0
      ? ` · de ${formatPrice(Math.min(...prices))} a ${formatPrice(Math.max(...prices))}`
      : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Snacks</h1>
        <p className="text-muted-foreground">
          {`Lo que se vende en el mostrador mientras el cliente espera. ${active.length} a la venta${range}.`}
        </p>
      </div>

      <SnackList snacks={snacks} />
    </div>
  );
}
