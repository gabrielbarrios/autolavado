import { Gift, Calendar, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { listAvailablePromotions, getMyLoyaltyProgress } from "@/lib/strapi/promotions";
import { LoyaltyProgress } from "@/components/cliente/loyalty-progress";
import { discountLabel, appliesToLabel, availabilityLabel } from "@/lib/promotions";
import type { Promotion } from "@/types/models";

export const metadata = { title: "Promociones" };

export default async function PromocionesPage() {
  const { user } = await requireUser();
  const [promos, loyalty] = await Promise.all([
    listAvailablePromotions().catch(() => []),
    getMyLoyaltyProgress().catch(() => null),
  ]);

  // Las de fidelidad son suyas y de un solo uso; las campañas son del negocio.
  const personal = promos.filter((p) => p.kind !== "campaign");
  const campaigns = promos.filter((p) => p.kind === "campaign");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
        <p className="text-muted-foreground">
          Lo que puedes usar hoy. Menciónalo en caja al momento de pagar.
        </p>
      </div>

      <LoyaltyProgress current={loyalty?.currentCount ?? user.visitCount ?? 0} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tus recompensas</h2>
        {personal.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Aún no tienes recompensas. Cada 3 visitas ganas una.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {personal.map((p) => (
              <PromoCard key={p.id} promo={p} personal />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Promociones del autolavado</h2>
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No hay promociones vigentes hoy. Vuelve a revisar pronto.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campaigns.map((p) => (
              <PromoCard key={p.id} promo={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PromoCard({ promo, personal = false }: { promo: Promotion; personal?: boolean }) {
  const Icon = personal ? Gift : Megaphone;
  return (
    <Card
      className={
        personal
          ? "border-primary/30 bg-gradient-to-br from-primary/10 to-card"
          : "border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-card"
      }
    >
      <CardContent className="space-y-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <Icon className={`h-6 w-6 shrink-0 ${personal ? "text-primary" : "text-sky-400"}`} />
          <Badge variant={personal ? "default" : "info"}>{discountLabel(promo)}</Badge>
        </div>
        <div>
          <h3 className="text-base font-semibold">{promo.title}</h3>
          {promo.description && (
            <p className="text-sm text-muted-foreground">{promo.description}</p>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {availabilityLabel(promo)}
          </p>
          <p>{appliesToLabel(promo.appliesTo)}</p>
        </div>
        {personal && (
          <div className="rounded-lg bg-background/60 p-2 text-center font-mono text-xs">
            {promo.code}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
