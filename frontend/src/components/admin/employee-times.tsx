"use client";

import * as React from "react";
import { Timer, Car, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeTimesAction } from "@/actions/admin";
import type { EmployeeTimes as EmployeeTimesData } from "@/lib/strapi/admin";

/** Hoy + los 7 días anteriores. Etiquetas relativas: no dependen de la zona horaria. */
const DAY_OPTIONS = [
  { value: "0", label: "Hoy" },
  { value: "1", label: "Ayer" },
  { value: "2", label: "Hace 2 días" },
  { value: "3", label: "Hace 3 días" },
  { value: "4", label: "Hace 4 días" },
  { value: "5", label: "Hace 5 días" },
  { value: "6", label: "Hace 6 días" },
  { value: "7", label: "Hace 7 días" },
];

/**
 * Límites del día en la zona horaria del navegador. El backend recibe instantes,
 * así que el "día" es el de quien mira y no el del servidor (que corre en UTC).
 */
function dayBounds(offset: number): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** 4520 → "1 h 15 min". Para lavados el minuto es la unidad útil. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function EmployeeTimesPanel() {
  const [day, setDay] = React.useState("0");
  const [data, setData] = React.useState<EmployeeTimesData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const load = React.useCallback((offset: number) => {
    const { from, to } = dayBounds(offset);
    startTransition(async () => {
      const res = await employeeTimesAction(from, to);
      if (res.ok) {
        setData(res.data ?? null);
        setError(null);
      } else {
        setError(res.error);
        setData(null);
      }
    });
  }, []);

  // Los límites del día solo se pueden calcular en el navegador, así que la
  // primera carga ocurre al montar y no en el server component.
  React.useEffect(() => {
    load(0);
  }, [load]);

  function onDayChange(value: string) {
    setDay(value);
    load(Number(value));
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Tiempo por auto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo cuenta el tiempo que el auto estuvo en{" "}
            <span className="font-medium text-foreground">Trabajando</span>.
            {data && ` — ${formatDayLabel(data.from)}`}
          </p>
        </div>
        <Select value={day} onValueChange={onDayChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-6">
        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p>{error}</p>
          </div>
        ) : isPending && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !data || data.totals.cars === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No se terminó ningún lavado ese día.
            {!!data?.stillRunning && ` (${data.stillRunning} sigue en el tablero sin cerrar)`}
          </p>
        ) : (
          <div className={isPending ? "space-y-6 opacity-60 transition-opacity" : "space-y-6"}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniStat icon={Car} label="Autos terminados" value={String(data.totals.cars)} />
              <MiniStat icon={Timer} label="Tiempo total" value={formatDuration(data.totals.totalSeconds)} />
              <MiniStat icon={Timer} label="Promedio por auto" value={formatDuration(data.totals.avgSeconds)} />
            </div>

            {data.stillRunning > 0 && (
              <p className="text-xs text-muted-foreground">
                {data.stillRunning} auto{data.stillRunning === 1 ? "" : "s"} empezó ese día y sigue
                sin marcarse como terminado, así que no cuenta en estos totales.
              </p>
            )}

            <EmployeeSummary groups={data.byEmployee} />
            <CarDetail rows={data.rows} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function EmployeeSummary({ groups }: { groups: EmployeeTimesData["byEmployee"] }) {
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Resumen por empleado</h3>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium text-right">Autos</th>
              <th className="px-4 py-3 font-medium text-right">Tiempo total</th>
              <th className="px-4 py-3 font-medium text-right">Promedio</th>
              <th className="px-4 py-3 font-medium text-right">Más rápido</th>
              <th className="px-4 py-3 font-medium text-right">Más lento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {groups.map((g) => (
              <tr key={g.id ?? "unassigned"} className={g.id === null ? "bg-amber-500/5" : undefined}>
                <td className="px-4 py-3 font-medium">{g.name}</td>
                <td className="px-4 py-3 text-right font-mono">{g.cars}</td>
                <td className="px-4 py-3 text-right font-mono">{formatDuration(g.totalSeconds)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatDuration(g.avgSeconds)}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">
                  {g.fastestSeconds === null ? "—" : formatDuration(g.fastestSeconds)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-amber-300">
                  {g.slowestSeconds === null ? "—" : formatDuration(g.slowestSeconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {groups.map((g) => (
          <div
            key={g.id ?? "unassigned"}
            className={`space-y-3 rounded-lg border p-4 ${
              g.id === null ? "border-amber-500/30 bg-amber-500/5" : "border-border/50 bg-card/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 truncate font-medium">{g.name}</p>
              <Badge variant="outline" className="shrink-0">
                {g.cars} auto{g.cars === 1 ? "" : "s"}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Tiempo total" value={formatDuration(g.totalSeconds)} />
              <Field label="Promedio" value={formatDuration(g.avgSeconds)} />
              <Field
                label="Más rápido"
                value={g.fastestSeconds === null ? "—" : formatDuration(g.fastestSeconds)}
              />
              <Field
                label="Más lento"
                value={g.slowestSeconds === null ? "—" : formatDuration(g.slowestSeconds)}
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function CarDetail({ rows }: { rows: EmployeeTimesData["rows"] }) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Detalle auto por auto</h3>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Auto</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium text-right">Duración</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatClock(r.startedAt)} → {formatClock(r.finishedAt)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.vehicle}</p>
                  {r.package && <p className="text-xs text-muted-foreground">{r.package}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.customer ?? "—"}</td>
                <td className="px-4 py-3">{r.employee?.name ?? "Sin acreditar"}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {formatDuration(r.seconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="space-y-2 rounded-lg border border-border/50 bg-card/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 truncate font-medium">{r.vehicle}</p>
              <span className="shrink-0 font-mono text-sm font-semibold">
                {formatDuration(r.seconds)}
              </span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {formatClock(r.startedAt)} → {formatClock(r.finishedAt)}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Field label="Empleado" value={r.employee?.name ?? "Sin acreditar"} />
              <Field label="Cliente" value={r.customer ?? "—"} />
            </dl>
            {r.package && <p className="text-xs text-muted-foreground">{r.package}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
