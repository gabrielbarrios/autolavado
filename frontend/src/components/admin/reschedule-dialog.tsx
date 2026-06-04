"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarX, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { dayLabel, hoursByDay, weekDayFromISODate, formatTime } from "@/lib/business-hours";
import { rescheduleAppointmentAction } from "@/actions/appointments";
import type { Appointment, BusinessHour, ClosedDate, WeekDay } from "@/types/models";

interface SlotInfo {
  slot: string;
  available: boolean;
  reason?: string;
  /** true cuando el bloqueo se debe a que un horario POSTERIOR (multi-slot) está lleno. */
  overflow?: boolean;
}

interface AvailabilityResponse {
  closed: boolean;
  reason?: string;
  error?: string;
  slotDuration?: number;
  maxParallel?: number;
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

export function RescheduleDialog({
  appointment,
  businessHours,
  closedDates,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  businessHours: BusinessHour[];
  closedDates: ClosedDate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const packageId = appointment.package?.id;

  const initialDate = React.useMemo(() => {
    if (!appointment.date) return undefined;
    const d = new Date(`${appointment.date}T00:00:00`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [appointment.date]);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(initialDate);
  const [slot, setSlot] = React.useState<string | null>(formatTime(appointment.timeSlot) || null);
  const [adminNotes, setAdminNotes] = React.useState(appointment.adminNotes ?? "");
  const [availability, setAvailability] = React.useState<AvailabilityResponse | null>(null);
  const [loadingAv, setLoadingAv] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const date = selectedDate ? toISODate(selectedDate) : "";

  // Reset state when dialog reopens
  React.useEffect(() => {
    if (open) {
      setSelectedDate(initialDate);
      setSlot(formatTime(appointment.timeSlot) || null);
      setAdminNotes(appointment.adminNotes ?? "");
    }
  }, [open, initialDate, appointment.timeSlot, appointment.adminNotes]);

  const { closedDateSet, disabledDaysOfWeek } = React.useMemo(() => {
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
    const dayMap: Record<WeekDay, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return {
      closedDateSet: new Set((closedDates ?? []).map((c) => c.date)),
      disabledDaysOfWeek: closedWeekDays.map((d) => dayMap[d]),
    };
  }, [businessHours, closedDates]);

  const isDateDisabled = React.useCallback(
    (d: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return true;
      if (disabledDaysOfWeek.includes(d.getDay())) return true;
      if (closedDateSet.has(toISODate(d))) return true;
      return false;
    },
    [disabledDaysOfWeek, closedDateSet],
  );

  // Fetch availability
  React.useEffect(() => {
    if (!open || !date || !packageId) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setLoadingAv(true);
    fetch(
      `/api/booking/available-slots?date=${date}&packageId=${packageId}&excludeAppointmentId=${appointment.id}`,
    )
      .then((r) => r.json())
      .then((data: AvailabilityResponse) => {
        if (cancelled) return;
        setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAv(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, date, packageId, appointment.id]);

  async function onSubmit() {
    if (!date || !slot) {
      toast.error("Selecciona fecha y hora");
      return;
    }
    setSubmitting(true);
    const result = await rescheduleAppointmentAction(appointment.id, {
      date,
      timeSlot: slot,
      adminNotes: adminNotes || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Reservación re-agendada");
    onOpenChange(false);
    router.refresh();
  }

  const slotDuration = availability?.slotDuration ?? 60;
  const bookingNumberSlot =
    availability?.bookingNumberSlot ?? appointment.package?.bookingNumberSlot ?? 1;
  const packageMinutes = availability?.packageMinutes ?? bookingNumberSlot * slotDuration;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Re-agendar reservación #{appointment.id}</DialogTitle>
          <DialogDescription>
            {appointment.user?.name ?? appointment.user?.email} ·{" "}
            {appointment.package?.name ?? "Paquete"} ·{" "}
            <span className="font-mono">
              {formatDate(appointment.date)} {formatTime(appointment.timeSlot)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <div>
            <Label className="mb-2 block">Nueva fecha</Label>
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
            <Label>Nuevo horario</Label>
            {!date ? (
              <p className="text-xs text-muted-foreground">Selecciona una fecha primero.</p>
            ) : loadingAv ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Consultando…
              </div>
            ) : availability?.closed ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-300">
                <CalendarX className="h-4 w-4 shrink-0" />
                <span>Cerrado{availability.reason ? ` — ${availability.reason}` : ""}.</span>
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
                <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto pr-1">
                  {availability.slots.map((s) => {
                    const isSelected = slot === s.slot;
                    const isCurrent =
                      formatTime(appointment.timeSlot) === s.slot && appointment.date === date;
                    return (
                      <button
                        key={s.slot}
                        type="button"
                        onClick={() => s.available && setSlot(s.slot)}
                        disabled={!s.available}
                        title={s.available ? undefined : s.reason ?? "Horario ocupado"}
                        className={cn(
                          "relative rounded-lg border px-3 py-1.5 text-sm transition-all",
                          !s.available
                            ? "cursor-not-allowed border-border/40 bg-muted/30 text-muted-foreground/50 line-through"
                            : isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/60",
                        )}
                      >
                        {s.slot}
                        {isCurrent && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            actual
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
                {availability.slots.some((s) => s.overflow) && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-300">
                    <CalendarX className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Algunos horarios están bloqueados porque el servicio dura{" "}
                      {packageMinutes} min ({bookingNumberSlot} horario
                      {bookingNumberSlot > 1 ? "s" : ""} seguido
                      {bookingNumberSlot > 1 ? "s" : ""}) y uno de los horarios
                      siguientes ya alcanzó el máximo de{" "}
                      {availability.maxParallel ?? 1} reservación
                      {(availability.maxParallel ?? 1) > 1 ? "es" : ""}. Necesitas un
                      bloque libre que cubra toda la duración.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No hay horarios disponibles.</p>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="adminNotes">Notas internas (opcional)</Label>
              <Textarea
                id="adminNotes"
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Motivo del cambio, comentarios, etc."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} variant="premium" disabled={submitting || !slot}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
