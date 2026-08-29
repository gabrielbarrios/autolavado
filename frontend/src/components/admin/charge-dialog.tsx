"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DollarSign, Loader2, Tag, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { availablePromotionsAction, chargeServiceAction } from "@/actions/qr";
import { formatPrice } from "@/lib/utils";
import type { AvailablePromotionsResult, ApplicablePromotion } from "@/lib/strapi/qr";
import type { Service } from "@/types/models";

/**
 * Cobro con descuentos. Reglas (decididas con el negocio):
 *  - como máximo UNA promoción del catálogo,
 *  - encima, opcionalmente, un descuento manual que solo el super admin puede
 *    aplicar (el backend vuelve a verificarlo; acá solo se oculta el campo).
 *
 * Los montos que se muestran son los que calculó el backend para ESTE ticket:
 * el navegador no decide cuánto se descuenta.
 */
export function ChargeDialog({ service }: { service: Service }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<AvailablePromotionsResult | null>(null);
  const [promoId, setPromoId] = React.useState<number | null>(null);
  const [manual, setManual] = React.useState("");
  const [extras, setExtras] = React.useState("");
  const [note, setNote] = React.useState("");
  const [charging, setCharging] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const load = React.useCallback(() => {
    startTransition(async () => {
      const res = await availablePromotionsAction(service.id);
      if (res.ok) setData(res.data ?? null);
      else toast.error(res.error);
    });
  }, [service.id]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !data) load();
    if (!next) {
      setPromoId(null);
      setManual("");
      setExtras("");
      setNote("");
    }
  }

  const catalogSubtotal = data?.service.subtotal ?? Number(service.totalAmount ?? 0);
  // Servicios sin precio de catálogo: el cajero captura el monto. Suma al
  // ticket pero no recibe descuento — igual que en el backend.
  const extrasCharge = Math.max(0, Number(extras) || 0);
  const subtotal = catalogSubtotal + extrasCharge;
  const quotedExtras = data?.service.quotedExtras ?? [];
  const promo = data?.promotions.find((p) => p.id === promoId) ?? null;
  const promoDiscount = promo?.discountAmount ?? 0;
  // Se replica el tope del backend para que el número que ve el cajero sea el
  // que se va a cobrar (allá se recorta igual).
  const manualRaw = Math.max(0, Number(manual) || 0);
  const manualDiscount = Math.min(manualRaw, Math.max(0, subtotal - promoDiscount));
  const total = Math.max(0, subtotal - promoDiscount - manualDiscount);

  async function onCharge() {
    setCharging(true);
    const res = await chargeServiceAction({
      serviceId: service.id,
      promotionId: promoId,
      manualDiscount: manualDiscount > 0 ? manualDiscount : undefined,
      extrasCharge: extrasCharge > 0 ? extrasCharge : undefined,
      discountNote: note.trim() || undefined,
    });
    setCharging(false);
    if (!res.ok) return toast.error(res.error);

    const charged = res.data?.service;
    const saved = (charged?.promotionDiscount ?? 0) + (charged?.manualDiscount ?? 0);
    if (res.data?.promotionGenerated) {
      toast.success("🎉 ¡Cobrado y promoción generada para el cliente!", { duration: 6000 });
    } else if (saved > 0) {
      toast.success(`Cobrado ${formatPrice(charged?.totalAmount ?? 0)} (${formatPrice(saved)} de descuento)`);
    } else if (service.isWalkIn) {
      toast.success("Servicio walk-in cobrado");
    } else {
      toast.success("Cobrado y visita registrada");
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <DollarSign className="h-4 w-4" />
          Cobrar {formatPrice(service.totalAmount)}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobrar servicio</DialogTitle>
        </DialogHeader>

        {isPending && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Promociones */}
            <section className="space-y-2">
              <p className="text-sm font-medium">Promoción</p>
              {!data || data.promotions.length === 0 ? (
                <p className="rounded-lg border border-border/50 p-3 text-sm text-muted-foreground">
                  No hay promociones aplicables a este servicio hoy.
                </p>
              ) : (
                <div className="space-y-2">
                  <PromoOption
                    selected={promoId === null}
                    onSelect={() => setPromoId(null)}
                    title="Sin promoción"
                  />
                  {data.promotions.map((p) => (
                    <PromoOption
                      key={p.id}
                      selected={promoId === p.id}
                      onSelect={() => setPromoId(p.id)}
                      title={p.title}
                      promo={p}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Otros servicios cotizados en caja */}
            <section className="space-y-2 rounded-lg border border-border/50 p-3">
              <Label htmlFor="extras">Extras (pesos)</Label>
              <Input
                id="extras"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {quotedExtras.length > 0
                  ? `Este servicio lleva ${quotedExtras.join(", ")}: su precio depende del auto, cobra lo acordado.`
                  : "Para cobrar servicios sin precio de catálogo. Se suma al total y no recibe descuento."}
              </p>
            </section>

            {/* Descuento manual: solo super admin */}
            {data?.canApplyManualDiscount && (
              <section className="space-y-3 rounded-lg border border-border/50 p-3">
                <div className="space-y-2">
                  <Label htmlFor="manual">Descuento adicional (pesos)</Label>
                  <Input
                    id="manual"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                  />
                </div>
                {manualDiscount > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="note">Motivo</Label>
                    <Input
                      id="note"
                      placeholder="Cliente frecuente, cortesía…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                )}
                {manualRaw > manualDiscount && (
                  <p className="text-xs text-amber-300">
                    El descuento se ajustó a {formatPrice(manualDiscount)}: no puede pasar del
                    total.
                  </p>
                )}
              </section>
            )}

            {/* Desglose */}
            <section className="space-y-1.5 rounded-lg bg-card/50 p-4 text-sm">
              <Line label="Subtotal" value={formatPrice(catalogSubtotal)} />
              {extrasCharge > 0 && <Line label="Extras" value={formatPrice(extrasCharge)} />}
              {promo && (
                <Line
                  label={`${promo.title} (${promo.discountLabel})`}
                  value={`− ${formatPrice(promoDiscount)}`}
                  tone="discount"
                />
              )}
              {manualDiscount > 0 && (
                <Line
                  label="Descuento adicional"
                  value={`− ${formatPrice(manualDiscount)}`}
                  tone="discount"
                />
              )}
              <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-base font-bold">
                <span>Total</span>
                <span className="font-mono">{formatPrice(total)}</span>
              </div>
            </section>

            <Button className="w-full" onClick={onCharge} disabled={charging}>
              {charging ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              Cobrar {formatPrice(total)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PromoOption({
  selected,
  onSelect,
  title,
  promo,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  promo?: ApplicablePromotion;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"
      }`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {promo?.kind === "personal" ? (
            <Gift className="h-3.5 w-3.5 shrink-0 text-primary" />
          ) : promo ? (
            <Tag className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          ) : null}
          {title}
        </p>
        {promo && (
          <p className="truncate text-xs text-muted-foreground">
            {promo.discountLabel}
            {promo.appliesTo === "package" && " · solo lavado"}
            {promo.appliesTo === "extras" && " · solo extras"}
            {promo.packages && promo.packages.length > 0 && ` · ${promo.packages.join(", ")}`}
          </p>
        )}
      </div>
      {promo && (
        <Badge variant={selected ? "default" : "outline"} className="shrink-0 font-mono">
          − {formatPrice(promo.discountAmount)}
        </Badge>
      )}
    </button>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "discount";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className={tone === "discount" ? "text-emerald-400" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`shrink-0 font-mono ${tone === "discount" ? "text-emerald-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}
