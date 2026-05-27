"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CalendarX, Clock } from "lucide-react";
import { createAppointmentAction } from "@/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { formatPrice, cn } from "@/lib/utils";
import { dayLabel, weekDayFromISODate, hoursByDay } from "@/lib/business-hours";
import {
  computePackagePrice,
  computeExtraServicePrice,
  vehicleTypeLabel,
} from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import type { BusinessHour, ClosedDate, ExtraService, Package, Vehicle, WeekDay } from "@/types/models";
import { Check, Sparkles } from "lucide-react";

interface SlotInfo {
  slot: string;
  available: boolean;
}

interface AvailabilityResponse {
  closed: boolean;
  reason?: string;
  error?: string;
  slotDuration?: number;
  bookingNumberSlot?: number;
  packageMinutes?: number;
  open?: string;
  close?: string;
  slots: SlotInfo[];
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function BookingForm({
  packages,
  vehicles,
  businessHours,
  closedDates,
  extraServices = [],
}: {
  packages: Package[];
  vehicles: Vehicle[];
  businessHours: BusinessHour[];
  closedDates: ClosedDate[];
  extraServices?: ExtraService[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const prefillPackage = params.get("packageId");
  const prefillExtras = React.useMemo(() => {
    const raw = params.get("extraServiceIds") ?? "";
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [params]);
  // Si llegamos con extras-only prefijados desde /otros-servicios, no auto-seleccionamos paquete.
  const extrasOnlyMode = prefillExtras.length > 0 && !prefillPackage;

  const [packageId, setPackageId] = React.useState<number | null>(
    prefillPackage ? Number(prefillPackage) : extrasOnlyMode ? null : packages[0]?.id ?? null,
  );
  const [vehicleId, setVehicleId] = React.useState<number | null>(vehicles[0]?.id ?? null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [slot, setSlot] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selectedExtras, setSelectedExtras] = React.useState<Set<number>>(
    () => new Set(prefillExtras),
  );

  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [availability, setAvailability] = React.useState<AvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = React.useState(false);

  const selectedPackage = packages.find((p) => p.id === packageId);
  const date = selectedDate ? toISODate(selectedDate) : "";

  // Calcula días sin horario (de la semana) y closed dates
  const { closedWeekDays, closedDateSet } = React.useMemo(() => {
    const allDays: WeekDay[] = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const hoursIdx = hoursByDay(businessHours);
    const closedWeekDays = allDays.filter((d) => {
      const h = hoursIdx[d];
      return !h || h.closed || !h.open || !h.close;
    });
    const closedDateSet = new Set((closedDates ?? []).map((c) => c.date));
    return { closedWeekDays, closedDateSet };
  }, [businessHours, closedDates]);

  // Convierte WeekDays a números JS (0=Sun..6=Sat) para el calendar disabled prop
  const disabledDaysOfWeek = React.useMemo(() => {
    const map: Record<WeekDay, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return closedWeekDays.map((d) => map[d]);
  }, [closedWeekDays]);

  // Función para deshabilitar fechas en el calendario
  const isDateDisabled = React.useCallback(
    (date: Date) => {
      // Pasado
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true;
      // Día de la semana sin horario
      if (disabledDaysOfWeek.includes(date.getDay())) return true;
      // Fecha bloqueada explícitamente
      if (closedDateSet.has(toISODate(date))) return true;
      return false;
    },
    [disabledDaysOfWeek, closedDateSet],
  );

  // Reason cuando una fecha quedó bloqueada manualmente (por si el usuario insiste)
  const closedReason = React.useMemo(() => {
    if (!date) return null;
    const blocked = closedDates?.find((c) => c.date === date);
    return blocked?.reason ?? null;
  }, [date, closedDates]);

  // Fetch availability cuando cambia fecha, paquete o extras
  const extrasKey = React.useMemo(
    () => Array.from(selectedExtras).sort((a, b) => a - b).join(","),
    [selectedExtras],
  );
  React.useEffect(() => {
    const hasExtras = extrasKey.length > 0;
    if (!date || (!packageId && !hasExtras)) {
      setAvailability(null);
      setSlot(null);
      return;
    }
    let cancelled = false;
    setLoadingAvailability(true);
    const qs = new URLSearchParams({ date });
    if (packageId) qs.set("packageId", String(packageId));
    if (hasExtras) qs.set("extraServiceIds", extrasKey);
    fetch(`/api/booking/available-slots?${qs.toString()}`)
      .then((r) => r.json())
      .then((data: AvailabilityResponse) => {
        if (cancelled) return;
        setAvailability(data);
        if (slot && !data.slots?.some((s) => s.slot === slot && s.available)) {
          setSlot(null);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, packageId, extrasKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId || !date || !slot) {
      toast.error("Completa todos los datos");
      return;
    }
    if (!packageId && selectedExtras.size === 0) {
      toast.error("Selecciona un paquete o al menos un servicio extra");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    if (packageId) fd.set("packageId", String(packageId));
    fd.set("vehicleId", String(vehicleId));
    fd.set("date", date);
    fd.set("timeSlot", slot);
    fd.set("customerNotes", notes);
    fd.set("extraServiceIds", Array.from(selectedExtras).join(","));
    const result = await createAppointmentAction(fd);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Reservación enviada — pendiente de aprobación");
    router.push("/perfil");
    router.refresh();
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Necesitas registrar al menos un auto para poder reservar.
          </p>
          <Button asChild variant="premium">
            <a href="/autos/nuevo">Registrar mi primer auto</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bookingNumberSlot = selectedPackage?.bookingNumberSlot ?? 1;
  const slotDuration = availability?.slotDuration ?? 60;
  const packageMinutes = availability?.packageMinutes ?? bookingNumberSlot * slotDuration;
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const packagePriceForVehicle = selectedPackage
    ? computePackagePrice(selectedPackage, selectedVehicle)
    : 0;
  const selectedExtrasList = extraServices.filter((e) => selectedExtras.has(e.id));
  const extrasTotal = selectedExtrasList.reduce(
    (acc, e) => acc + computeExtraServicePrice(e, selectedVehicle),
    0,
  );
  const hasAnyService = !!selectedPackage || selectedExtrasList.length > 0;
  const finalPrice = hasAnyService ? packagePriceForVehicle + extrasTotal : null;
  const usingUberPrice =
    selectedPackage?.uberTaxiPrice != null && selectedVehicle?.isUberTaxi;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Elige paquete {selectedExtras.size > 0 && <span className="text-sm font-normal text-muted-foreground">(opcional con extras)</span>}</CardTitle>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay paquetes disponibles aún.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPackageId(null)}
                className={cn(
                  "rounded-xl border border-dashed p-4 text-left transition-all hover:border-primary/60",
                  packageId === null
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border",
                )}
              >
                <p className="font-semibold">Sin paquete</p>
                <p className="text-xs text-muted-foreground">Solo servicios extras</p>
              </button>
              {packages.map((p) => {
                const priceForCard = computePackagePrice(p, selectedVehicle);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackageId(p.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all hover:border-primary/60",
                      packageId === p.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border",
                    )}
                  >
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.durationMinutes} min</p>
                    {p.bookingNumberSlot && p.bookingNumberSlot > 1 && (
                      <p className="text-xs text-muted-foreground">Ocupa {p.bookingNumberSlot} slots</p>
                    )}
                    <p className="mt-2 text-lg font-bold">{formatPrice(priceForCard)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Elige tu auto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {vehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleId(v.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all hover:border-primary/60",
                  vehicleId === v.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border",
                )}
              >
                <p className="font-semibold">
                  {v.brand} {v.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.plate || "Sin placa"} · {vehicleTypeLabel(v.vehicleType)}
                </p>
                {v.isUberTaxi && (
                  <Badge variant="info" className="mt-2 text-[10px]">
                    Uber / Taxi
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Fecha y hora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
            <div>
              <Label className="mb-2 block">Fecha</Label>
              <div className="inline-block rounded-xl border border-border/60 bg-card/50">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  fromDate={new Date()}
                />
              </div>
              {selectedDate && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {dayLabel(weekDayFromISODate(date))} · {date}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Horario</Label>
              {!date ? (
                <p className="text-xs text-muted-foreground">Selecciona una fecha en el calendario.</p>
              ) : loadingAvailability ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando disponibilidad…
                </div>
              ) : availability?.closed ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-300">
                  <CalendarX className="h-4 w-4 shrink-0" />
                  <span>
                    Estamos cerrados{availability.reason ? ` — ${availability.reason}` : closedReason ? ` — ${closedReason}` : ""}.
                  </span>
                </div>
              ) : availability?.error ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {availability.error}
                </div>
              ) : availability?.slots && availability.slots.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Duración: {packageMinutes} min
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {availability.open} - {availability.close}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availability.slots.map((s) => {
                      const isSelected = slot === s.slot;
                      return (
                        <button
                          key={s.slot}
                          type="button"
                          onClick={() => s.available && setSlot(s.slot)}
                          disabled={!s.available}
                          title={s.available ? undefined : "Slot ocupado"}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm transition-all",
                            !s.available
                              ? "cursor-not-allowed border-border/40 bg-muted/30 text-muted-foreground/50 line-through"
                              : isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/60",
                          )}
                        >
                          {s.slot}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No hay horarios disponibles para este paquete en esta fecha.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas para el equipo (opcional)</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {extraServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              4. Servicios extras (opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Agrega servicios sueltos a tu reservación. Se sumarán al total.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {extraServices.map((s) => {
                const selected = selectedExtras.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleExtra(s.id)}
                    className={cn(
                      "relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/60",
                      selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{s.name}</p>
                      {s.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatPrice(computeExtraServicePrice(s, selectedVehicle))}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {finalPrice !== null && selectedVehicle && (
        <Card className="border-primary/30 bg-linear-to-br from-primary/5 to-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumen</p>
                <p className="text-sm">
                  <span className="font-semibold">
                    {selectedPackage
                      ? selectedPackage.name
                      : `${selectedExtrasList.length} servicio${selectedExtrasList.length === 1 ? "" : "s"} extra`}
                  </span>{" "}
                  para{" "}
                  <span className="font-semibold">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({vehicleTypeLabel(selectedVehicle.vehicleType)}
                    {selectedVehicle.isUberTaxi ? " · Uber/Taxi" : ""})
                  </span>
                </p>
                {usingUberPrice && (
                  <Badge variant="info" className="mt-1 text-[10px]">
                    Precio especial Uber/Taxi
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total a pagar</p>
                <p className="text-3xl font-bold">{formatPrice(finalPrice)}</p>
              </div>
            </div>
            {(selectedPackage || selectedExtrasList.length > 0) && (
              <div className="space-y-1 border-t border-border/40 pt-3 text-sm">
                {selectedPackage && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paquete</span>
                    <span className="font-mono">{formatPrice(packagePriceForVehicle)}</span>
                  </div>
                )}
                {selectedExtrasList.map((e) => (
                  <div key={e.id} className="flex justify-between text-muted-foreground">
                    <span>+ {e.name}</span>
                    <span className="font-mono">
                      {formatPrice(computeExtraServicePrice(e, selectedVehicle))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        type="submit"
        size="lg"
        variant="premium"
        disabled={loading || !slot || availability?.closed}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirmar reservación
      </Button>
    </form>
  );
}
