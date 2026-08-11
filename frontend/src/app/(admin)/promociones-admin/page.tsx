import { requireAdmin } from "@/lib/auth/guards";
import { listAllPromotions } from "@/lib/strapi/promotions";
import { PromotionForm } from "@/components/admin/promotion-form";
import { CampaignList, PersonalPromotionList } from "@/components/admin/promotion-list";

export const metadata = { title: "Promociones" };

export default async function PromocionesAdminPage() {
  await requireAdmin();
  const promos = await listAllPromotions().catch(() => []);

  // Las campañas las crea el negocio; las personales las genera el programa de
  // fidelidad y no se editan a mano. Se listan por separado porque se usan
  // distinto (ver backend/src/utils/promotions.ts).
  const campaigns = promos.filter((p) => p.kind === "campaign");
  const personal = promos.filter((p) => p.kind !== "campaign");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
          <p className="text-muted-foreground">
            Las campañas aparecen en la caja al cobrar y en la página del cliente.
          </p>
        </div>
        <PromotionForm />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Campañas ({campaigns.length})</h2>
        <CampaignList promos={campaigns} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Fidelidad ({personal.length})</h2>
          <p className="text-sm text-muted-foreground">
            Generadas automáticamente cada 3 visitas. Son de un solo uso y de un cliente concreto.
          </p>
        </div>
        <PersonalPromotionList promos={personal} />
      </section>
    </div>
  );
}
