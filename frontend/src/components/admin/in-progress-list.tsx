"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeServiceAction } from "@/actions/qr";
import { formatDate, formatPrice } from "@/lib/utils";
import { vehicleTypeLabel } from "@/lib/pricing";
import type { Service } from "@/types/models";

export function InProgressList({ services }: { services: Service[] }) {
  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No hay servicios en progreso. Los servicios nuevos aparecerán aquí hasta que
          los marques como completados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop: tabla */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Auto</th>
                <th className="px-4 py-3 font-medium">Paquete</th>
                <th className="px-4 py-3 font-medium">Extras</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {services.map((s) => (
                <Row key={s.id} service={s} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="divide-y divide-border/40 md:hidden">
          {services.map((s) => (
            <MobileCard key={s.id} service={s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function describeAuto(s: Service): string {
  if (s.vehicle) {
    return `${s.vehicle.brand} ${s.vehicle.model} · ${s.vehicle.plate || "—"}`;
  }
  if (s.vehicleType) {
    return `${vehicleTypeLabel(s.vehicleType)}${s.isUberTaxi ? " · Uber/Taxi" : ""}`;
  }
  return "—";
}

function describeCliente(s: Service): string {
  if (s.isWalkIn) return s.customerName || "Sin nombre";
  return s.user?.name ?? s.user?.email ?? "—";
}

function Row({ service: s }: { service: Service }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onComplete() {
    setLoading(true);
    const res = await completeServiceAction(s.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data?.promotionGenerated) {
      toast.success("🎉 ¡Servicio completado y promoción generada para el cliente!", {
        duration: 6000,
      });
    } else if (s.isWalkIn) {
      toast.success("Servicio walk-in completado");
    } else {
      toast.success("Servicio completado y visita registrada");
    }
    router.refresh();
  }

  return (
    <tr>
      <td className="px-4 py-3">{formatDate(s.date)}</td>
      <td className="px-4 py-3">
        {s.isWalkIn && (
          <Badge variant="info" className="mr-1 text-[10px]">Walk-in</Badge>
        )}
        {describeCliente(s)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{describeAuto(s)}</td>
      <td className="px-4 py-3">{s.package?.name ?? "—"}</td>
      <td className="px-4 py-3">
        {s.extraServices && s.extraServices.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {s.extraServices.map((e) => (
              <Badge key={e.id} variant="outline" className="text-[10px]">
                {e.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono">{formatPrice(s.totalAmount)}</td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="premium" onClick={onComplete} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Completar
        </Button>
      </td>
    </tr>
  );
}

function MobileCard({ service: s }: { service: Service }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onComplete() {
    setLoading(true);
    const res = await completeServiceAction(s.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data?.promotionGenerated) {
      toast.success("🎉 ¡Servicio completado y promoción generada!", { duration: 6000 });
    } else if (s.isWalkIn) {
      toast.success("Servicio walk-in completado");
    } else {
      toast.success("Servicio completado y visita registrada");
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {s.isWalkIn && (
              <Badge variant="info" className="text-[10px]">Walk-in</Badge>
            )}
            <p className="truncate font-medium">{describeCliente(s)}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{describeAuto(s)}</p>
        </div>
        <p className="shrink-0 font-mono text-base font-semibold">{formatPrice(s.totalAmount)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Fecha</dt>
          <dd>{formatDate(s.date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paquete</dt>
          <dd className="truncate">{s.package?.name ?? "—"}</dd>
        </div>
      </dl>
      {s.extraServices && s.extraServices.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {s.extraServices.map((e) => (
            <Badge key={e.id} variant="outline" className="text-[10px]">
              {e.name}
            </Badge>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="premium"
        onClick={onComplete}
        disabled={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Completar
      </Button>
    </div>
  );
}
