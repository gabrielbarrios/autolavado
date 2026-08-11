"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { togglePromotionAction, deletePromotionAction } from "@/actions/promotions";
import { discountLabel, appliesToLabel, availabilityLabel } from "@/lib/promotions";
import type { Promotion } from "@/types/models";

export function CampaignList({ promos }: { promos: Promotion[] }) {
  if (promos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Todavía no hay campañas. Crea la primera con el botón de arriba.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {promos.map((p) => (
        <CampaignCard key={p.id} promo={p} />
      ))}
    </div>
  );
}

function CampaignCard({ promo }: { promo: Promotion }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const active = promo.active !== false;

  async function onToggle(next: boolean) {
    setBusy(true);
    const res = await togglePromotionAction(promo.id, next);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(next ? "Promoción activada" : "Promoción pausada");
    router.refresh();
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar "${promo.title}"? No se puede deshacer.`)) return;
    setBusy(true);
    const res = await deletePromotionAction(promo.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Promoción eliminada");
    router.refresh();
  }

  return (
    <Card className={active ? "border-primary/30" : "opacity-70"}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{promo.title}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{promo.code}</p>
          </div>
          <Badge variant={active ? "success" : "outline"} className="shrink-0">
            {discountLabel(promo)}
          </Badge>
        </div>

        {promo.description && (
          <p className="text-sm text-muted-foreground">{promo.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{availabilityLabel(promo)}</Badge>
          <Badge variant="outline">{appliesToLabel(promo.appliesTo)}</Badge>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={active} onCheckedChange={onToggle} disabled={busy} />
            {active ? "Activa" : "Pausada"}
          </label>
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Promos de fidelidad: no se editan, solo se consultan. */
export function PersonalPromotionList({ promos }: { promos: Promotion[] }) {
  if (promos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Ningún cliente tiene promociones de fidelidad todavía.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop: tabla */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Descuento</th>
                <th className="px-4 py-3 font-medium">Vigencia</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {promos.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-3">{p.user?.name ?? p.user?.email ?? "—"}</td>
                  <td className="px-4 py-3">{discountLabel(p)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{availabilityLabel(p)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.used ? "outline" : "success"}>
                      {p.used ? "Usada" : "Activa"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas */}
        <div className="divide-y divide-border/40 md:hidden">
          {promos.map((p) => (
            <div key={p.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.user?.name ?? p.user?.email ?? "—"}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{p.code}</p>
                </div>
                <Badge variant={p.used ? "outline" : "success"} className="shrink-0">
                  {p.used ? "Usada" : "Activa"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                {discountLabel(p)} · {availabilityLabel(p)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
