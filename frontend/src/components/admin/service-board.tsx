"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  startServiceAction,
  finishServiceAction,
  cancelServiceAction,
} from "@/actions/qr";
import { ChargeDialog } from "@/components/admin/charge-dialog";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { formatTime } from "@/lib/business-hours";
import { vehicleTypeLabel } from "@/lib/pricing";
import type { Service, VehicleTypeDef } from "@/types/models";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

export interface AdminOption {
  id: number;
  name: string;
}

interface ServiceBoardProps {
  waiting: Service[];
  inProgress: Service[];
  toPay: Service[];
  isSuperAdmin?: boolean;
  admins?: AdminOption[];
  currentUserId?: number | null;
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
  isSuperAdmin = false,
  admins = [],
  currentUserId = null,
}: ServiceBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Column title="En espera" tone="neutral" count={waiting.length} empty="Sin autos en espera.">
        {waiting.map((s) => (
          <WaitingCard
            key={s.id}
            service={s}
            isSuperAdmin={isSuperAdmin}
            admins={admins}
            currentUserId={currentUserId}
          />
        ))}
      </Column>

      <Column title="Trabajando" tone="info" count={inProgress.length} empty="Nadie lavando ahora.">
        {inProgress.map((s) => (
          <InProgressCard key={s.id} service={s} />
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
          {s.isWalkIn && <Badge variant="info" className="text-[10px]">Walk-in</Badge>}
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
  onChange: (id: number) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
    >
      {admins.map((a) => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  );
}

function WaitingCard({
  service: s,
  isSuperAdmin,
  admins,
  currentUserId,
}: {
  service: Service;
  isSuperAdmin: boolean;
  admins: AdminOption[];
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [creditId, setCreditId] = React.useState<number | null>(currentUserId);

  async function onStart() {
    setLoading(true);
    const res = await startServiceAction(s.id, isSuperAdmin ? creditId ?? undefined : undefined);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Lavado iniciado");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ServiceSummary service={s} />
        {isSuperAdmin && (
          <div>
            <p className="mb-1 text-[10px] uppercase text-muted-foreground">Acreditar a</p>
            <CreditSelect admins={admins} value={creditId} onChange={setCreditId} />
          </div>
        )}
        <Button size="sm" className="w-full" onClick={onStart} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Iniciar lavado
        </Button>
        <CancelButton serviceId={s.id} />
      </CardContent>
    </Card>
  );
}

function InProgressCard({ service: s }: { service: Service }) {
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
