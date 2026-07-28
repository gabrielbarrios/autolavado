"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { strapiMediaUrl, formatPrice, cn } from "@/lib/utils";
import {
  computePackagePrice,
  computeExtraServicePrice,
  extraServicePriceRange,
  packagePriceRange,
  vehicleTypeLabel,
} from "@/lib/pricing";
import {
  PackageTypePicker,
  type VehicleSelection,
} from "./package-type-picker";
import type { ExtraService, Package, Vehicle } from "@/types/models";

export function PackagesGrid({
  packages,
  extras = [],
  isVip = false,
}: {
  packages: Package[];
  extras?: ExtraService[];
  /** El visitante tiene rol VIP → se le muestra la tarifa VIP donde exista. */
  isVip?: boolean;
}) {
  const priceCtx = { isVip };
  const [selection, setSelection] = React.useState<VehicleSelection>({
    vehicleType: null,
    isUberTaxi: false,
  });
  const [selectedExtras, setSelectedExtras] = React.useState<Set<number>>(new Set());

  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const fakeVehicle: Vehicle | null = selection.vehicleType
    ? {
        id: 0,
        brand: "",
        model: "",
        year: 0,
        color: "",
        plate: "",
        vehicleType: selection.vehicleType,
        isUberTaxi: selection.isUberTaxi,
      }
    : selection.isUberTaxi
      ? { id: 0, brand: "", model: "", year: 0, color: "", plate: "", isUberTaxi: true }
      : null;
  const hasSelection = !!fakeVehicle;

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
        Aún no hay paquetes publicados. Configúralos desde Strapi → Content Manager → Package.
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
      <PackageTypePicker value={selection} onChange={setSelection} className="mb-8" />

      <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const computed = fakeVehicle ? computePackagePrice(pkg, fakeVehicle, priceCtx) : 0;
          const { min, max } = packagePriceRange(pkg, priceCtx);
          const hasRange = min !== max && min > 0;

          return (
            <Card key={pkg.id} className="flex h-full flex-col overflow-hidden border-border/60 bg-card/50">
              <div className="relative h-44 w-full shrink-0 bg-muted">
                {pkg.image && (
                  <Image
                    src={strapiMediaUrl(pkg.image, "small") ?? ""}
                    alt={pkg.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <CardHeader className="shrink-0">
                <CardTitle>{pkg.name}</CardTitle>
                <div className="flex items-baseline gap-2">
                  {hasSelection ? (
                    <>
                      <span className="text-3xl font-bold">
                        {computed > 0 ? formatPrice(computed) : "Sin precio"}
                      </span>
                      {computed > 0 && (
                        <span className="text-xs text-muted-foreground">por servicio</span>
                      )}
                    </>
                  ) : (
                    <>
                      {hasRange && <span className="text-xs text-muted-foreground">desde</span>}
                      <span className="text-3xl font-bold">
                        {min > 0 ? formatPrice(min) : "Sin precio"}
                      </span>
                      {min > 0 && (
                        <span className="text-xs text-muted-foreground">por servicio</span>
                      )}
                    </>
                  )}
                </div>
                {hasSelection && (
                  <p className="text-xs text-muted-foreground">
                    Precio para{" "}
                    {selection.isUberTaxi
                      ? "Uber/Taxi"
                      : vehicleTypeLabel(selection.vehicleType)}
                  </p>
                )}
                <p className="line-clamp-2 text-sm text-muted-foreground">{pkg.description}</p>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {pkg.durationMinutes} min
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  {(pkg.benefits ?? []).map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto shrink-0">
                <Button asChild className="w-full" variant="premium">
                  <Link href={`/reservar?packageId=${pkg.id}`}>Reservar paquete</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {extras.length > 0 && (() => {
        const selectedExtrasList = extras.filter((e) => selectedExtras.has(e.id));
        const extrasTotal = selectedExtrasList.reduce(
          (acc, s) => acc + computeExtraServicePrice(s, fakeVehicle, priceCtx),
          0,
        );
        const totalMinutes = selectedExtrasList.reduce(
          (acc, s) => acc + Number(s.estimatedDuration ?? 0),
          0,
        );
        const ids = Array.from(selectedExtras).join(",");
        const reserveHref = ids ? `/reservar?extraServiceIds=${ids}` : "#";

        return (
          <section className="mt-20">
            <div className="mb-8 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                  Otros servicios
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Selecciona uno o varios para reservarlos sueltos (sin paquete).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {extras.map((s) => {
                const isSelected = selectedExtras.has(s.id);
                const computed = computeExtraServicePrice(s, fakeVehicle, priceCtx);
                const { min, max } = extraServicePriceRange(s, priceCtx);
                const hasRange = min !== max && min > 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleExtra(s.id)}
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/50 text-left transition-all hover:-translate-y-0.5",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border/60 hover:border-primary/40",
                    )}
                  >
                    <div className="relative h-32 w-full shrink-0 bg-muted">
                      {s.image ? (
                        <Image
                          src={strapiMediaUrl(s.image, "small") ?? ""}
                          alt={s.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
                                {computed > 0 ? formatPrice(computed) : "Sin precio"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {selection.isUberTaxi
                                  ? "Uber/Taxi"
                                  : vehicleTypeLabel(selection.vehicleType)}
                              </span>
                            </>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              {hasRange && <span className="text-xs text-muted-foreground">desde</span>}
                              <span className="text-2xl font-bold tracking-tight">
                                {min > 0 ? formatPrice(min) : "Sin precio"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "sticky bottom-4 z-30 mt-10 transition-all",
                selectedExtras.size === 0 ? "pointer-events-none opacity-0" : "opacity-100",
              )}
            >
              <Card className="border-primary/40 bg-card/95 shadow-xl backdrop-blur">
                <CardContent className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {selectedExtras.size} servicio{selectedExtras.size === 1 ? "" : "s"} seleccionado
                      {selectedExtras.size === 1 ? "" : "s"}
                    </p>
                    <p className="text-2xl font-bold">{formatPrice(extrasTotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasSelection
                        ? `Precio para ${selection.isUberTaxi ? "Uber/Taxi" : vehicleTypeLabel(selection.vehicleType)}`
                        : "Precio base — varía según tipo de auto"}
                      {totalMinutes > 0 && ` · ~${totalMinutes} min`}
                    </p>
                  </div>
                  <Button asChild size="lg" variant="premium" disabled={selectedExtras.size === 0}>
                    <Link href={reserveHref}>Reservar seleccionados</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        );
      })()}
    </>
  );
}
