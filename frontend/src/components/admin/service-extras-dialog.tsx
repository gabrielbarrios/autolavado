"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setServiceExtrasAction } from "@/actions/qr";
import { computeExtraServicePrice, extraServicePriceText } from "@/lib/pricing";
import { formatPrice, cn } from "@/lib/utils";
import type { ExtraService, Service, Vehicle } from "@/types/models";

/**
 * "Extras" en las tarjetas del tablero: agrega o quita servicios extra a un
 * auto que ya está en espera o trabajando (el cliente pidió algo más al
 * llegar, o el lavador vio que hacía falta). Al guardar, el backend recalcula
 * el total del servicio y eso es lo que sale después en Cobrar.
 *
 * Los precios que se muestran son los de catálogo para el auto del servicio.
 * No se conoce aquí si el cliente es VIP: el número final lo pone el backend.
 */
export function ServiceExtrasDialog({
  service,
  catalog,
}: {
  service: Service;
  catalog: ExtraService[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const current = React.useMemo(
    () => new Set((service.extraServices ?? []).map((e) => e.id)),
    [service.extraServices],
  );

  // El auto del servicio, para el precio por tipo. Un visitante no tiene
  // Vehicle: se arma uno mínimo con lo que guardó el walk-in.
  const vehicleLike = (service.vehicle ?? {
    id: 0,
    brand: "",
    model: "",
    year: 0,
    color: "",
    plate: "",
    vehicleType: service.vehicleType,
    isUberTaxi: service.isUberTaxi ?? false,
  }) as Vehicle;

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Cada vez que se abre parte de lo que el servicio ya tiene.
    if (next) setSelected(new Set(current));
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  const chosen = catalog.filter((e) => selected.has(e.id));
  const extrasTotal = chosen.reduce(
    (acc, e) => acc + computeExtraServicePrice(e, vehicleLike),
    0,
  );
  const changed =
    chosen.length !== current.size || chosen.some((e) => !current.has(e.id));
  // Un servicio de solo extras no puede quedarse vacío.
  const wouldBeEmpty = !service.package && chosen.length === 0;

  async function onSave() {
    setSaving(true);
    const res = await setServiceExtrasAction(
      service.id,
      chosen.map((e) => e.id),
    );
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Extras guardados · total ${formatPrice(res.data?.service.totalAmount ?? 0)}`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Sparkles className="h-4 w-4" />
          Extras{current.size > 0 ? ` (${current.size})` : ""}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Servicios extra</DialogTitle>
          <DialogDescription>
            Marca lo que lleva este auto. Se suma a la cuenta y se cobra junto con el lavado.
          </DialogDescription>
        </DialogHeader>

        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay servicios extra activos en el catálogo.{" "}
            <Link href="/extras-admin" className="text-primary underline-offset-4 hover:underline">
              Agrégalos en Otros servicios
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalog.map((e) => {
              const sel = selected.has(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggle(e.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2 text-left text-sm transition-colors",
                    sel ? "border-primary bg-primary/10" : "border-border hover:border-primary/60",
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
                  <span className="flex-1 leading-tight">{e.name}</span>
                  <span className="shrink-0 font-semibold">
                    {extraServicePriceText(e, vehicleLike, {}, true)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {catalog.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-card/50 p-3 text-sm">
            <span className="text-muted-foreground">
              {chosen.length === 0
                ? "Sin extras"
                : `${chosen.length} extra${chosen.length > 1 ? "s" : ""}`}
            </span>
            <span className="font-mono font-semibold">{formatPrice(extrasTotal)}</span>
          </div>
        )}

        {wouldBeEmpty && (
          <p className="text-xs text-amber-300">
            Este servicio no tiene paquete: necesita al menos un extra.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={saving || !changed || wouldBeEmpty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
