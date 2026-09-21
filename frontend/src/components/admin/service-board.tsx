"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, CheckCircle2, X, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  startServiceAction,
  finishServiceAction,
  cancelServiceAction,
  revertServiceToWaitingAction,
} from "@/actions/qr";
import { ChargeDialog } from "@/components/admin/charge-dialog";
import { ServiceExtrasDialog } from "@/components/admin/service-extras-dialog";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { formatTime } from "@/lib/business-hours";
import { vehicleTypeLabel } from "@/lib/pricing";
import type { ExtraService, Service, VehicleTypeDef } from "@/types/models";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

export interface AdminOption {
  id: number;
  name: string;
}

interface ServiceBoardProps {
  waiting: Service[];
  inProgress: Service[];
  toPay: Service[];
  /** Personal del mostrador para el selector "¿Quién lo lava?". */
  admins?: AdminOption[];
  /** Catálogo de servicios extra activos, para el botón "Extras" de cada auto. */
  extraServices?: ExtraService[];
}

function describeAuto(s: Service, types?: VehicleTypeDef[]): string {
  if (s.vehicle) return `${s.vehicle.brand} ${s.vehicle.model} · ${s.vehicle.plate || "—"}`;
  if (s.vehicleType) {
    return `${vehicleTypeLabel(s.vehicleType, types)}${s.isUberTaxi ? " · Uber/Taxi" : ""}`;
  }
  return "—";
}

function describeCliente(s: Service): string {
  if (s.isWalkIn) return s.customerName || "Sin nombre";
  return s.user?.name ?? s.user?.email ?? "—";
}

/** Duración legible entre startedAt y finishedAt (o hasta ahora si sigue en curso). */
function formatDuration(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  const mins = Math.max(0, Math.round((to - from) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function ServiceBoard({
  waiting,
  inProgress,
  toPay,
  admins = [],
  extraServices = [],
}: ServiceBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Column title="En espera" tone="neutral" count={waiting.length} empty="Sin autos en espera.">
        {waiting.map((s) => (
          <WaitingCard key={s.id} service={s} admins={admins} catalog={extraServices} />
        ))}
      </Column>

      <Column title="Trabajando" tone="info" count={inProgress.length} empty="Nadie lavando ahora.">
        {inProgress.map((s) => (
          <InProgressCard key={s.id} service={s} catalog={extraServices} />
        ))}
      </Column>

      <Column title="Por cobrar" tone="warn" count={toPay.length} empty="Nada pendiente de cobro.">
        {toPay.map((s) => (
          <ToPayCard key={s.id} service={s} />
        ))}
      </Column>
    </div>
  );
}

function Column({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: "neutral" | "info" | "warn";
  empty: string;
  children: React.ReactNode;
}) {
  const hasItems = React.Children.count(children) > 0;
  const dot =
    tone === "info" ? "bg-blue-500" : tone === "warn" ? "bg-amber-500" : "bg-muted-foreground";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
        <Badge variant="outline" className="ml-auto">{count}</Badge>
      </div>
      {hasItems ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">{empty}</CardContent>
        </Card>
      )}
    </div>
  );
}

