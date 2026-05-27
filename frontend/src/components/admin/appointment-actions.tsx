"use client";

import * as React from "react";
import { Check, X, CheckCircle2, CalendarSync } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAppointmentStatusAction } from "@/actions/appointments";
import { useRouter } from "next/navigation";
import type { Appointment, AppointmentStatus, BusinessHour, ClosedDate } from "@/types/models";
import { RescheduleDialog } from "./reschedule-dialog";

export function AppointmentActions({
  appointment,
  businessHours,
  closedDates,
}: {
  appointment: Appointment;
  businessHours: BusinessHour[];
  closedDates: ClosedDate[];
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

  const isFinal = status === "completed" || status === "cancelled";

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
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
