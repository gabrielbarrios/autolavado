"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, CheckCircle2, CalendarSync, CarFront, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setAppointmentStatusAction } from "@/actions/appointments";
import { sendAppointmentToBoardAction } from "@/actions/qr";
import { useRouter } from "next/navigation";
import type { Appointment, AppointmentStatus, BusinessHour, ClosedDate } from "@/types/models";
import { RescheduleDialog } from "./reschedule-dialog";

export function AppointmentActions({
  appointment,
  businessHours,
  closedDates,
  onBoard = false,
}: {
  appointment: Appointment;
  businessHours: BusinessHour[];
  closedDates: ClosedDate[];
  /** La reservación ya tiene un service vivo en /en-progreso. */
  onBoard?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [openReschedule, setOpenReschedule] = React.useState(false);
  const { id, status } = appointment;

  async function setStatus(next: AppointmentStatus) {
    setLoading(next);
    const res = await setAppointmentStatusAction(id, next);
    setLoading(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Actualizado");
    router.refresh();
  }

  async function sendToBoard() {
    setLoading("board");
    const res = await sendAppointmentToBoardAction(id);
    setLoading(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Mandado al tablero — un empleado ya puede iniciar el lavado");
    router.refresh();
  }

  const isFinal = status === "completed" || status === "cancelled";
  // Sólo tiene sentido adelantar al tablero si hay auto y paquete: son los datos
  // que el service necesita para calcular el precio y que el empleado sepa qué lavar.
  const canSendToBoard = !isFinal && !onBoard && !!appointment.vehicle && !!appointment.package;

  if (onBoard) {
    return (
      <div className="flex justify-end">
        <Link href="/en-progreso">
          <Badge variant="info" className="cursor-pointer gap-1 hover:opacity-80">
            <CarFront className="h-3 w-3" /> En el tablero
          </Badge>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
        {canSendToBoard && (
          <Button
            size="sm"
            variant="secondary"
            onClick={sendToBoard}
            disabled={!!loading}
            title="El cliente llegó antes y hay cupo: mándalo al tablero para que un empleado inicie el lavado"
          >
            {loading === "board" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CarFront className="h-3.5 w-3.5" />
            )}{" "}
            Al tablero
          </Button>
        )}
        {status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus("approved")}
            disabled={!!loading}
          >
            <Check className="h-3.5 w-3.5" /> Aprobar
          </Button>
        )}
        {status === "approved" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus("completed")}
            disabled={!!loading}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Completar
          </Button>
        )}
        {!isFinal && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpenReschedule(true)}
            disabled={!!loading}
            title="Re-agendar"
          >
            <CalendarSync className="h-3.5 w-3.5" />
          </Button>
        )}
        {!isFinal && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatus("cancelled")}
            disabled={!!loading}
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {isFinal && <span className="text-xs text-muted-foreground">—</span>}
      </div>

      {!isFinal && (
        <RescheduleDialog
          appointment={appointment}
          businessHours={businessHours}
          closedDates={closedDates}
          open={openReschedule}
          onOpenChange={setOpenReschedule}
        />
      )}
    </>
  );
}