/** Encabezado común de cada tarjeta: cliente, auto, paquete, extras, total. */
function ServiceSummary({ service: s }: { service: Service }) {
  const vehicleTypes = useVehicleTypes();

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        {/* div y no p: Badge renderiza un <div>, que no es válido dentro de <p>. */}
        <div className="flex flex-wrap items-center gap-1 font-medium">
          {s.isWalkIn && <Badge variant="info" className="text-[10px]">Visitante</Badge>}
          {s.appointment && (
            <Badge variant="warning" className="text-[10px]">
              Cita {formatTime(s.appointment.timeSlot)}
            </Badge>
          )}
          {describeCliente(s)}
        </div>
        <span className="font-mono text-sm">{formatPrice(s.totalAmount)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{describeAuto(s, vehicleTypes)}</p>
      <p className="text-xs">{s.package?.name ?? "—"}</p>
      {s.extraServices && s.extraServices.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {s.extraServices.map((e) => (
            <Badge key={e.id} variant="outline" className="text-[10px]">{e.name}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Devuelve un lavado a la fila. Para cuando se asignó al empleado equivocado o
 * el trabajo se detuvo (se acabó un material): el servicio no se pierde, vuelve
 * a "En espera" y se puede volver a tomar. El backend limpia quién lo lavaba y
 * la hora de inicio, para no acreditarle a nadie un tiempo que no trabajó.
 */
function BackToWaitingButton({ serviceId, disabled }: { serviceId: number; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onRevert() {
    if (!window.confirm("¿Regresar este lavado a la fila de espera?")) return;
    const reason = window.prompt("Motivo (opcional): empleado equivocado, falta material…") ?? undefined;
    setLoading(true);
    const res = await revertServiceToWaitingAction(serviceId, reason?.trim() || undefined);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("El lavado volvió a la fila de espera");
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      onClick={onRevert}
      disabled={loading || disabled}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
      Regresar a espera
    </Button>
  );
}

/** Botón de cancelar reutilizable: pide un motivo opcional y cancela el servicio. */
function CancelButton({ serviceId }: { serviceId: number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onCancel() {
    if (!window.confirm("¿Cancelar este servicio? No se sumará a fidelidad.")) return;
    const reason = window.prompt("Motivo (opcional):") ?? undefined;
    setLoading(true);
    const res = await cancelServiceAction(serviceId, reason?.trim() || undefined);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Servicio cancelado");
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="w-full text-destructive hover:text-destructive"
      onClick={onCancel}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      Cancelar
    </Button>
  );
}

function CreditSelect({
  admins,
  value,
  onChange,
}: {
  admins: AdminOption[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
    >
      <option value="">Selecciona quién lo lava…</option>
      {admins.map((a) => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  );
}

/**
 * Un auto pasa a "Trabajando" solo con el nombre de quien lo lava: el selector
 * arranca vacío y "Iniciar lavado" se habilita al elegir a alguien. Ese nombre
 * es el que acumula lavados y ganancias en el panel de empleados.
 *
 * Si la lista de personal no cargó (permiso sin sembrar, Strapi caído), no se
 * bloquea la operación: se avisa y el lavado se acredita a quien lo inicia.
 */
function WaitingCard({
  service: s,
  admins,
  catalog,
}: {
  service: Service;
  admins: AdminOption[];
  catalog: ExtraService[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [creditId, setCreditId] = React.useState<number | null>(null);
  const staffLoaded = admins.length > 0;
  const canStart = !loading && (!staffLoaded || creditId !== null);

  async function onStart() {
    setLoading(true);
    const res = await startServiceAction(s.id, creditId ?? undefined);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Lavado iniciado");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ServiceSummary service={s} />
        <div>
          <p className="mb-1 text-[10px] uppercase text-muted-foreground">¿Quién lo lava?</p>
          {staffLoaded ? (
            <CreditSelect admins={admins} value={creditId} onChange={setCreditId} />
          ) : (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
              No se pudo cargar la lista de empleados. El lavado se acreditará a tu usuario.
            </p>
          )}
        </div>
        <Button size="sm" className="w-full" onClick={onStart} disabled={!canStart}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Iniciar lavado
        </Button>
        <ServiceExtrasDialog service={s} catalog={catalog} />
        <CancelButton serviceId={s.id} />
      </CardContent>
    </Card>
  );
}

function InProgressCard({ service: s, catalog }: { service: Service; catalog: ExtraService[] }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onFinish() {
    setLoading(true);
    const res = await finishServiceAction(s.id);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Lavado terminado — pasa a cobro");
    router.refresh();
  }

  const elapsed = formatDuration(s.startedAt);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ServiceSummary service={s} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {s.performedBy && <span>Lava: {s.performedBy.name ?? s.performedBy.email}</span>}
          {s.startedAt && <span>Inició: {formatDateTime(s.startedAt)}</span>}
          {elapsed && <span>· {elapsed}</span>}
        </div>
        <Button size="sm" variant="secondary" className="w-full" onClick={onFinish} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Terminar lavado
        </Button>
        <ServiceExtrasDialog service={s} catalog={catalog} />
        <BackToWaitingButton serviceId={s.id} disabled={loading} />
        <CancelButton serviceId={s.id} />
      </CardContent>
    </Card>
  );
}

function ToPayCard({ service: s }: { service: Service }) {
  const duration = formatDuration(s.startedAt, s.finishedAt);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ServiceSummary service={s} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {s.performedBy && <span>Lavó: {s.performedBy.name ?? s.performedBy.email}</span>}
          {duration && <span>Duración: {duration}</span>}
        </div>
        {/* El cobro abre un diálogo para elegir promoción y descuento. */}
        <ChargeDialog service={s} />
        <CancelButton serviceId={s.id} />
      </CardContent>
    </Card>
  );
}
