"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { strapiMediaUrl, formatPrice, cn } from "@/lib/utils";
import {
  computeExtraServicePrice,
  extraServicePriceRange,
  vehicleTypeLabel,
} from "@/lib/pricing";
import {
  PackageTypePicker,
  type VehicleSelection,
} from "./package-type-picker";
import type { ExtraService, Vehicle } from "@/types/models";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

export function ExtraServicesSelector({
  services,
  isVip = false,
}: {
  services: ExtraService[];
  /** El visitante tiene rol VIP → se le muestra la tarifa VIP donde exista. */
  isVip?: boolean;
}) {
  const vehicleTypes = useVehicleTypes();
  const priceCtx = { isVip };
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [vehicleSel, setVehicleSel] = React.useState<VehicleSelection>({
    vehicleType: null,
    isUberTaxi: false,
  });

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const fakeVehicle: Vehicle | null = vehicleSel.vehicleType
    ? {
        id: 0,
        brand: "",
        model: "",
        year: 0,
        color: "",
        plate: "",
        vehicleType: vehicleSel.vehicleType,
        isUberTaxi: vehicleSel.isUberTaxi,
      }
    : vehicleSel.isUberTaxi
      ? { id: 0, brand: "", model: "", year: 0, color: "", plate: "", isUberTaxi: true }
      : null;
  const hasSelection = !!fakeVehicle;

  const selectedList = services.filter((s) => selected.has(s.id));
  const total = selectedList.reduce(
    (acc, s) => acc + computeExtraServicePrice(s, fakeVehicle, priceCtx),
    0,
  );
  const totalMinutes = selectedList.reduce(
    (acc, s) => acc + Number(s.estimatedDuration ?? 0),
    0,
  );
  const ids = Array.from(selected).join(",");
  const reserveHref = ids ? `/reservar?extraServiceIds=${ids}` : "#";

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
        Aún no hay servicios extras publicados.
      </div>
    );
  }

  return (
    <>
      {isVip && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>
            <strong>Precios VIP.</strong> Estás viendo tu tarifa preferente; donde no haya
            precio VIP configurado se muestra el precio normal.
          </span>
        </div>
      )}
      <PackageTypePicker value={vehicleSel} onChange={setVehicleSel} className="mb-8" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const isSelected = selected.has(s.id);
          const computed = computeExtraServicePrice(s, fakeVehicle, priceCtx);
          const { min, max } = extraServicePriceRange(s, priceCtx);
          const hasRange = min !== max && min > 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/50 text-left transition-all hover:-translate-y-0.5",
                isSelected
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <div className="relative h-36 w-full shrink-0 bg-muted">
                {s.image ? (
                  <Image
                    src={strapiMediaUrl(s.image, "small") ?? ""}
                    alt={s.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                {s.featured && !isSelected && (
                  <Badge className="absolute right-3 top-3 z-10" variant="default">
                    Destacado
                  </Badge>
                )}
                <span
                  className={cn(
                    "absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/70 bg-black/30 text-transparent group-hover:border-primary",
                  )}
                >
                  <Check className="h-4 w-4" />
                </span>
              </div>
              <Card className="flex flex-1 flex-col border-0 bg-transparent shadow-none">
                <CardContent className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="text-base font-semibold leading-tight">{s.name}</h3>
                  {s.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  )}
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <div>
                      {s.estimatedDuration ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.estimatedDuration} min
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end">
                      {hasSelection ? (
                        <>
                          <span className="text-2xl font-bold tracking-tight">
                            {formatPrice(computed)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {vehicleSel.isUberTaxi
                              ? "Uber/Taxi"
                              : vehicleTypeLabel(vehicleSel.vehicleType, vehicleTypes)}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          {hasRange && (
                            <span className="text-xs text-muted-foreground">desde</span>
                          )}
                          <span className="text-2xl font-bold tracking-tight">
                            {formatPrice(min || Number(s.price))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "sticky bottom-4 z-30 mt-10 transition-all",
          selected.size === 0 ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <Card className="border-primary/40 bg-card/95 shadow-xl backdrop-blur">
          <CardContent className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {selected.size} servicio{selected.size === 1 ? "" : "s"} seleccionado
                {selected.size === 1 ? "" : "s"}
              </p>
              <p className="text-2xl font-bold">{formatPrice(total)}</p>
              <p className="text-xs text-muted-foreground">
                {hasSelection
                  ? `Precio para ${vehicleSel.isUberTaxi ? "Uber/Taxi" : vehicleTypeLabel(vehicleSel.vehicleType, vehicleTypes)}`
                  : "Precio base — varía según tipo de auto"}
                {totalMinutes > 0 && ` · ~${totalMinutes} min`}
              </p>
            </div>
            <Button asChild size="lg" variant="premium" disabled={selected.size === 0}>
              <Link href={reserveHref}>Reservar seleccionados</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
