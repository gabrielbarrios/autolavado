"use client";

// Componente de cliente: lee el catálogo de tipos de auto del contexto
// (`useVehicleTypes`) para etiquetar el auto. Lo renderizan páginas de servidor
// (/perfil, /qr, /mi-auto) pasándole datos ya serializados.
import Link from "next/link";
import { Clock, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { vehicleTypeLabel } from "@/lib/pricing";
import type { Service, ServiceStatus, VehicleTypeDef } from "@/types/models";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

/**
 * Seguimiento del auto para el cliente. Espeja el tablero del admin
 * (/en-progreso) pero con etiqueta de cara al cliente: el estado interno
 * "to_pay" (Por cobrar en caja) aquí se muestra como "Completado", porque
 * para el cliente el lavado ya terminó y solo falta pasar a pagar.
 */
const STEPS = [
  { status: "waiting", label: "En espera", icon: Clock, hint: "Tu auto está en fila." },
  { status: "in_progress", label: "Trabajando", icon: Sparkles, hint: "Lo estamos lavando." },
  { status: "to_pay", label: "Completado", icon: CheckCircle2, hint: "Listo — pasa a caja a pagar." },
] as const satisfies ReadonlyArray<{
  status: ServiceStatus;
  label: string;
  icon: typeof Clock;
  hint: string;
}>;

function stepIndex(status?: ServiceStatus): number {
  const i = STEPS.findIndex((s) => s.status === status);
  return i === -1 ? 0 : i;
}

function describeAuto(s: Service, types?: VehicleTypeDef[]): string {
  if (s.vehicle) return `${s.vehicle.brand} ${s.vehicle.model}${s.vehicle.plate ? ` · ${s.vehicle.plate}` : ""}`;
  if (s.vehicleType) return vehicleTypeLabel(s.vehicleType, types);
  return "Tu auto";
}

/**
 * `failed` distingue "la consulta falló" de "no hay nada en curso". Antes ambos
 * casos renderizaban `null`, así que un error de permisos era indistinguible de
 * un cliente sin servicios y el seguimiento simplemente desaparecía sin pistas.
 */
export function ServiceTracker({
  services,
  failed = false,
}: {
  services: Service[];
  failed?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {services.length > 1 ? "Tus autos ahora" : "Tu auto ahora"}
        </h2>
        {services.length > 0 && <Badge variant="info">{services.length} en curso</Badge>}
      </div>

      {failed ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 p-6 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="font-medium">No pudimos consultar el estado de tu auto.</p>
              <p className="text-muted-foreground">
                Vuelve a intentar en un momento o pregunta en recepción.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-8 text-center text-sm">
            <p className="font-medium">No tienes ningún lavado en curso.</p>
            <p className="text-muted-foreground">
              Cuando el personal registre tu auto con{" "}
              <Link href="/qr" className="font-medium text-primary hover:underline">
                tu QR
              </Link>
              , el avance aparecerá aquí solo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {services.map((s) => (
            <ServiceTrackerCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceTrackerCard({ service: s }: { service: Service }) {
  const vehicleTypes = useVehicleTypes();
  const active = stepIndex(s.status);
  const current = STEPS[active];

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-blue-500/10 via-card to-cyan-500/5">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{describeAuto(s, vehicleTypes)}</p>
            <p className="text-xs text-muted-foreground">
              {s.package?.name ?? "Servicio"} · {formatPrice(s.totalAmount)}
            </p>
          </div>
          <Badge variant={active === 2 ? "success" : active === 1 ? "info" : "warning"}>
            {current.label}
          </Badge>
        </div>

        <ol className="flex items-start gap-2">
          {STEPS.map((step, i) => {
            const done = i < active;
            const isCurrent = i === active;
            const Icon = step.icon;
            return (
              <li key={step.status} className="flex flex-1 flex-col items-center gap-2 text-center">
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : done || isCurrent ? "bg-primary" : "bg-muted"}`}
                  />
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isCurrent ? "animate-pulse" : ""}`} />
                  </span>
                  <span
                    className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "bg-transparent" : done ? "bg-primary" : "bg-muted"}`}
                  />
                </div>
                <span
                  className={`text-[11px] leading-tight ${
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="text-foreground">{current.hint}</p>
          {s.startedAt && <p>Inició: {formatDateTime(s.startedAt)}</p>}
          {s.finishedAt && <p>Terminó: {formatDateTime(s.finishedAt)}</p>}
          {s.extraServices && s.extraServices.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {s.extraServices.map((e) => (
                <Badge key={e.id} variant="outline" className="text-[10px]">
                  {e.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
