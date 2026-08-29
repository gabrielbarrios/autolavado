"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { walkInServiceAction } from "@/actions/qr";
import { cn, formatPrice } from "@/lib/utils";
import {
  computePackagePrice,
  computeExtraServicePrice,
  extraServicePriceText,
  vehicleTypeLabel,
} from "@/lib/pricing";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";
import type { ExtraService, Package, VehicleType, Vehicle } from "@/types/models";

export function WalkInForm({
  packages,
  extraServices,
}: {
  packages: Package[];
  extraServices: ExtraService[];
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = React.useState("");
  const vehicleTypes = useVehicleTypes();
  // Arranca en el primer tipo del catálogo: "sedan" pudo renombrarse o borrarse.
  const [vehicleType, setVehicleType] = React.useState<VehicleType>(
    () => vehicleTypes[0]?.slug ?? "",
  );
  const [isUberTaxi, setIsUberTaxi] = React.useState(false);
  const [packageId, setPackageId] = React.useState<number | null>(null);
  const [selectedExtras, setSelectedExtras] = React.useState<Set<number>>(new Set());
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Fake vehicle para reutilizar computePackagePrice
  const fakeVehicle: Vehicle = {
    id: 0,
    brand: "",
    model: "",
    year: 0,
    color: "",
    plate: "",
    vehicleType,
    isUberTaxi,
  };

  const selectedPackage = packages.find((p) => p.id === packageId);
  const pkgPrice = selectedPackage ? computePackagePrice(selectedPackage, fakeVehicle) : 0;
  const extrasList = extraServices.filter((e) => selectedExtras.has(e.id));
  const extrasTotal = extrasList.reduce(
    (acc, e) => acc + computeExtraServicePrice(e, fakeVehicle),
    0,
  );
  const total = pkgPrice + extrasTotal;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!packageId && selectedExtras.size === 0) {
      toast.error("Selecciona al menos un paquete o un servicio extra");
      return;
    }
    setSubmitting(true);
    const result = await walkInServiceAction({
      customerName: customerName.trim() || undefined,
      vehicleType,
      isUberTaxi,
      packageId: packageId ?? undefined,
      extraServiceIds: Array.from(selectedExtras),
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Servicio iniciado — ${formatPrice(result.data?.service.totalAmount ?? 0)}. Márcalo como completado en /en-progreso al terminar.`,
      { duration: 5000 },
    );
    // Reset
    setCustomerName("");
    setPackageId(null);
    setSelectedExtras(new Set());
    setNotes("");
    setIsUberTaxi(false);
    setVehicleType("sedan");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cliente (opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customerName">Nombre del cliente</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Solo para tu registro (opcional)"
            />
            <p className="text-xs text-muted-foreground">
              Este servicio NO acumula fidelidad. Sirve para registrar walk-ins sin cuenta.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipo de auto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {vehicleTypes.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setVehicleType(t.slug)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  vehicleType === t.slug
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/60",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-3">
            <div>
              <Label htmlFor="walk-uber" className="cursor-pointer">
                ¿Es Uber / Taxi?
              </Label>
              <p className="text-xs text-muted-foreground">Aplica precio especial si está configurado.</p>
            </div>
            <Switch id="walk-uber" checked={isUberTaxi} onCheckedChange={setIsUberTaxi} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paquete (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setPackageId(null)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm",
                packageId === null
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60",
              )}
            >
              <p className="font-medium">Sin paquete</p>
              <p className="text-xs text-muted-foreground">Sólo servicios extras</p>
            </button>
            {packages.map((p) => {
              const price = computePackagePrice(p, fakeVehicle);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm",
                    packageId === p.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/60",
                  )}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.durationMinutes} min</p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {price > 0 ? formatPrice(price) : "Sin precio"}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {extraServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Servicios extras (opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {extraServices.map((s) => {
                const sel = selectedExtras.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleExtra(s.id)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2 text-left text-sm transition-colors",
                      sel
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        sel
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {sel && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 leading-tight">{s.name}</span>
                    <span className="shrink-0 font-semibold">
                      {extraServicePriceText(s, fakeVehicle, {}, true)}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(selectedPackage || extrasList.length > 0) && (
        <Card className="border-primary/30 bg-linear-to-br from-primary/5 to-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumen</p>
                {/* div y no p: Badge renderiza un <div>, que no es válido dentro de <p>. */}
                <div className="flex flex-wrap items-center gap-x-1 text-sm">
                  {customerName.trim() ? (
                    <span className="font-semibold">{customerName.trim()}</span>
                  ) : (
                    <span className="text-muted-foreground">Cliente sin nombre</span>
                  )}
                  {" · "}
                  {vehicleTypeLabel(vehicleType, vehicleTypes)}
                  {isUberTaxi && (
                    <Badge variant="info" className="ml-1 text-[10px]">
                      Uber/Taxi
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">{formatPrice(total)}</p>
              </div>
            </div>
            <div className="space-y-1 border-t border-border/40 pt-3 text-sm text-muted-foreground">
              {selectedPackage && (
                <div className="flex justify-between">
                  <span>{selectedPackage.name}</span>
                  <span className="font-mono">{formatPrice(pkgPrice)}</span>
                </div>
              )}
              {extrasList.map((e) => (
                <div key={e.id} className="flex justify-between">
                  <span>+ {e.name}</span>
                  <span className="font-mono">
                    {extraServicePriceText(e, fakeVehicle, {}, true)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del servicio, observaciones, etc."
            />
          </div>
          <Button
            type="submit"
            size="lg"
            variant="premium"
            className="w-full"
            disabled={submitting || (!packageId && selectedExtras.size === 0)}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar servicio walk-in
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
