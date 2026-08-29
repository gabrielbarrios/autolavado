"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Clock } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import {
  appliesToVehicleType,
  computePackagePrice,
  packagePriceRange,
  vehicleTypeLabel,
} from "@/lib/pricing";
import {
  PackageTypePicker,
  type VehicleSelection,
} from "./package-type-picker";
import type { Package } from "@/types/models";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

const FALLBACK: Package[] = [
  {
    id: -1,
    name: "Lavado básico",
    slug: "basico",
    durationMinutes: 30,
    description: "Exterior + secado a mano.",
    benefits: ["Carrocería y vidrios", "Llantas", "Secado a mano"],
    featured: true,
    pricing: [
      { id: 1, vehicleType: "chico", price: 100 },
      { id: 2, vehicleType: "sedan", price: 120 },
      { id: 3, vehicleType: "suv", price: 150 },
    ],
  },
  {
    id: -2,
    name: "Premium",
    slug: "premium",
    durationMinutes: 60,
    description: "Lavado completo + interior básico.",
    benefits: ["Todo del básico", "Aspirado", "Tablero limpio", "Aroma cabina"],
    featured: true,
    pricing: [
      { id: 4, vehicleType: "chico", price: 240 },
      { id: 5, vehicleType: "sedan", price: 280 },
      { id: 6, vehicleType: "suv", price: 350 },
    ],
  },
  {
    id: -3,
    name: "Detallado",
    slug: "detallado",
    durationMinutes: 120,
    description: "Detallado profesional integral.",
    benefits: ["Encerado", "Pulido", "Interior premium", "Plásticos hidratados"],
    featured: true,
    pricing: [
      { id: 7, vehicleType: "chico", price: 580 },
      { id: 8, vehicleType: "sedan", price: 650 },
      { id: 9, vehicleType: "suv", price: 800 },
    ],
  },
];

export function ServicesShowcase({
  packages,
  isVip = false,
}: {
  packages?: Package[];
  /** El visitante tiene rol VIP → se le muestra la tarifa VIP donde exista. */
  isVip?: boolean;
}) {
  const vehicleTypes = useVehicleTypes();
  const priceCtx = { isVip };
  const all = packages?.length ? packages : FALLBACK;
  const [selection, setSelection] = React.useState<VehicleSelection>({
    vehicleType: null,
    isUberTaxi: false,
  });
  // Con un tipo elegido, solo los paquetes que tienen precio para ese tipo.
  const list = all.filter((p) => appliesToVehicleType(p, selection.vehicleType));

  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Paquetes destacados
          </h2>
          <p className="mt-2 text-muted-foreground">Elige el que mejor se adapte a tu auto.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/paquetes">Ver todos</Link>
        </Button>
      </div>

      <PackageTypePicker value={selection} onChange={setSelection} className="mb-8" />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
          Ningún paquete aplica a {vehicleTypeLabel(selection.vehicleType, vehicleTypes)}. Prueba con
          otro tipo de auto.
        </div>
      ) : (
      <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-3">
        {list.map((pkg, idx) => {
          const hasSelection = !!selection.vehicleType || selection.isUberTaxi;
          const fakeVehicle = selection.vehicleType
            ? { id: 0, brand: "", model: "", year: 0, color: "", plate: "", vehicleType: selection.vehicleType, isUberTaxi: selection.isUberTaxi }
            : selection.isUberTaxi
              ? { id: 0, brand: "", model: "", year: 0, color: "", plate: "", isUberTaxi: true }
              : null;
          const computed = fakeVehicle ? computePackagePrice(pkg, fakeVehicle, priceCtx) : 0;
          const { min, max } = packagePriceRange(pkg, priceCtx);
          const hasRange = min !== max && min > 0;

          return (
            <Card
              key={pkg.id}
              className={`relative flex h-full flex-col overflow-hidden border-border/60 bg-card/50 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl ${
                idx === 1 ? "ring-1 ring-primary/40" : ""
              }`}
            >
              {idx === 1 && (
                <Badge className="absolute right-4 top-4 z-10" variant="default">
                  Más popular
                </Badge>
              )}
              <div className="relative h-40 w-full shrink-0 bg-muted">
                {pkg.image && (
                  <Image
                    src={strapiMediaUrl(pkg.image, "small") ?? ""}
                    alt={pkg.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <CardHeader className="shrink-0">
                <CardTitle>{pkg.name}</CardTitle>
                <div className="mt-1 flex items-baseline gap-2">
                  {hasSelection ? (
                    <>
                      <span className="text-3xl font-bold tracking-tight">
                        {computed > 0 ? formatPrice(computed) : "Sin precio"}
                      </span>
                      {computed > 0 && (
                        <span className="text-xs text-muted-foreground">por servicio</span>
                      )}
                    </>
                  ) : (
                    <>
                      {hasRange && <span className="text-xs text-muted-foreground">desde</span>}
                      <span className="text-3xl font-bold tracking-tight">
                        {min > 0 ? formatPrice(min) : "Sin precio"}
                      </span>
                      {min > 0 && (
                        <span className="text-xs text-muted-foreground">por servicio</span>
                      )}
                    </>
                  )}
                </div>
                {hasSelection && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Precio para{" "}
                    {selection.isUberTaxi
                      ? "Uber/Taxi"
                      : vehicleTypeLabel(selection.vehicleType, vehicleTypes)}
                  </p>
                )}
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{pkg.description}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {pkg.durationMinutes} min
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  {(pkg.benefits ?? []).slice(0, 5).map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto shrink-0">
                <Button asChild className="w-full" variant={idx === 1 ? "premium" : "default"}>
                  <Link href={`/reservar?packageId=${pkg.id}`}>Reservar paquete</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      )}
    </section>
  );
}
