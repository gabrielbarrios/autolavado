import { Gift, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { listMyPromotions, getMyLoyaltyProgress } from "@/lib/strapi/promotions";
import { LoyaltyProgress } from "@/components/cliente/loyalty-progress";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Promociones" };

function discountLabel(type: string, value: number) {
  if (type === "percent") return `${value}% off`;
  if (type === "fixed") return `-$${value}`;
  return "Gratis";
}

export default async function PromocionesPage() {
  const { user } = await requireUser();
  const [promos, loyalty] = await Promise.all([
    listMyPromotions().catch(() => []),
    getMyLoyaltyProgress().catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
        <p className="text-muted-foreground">Las promociones se generan automáticamente cada 3 visitas.</p>
      </div>

      <LoyaltyProgress current={loyalty?.currentCount ?? user.visitCount ?? 0} />

      {promos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Aún no tienes promociones activas. Sigue acumulando visitas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {promos.map((p) => (
            <Card key={p.id} className="border-primary/30 bg-gradient-to-br from-primary/10 to-card">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-start justify-between">
                  <Gift className="h-6 w-6 text-primary" />
                  <Badge variant="default">{discountLabel(p.discountType, p.discountValue)}</Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold">{p.title}</h3>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Válida hasta {formatDate(p.validUntil)}
                </div>
                <div className="rounded-lg bg-background/60 p-2 text-center font-mono text-xs">
                  {p.code}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
