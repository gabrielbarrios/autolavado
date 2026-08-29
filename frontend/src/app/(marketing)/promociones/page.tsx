import Link from "next/link";
import { Calendar, Megaphone, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublicCampaigns } from "@/lib/strapi/promotions";
import { discountLabel, appliesToLabel, availabilityLabel, packagesLabel } from "@/lib/promotions";
import { VISITS_FOR_REWARD } from "@/lib/constants";
import { getSession } from "@/lib/auth/session";
import type { PublicCampaign } from "@/types/models";

export const metadata = { title: "Promociones" };

/**
 * Escaparate público de campañas. Se sirve sin sesión: el backend
 * (`/api/promotions/campaigns`) devuelve todas las campañas encendidas —
 * también las de otro día u otro rango de fechas, que es el punto de un
 * escaparate — y nunca promociones personales. Las recompensas de fidelidad de
 * cada cliente siguen viviendo en /mis-promociones, detrás del login.
 */
export default async function PromocionesPage() {
  const [campaigns, session] = await Promise.all([
    listPublicCampaigns().catch(() => []),
    getSession().catch(() => null),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Promociones</h1>
        <p className="mt-4 text-muted-foreground">
          Todas nuestras promociones. Cada una dice cuándo aplica: menciónala al llegar y se
          descuenta al momento de pagar.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-12 text-center">
            <Megaphone className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay promociones publicadas. Vuelve a revisar pronto.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      <Card className="mx-auto mt-12 max-w-3xl border-primary/30 bg-gradient-to-br from-primary/10 to-card">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <Gift className="h-8 w-8 shrink-0 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Además, cada visita cuenta</h2>
            <p className="text-sm text-muted-foreground">
              Cada {VISITS_FOR_REWARD} lavados ganas una recompensa automática, solo para ti.
              {session ? " La ves en tus promociones." : " Regístrate y empieza a acumular."}
            </p>
          </div>
          <Button asChild variant="premium">
            <Link href={session ? "/mis-promociones" : "/registro"}>
              {session ? "Ver mis promociones" : "Registrarme"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: PublicCampaign }) {
  return (
    <Card className="border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-card">
      <CardContent className="space-y-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <Megaphone className="h-6 w-6 shrink-0 text-sky-400" />
          <Badge variant="info">{campaign.discountLabel ?? discountLabel(campaign)}</Badge>
        </div>
        <div>
          <h2 className="text-base font-semibold">{campaign.title}</h2>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {availabilityLabel(campaign)}
          </p>
          <p>{appliesToLabel(campaign.appliesTo)}</p>
          {packagesLabel(campaign.packages) && <p>{packagesLabel(campaign.packages)}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
