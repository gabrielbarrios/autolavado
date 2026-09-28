"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DollarSign, Sparkles, Receipt, Percent, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeEarningsAction } from "@/actions/admin";
import type { EarningsGranularity, EmployeeEarnings } from "@/lib/strapi/admin";
import { formatPrice } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Periodos                                                            */
/* ------------------------------------------------------------------ */

const GRANULARITY_OPTIONS: { value: EarningsGranularity; label: string }[] = [
  { value: "day", label: "Por día" },
  { value: "week", label: "Por semana" },
  { value: "month", label: "Por mes" },
];

/**
 * Presets por granularidad. Cada uno devuelve la ventana [from, to) en la
 * zona horaria del navegador; "custom" usa los dos inputs de fecha.
 */
const PRESETS: Record<EarningsGranularity, { value: string; label: string }[]> = {
  day: [
    { value: "today", label: "Hoy" },
    { value: "yesterday", label: "Ayer" },
    { value: "last7", label: "Últimos 7 días" },
    { value: "last30", label: "Últimos 30 días" },
    { value: "custom", label: "Rango personalizado" },
  ],
  week: [
    { value: "thisWeek", label: "Esta semana" },
    { value: "lastWeek", label: "Semana pasada" },
    { value: "last4w", label: "Últimas 4 semanas" },
    { value: "last12w", label: "Últimas 12 semanas" },
    { value: "custom", label: "Rango personalizado" },
  ],
  month: [
    { value: "thisMonth", label: "Este mes" },
    { value: "lastMonth", label: "Mes pasado" },
    { value: "last6m", label: "Últimos 6 meses" },
    { value: "last12m", label: "Últimos 12 meses" },
    { value: "custom", label: "Rango personalizado" },
  ],
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lunes de la semana de `d`. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** YYYY-MM-DD local, para los inputs type="date". */
function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Interpreta YYYY-MM-DD como fecha local (new Date("YYYY-MM-DD") sería UTC). */
function fromInputDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function presetBounds(preset: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "yesterday":
      return { from: addDays(today, -1), to: today };
    case "last7":
      return { from: addDays(today, -6), to: addDays(today, 1) };
    case "last30":
      return { from: addDays(today, -29), to: addDays(today, 1) };
    case "thisWeek": {
      const from = startOfWeek(now);
      return { from, to: addDays(from, 7) };
    }
    case "lastWeek": {
      const to = startOfWeek(now);
      return { from: addDays(to, -7), to };
    }
    case "last4w":
      return { from: addDays(startOfWeek(now), -21), to: addDays(startOfWeek(now), 7) };
    case "last12w":
      return { from: addDays(startOfWeek(now), -77), to: addDays(startOfWeek(now), 7) };
    case "thisMonth": {
      const from = startOfMonth(now);
      return { from, to: addMonths(from, 1) };
    }
    case "lastMonth": {
      const to = startOfMonth(now);
      return { from: addMonths(to, -1), to };
    }
    case "last6m":
      return { from: addMonths(startOfMonth(now), -5), to: addMonths(startOfMonth(now), 1) };
    case "last12m":
      return { from: addMonths(startOfMonth(now), -11), to: addMonths(startOfMonth(now), 1) };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Etiqueta corta del periodo para el eje y las tablas. */
function bucketLabel(key: string, granularity: EarningsGranularity): string {
  const d = fromInputDate(key);
  if (!d) return key;
  if (granularity === "month") return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  if (granularity === "week") {
    const end = addDays(d, 6);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Etiqueta larga (tooltip y tabla). */
function bucketLongLabel(key: string, granularity: EarningsGranularity): string {
  const d = fromInputDate(key);
  if (!d) return key;
  if (granularity === "month") {
    return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  }
  if (granularity === "week") {
    const end = addDays(d, 6);
    const f = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    return `Semana del ${f(d)} al ${f(end)}`;
  }
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

function rangeLabel(fromISO: string, toISO: string): string {
  const f = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const from = new Date(fromISO);
  // `to` es exclusivo: el último día incluido es el anterior.
  const last = addDays(new Date(toISO), -1);
  return from.getTime() >= last.getTime() ? f(from) : `${f(from)} – ${f(last)}`;
}

/* Paleta para las barras apiladas por empleado. */
const SERIES_COLORS = ["#22c55e", "#38bdf8", "#f59e0b", "#a78bfa", "#f472b6", "#2dd4bf", "#fb7185", "#facc15"];
const UNASSIGNED_COLOR = "#78716c";

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function EmployeeEarningsPanel() {
  const [granularity, setGranularity] = React.useState<EarningsGranularity>("day");
  const [preset, setPreset] = React.useState("last7");
  const [customFrom, setCustomFrom] = React.useState(() => toInputDate(addDays(startOfDay(new Date()), -6)));
  const [customTo, setCustomTo] = React.useState(() => toInputDate(new Date()));
  const [data, setData] = React.useState<EmployeeEarnings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const load = React.useCallback((g: EarningsGranularity, from: Date, to: Date) => {
    startTransition(async () => {
      const res = await employeeEarningsAction(
        from.toISOString(),
        to.toISOString(),
        g,
        new Date().getTimezoneOffset(),
      );
      if (res.ok) {
        setData(res.data ?? null);
        setError(null);
      } else {
        setError(res.error);
        setData(null);
      }
    });
  }, []);

  // La ventana depende de la zona horaria del navegador: se carga al montar.
  React.useEffect(() => {
    const b = presetBounds("last7");
    if (b) load("day", b.from, b.to);
  }, [load]);

  function applyPreset(g: EarningsGranularity, p: string) {
    if (p === "custom") return applyCustom(g);
    const b = presetBounds(p);
    if (b) load(g, b.from, b.to);
  }

  function applyCustom(g: EarningsGranularity) {
    const from = fromInputDate(customFrom);
    const toDay = fromInputDate(customTo);
    if (!from || !toDay) {
      setError("Elige una fecha de inicio y una de fin.");
      return;
    }
    if (toDay < from) {
      setError("La fecha de fin debe ser igual o posterior a la de inicio.");
      return;
    }
    // `to` exclusivo: el día de fin se incluye completo.
    load(g, from, addDays(toDay, 1));
  }

  function onGranularityChange(value: string) {
    const g = value as EarningsGranularity;
    setGranularity(g);
    // Cada granularidad tiene su preset "natural" por defecto.
    const first = preset === "custom" ? "custom" : PRESETS[g][2].value;
    setPreset(first);
    applyPreset(g, first);
  }

  function onPresetChange(value: string) {
    setPreset(value);
    applyPreset(granularity, value);
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <CardTitle>Ganancias por periodo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo servicios cobrados; el monto es lo que realmente entró después de descuentos.
            {data && ` — ${rangeLabel(data.from, data.to)}`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="earn-granularity">Ver</Label>
            <Select value={granularity} onValueChange={onGranularityChange}>
              <SelectTrigger id="earn-granularity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANULARITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="earn-preset">Periodo</Label>
            <Select value={preset} onValueChange={onPresetChange}>
              <SelectTrigger id="earn-preset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS[granularity].map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="earn-from">Desde</Label>
                <Input
                  id="earn-from"
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="earn-to">Hasta</Label>
                  <Input
                    id="earn-to"
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={toInputDate(new Date())}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={() => applyCustom(granularity)} disabled={isPending}>
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>
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
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !data ? null : data.totals.washes === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No se cobró ningún servicio en este periodo.
          </p>
        ) : (
          <div className={isPending ? "space-y-6 opacity-60 transition-opacity" : "space-y-6"}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MiniStat icon={DollarSign} label="Ganancias" value={formatPrice(data.totals.earnings)} />
              <MiniStat icon={Sparkles} label="Lavados cobrados" value={String(data.totals.washes)} />
              <MiniStat icon={Receipt} label="Ticket promedio" value={formatPrice(data.totals.avgTicket)} />
              <MiniStat
                icon={Percent}
                label="Descuentos"
                value={formatPrice(data.totals.promotionDiscount + data.totals.manualDiscount)}
                hint={
                  data.totals.subtotal > 0
                    ? `${Math.round(((data.totals.promotionDiscount + data.totals.manualDiscount) / data.totals.subtotal) * 100)}% del subtotal`
                    : undefined
                }
              />
            </div>

            <EarningsChart data={data} />
            <EmployeeTable rows={data.byEmployee} />
            <PeriodTable data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold tracking-tight">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Barras apiladas: una serie por empleado, un bucket por periodo. */
function EarningsChart({ data }: { data: EmployeeEarnings }) {
  const { series, byEmployee, granularity } = data;

  const employees = byEmployee.map((e, i) => ({
    key: e.id === null ? "unassigned" : String(e.id),
    name: e.name,
    color: e.id === null ? UNASSIGNED_COLOR : SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  const chartData = series.map((b) => {
    const row: Record<string, string | number> = {
      periodo: bucketLabel(b.key, granularity),
      key: b.key,
    };
    for (const e of employees) row[e.key] = Number((b.byEmployee[e.key] ?? 0).toFixed(2));
    return row;
  });

  // Muchos buckets (p. ej. 30 días) en móvil: mostrar solo algunas etiquetas.
  const interval = series.length > 14 ? Math.ceil(series.length / 8) - 1 : 0;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Ganancias por {granularity === "day" ? "día" : granularity === "week" ? "semana" : "mes"}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" interval={interval} />
            <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              formatter={(value: number, name: string) => [formatPrice(value), name]}
              labelFormatter={(_label, payload) => {
                const key = payload?.[0]?.payload?.key as string | undefined;
                return key ? bucketLongLabel(key, granularity) : String(_label);
              }}
              contentStyle={{
                background: "#0b0b0c",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {employees.map((e, i) => (
              <Bar
                key={e.key}
                dataKey={e.key}
                name={e.name}
                stackId="earnings"
                fill={e.color}
                radius={i === employees.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function roleLabel(role: string | null): string | null {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "employee") return "Empleado";
  return null;
}

function EmployeeTable({ rows }: { rows: EmployeeEarnings["byEmployee"] }) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Por empleado</h3>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium text-right">Lavados</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
              <th className="px-4 py-3 font-medium text-right">Descuentos</th>
              <th className="px-4 py-3 font-medium text-right">Ganancias</th>
              <th className="px-4 py-3 font-medium text-right">Ticket prom.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((r) => (
              <tr key={r.id ?? "unassigned"} className={r.id === null ? "bg-amber-500/5" : undefined}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={r.id === null ? "font-medium text-amber-800 dark:text-amber-200" : "font-medium"}>
                      {r.name}
                    </span>
                    {roleLabel(r.role) && (
                      <Badge variant={r.role === "superadmin" ? "default" : "outline"} className="text-[10px]">
                        {roleLabel(r.role)}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{r.washes}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatPrice(r.subtotal)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {r.promotionDiscount + r.manualDiscount > 0
                    ? `−${formatPrice(r.promotionDiscount + r.manualDiscount)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatPrice(r.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(r.avgTicket)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div
            key={r.id ?? "unassigned"}
            className={`space-y-3 rounded-lg border p-4 ${
              r.id === null ? "border-amber-500/30 bg-amber-500/5" : "border-border/50 bg-card/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                {roleLabel(r.role) && <p className="text-xs text-muted-foreground">{roleLabel(r.role)}</p>}
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold">{formatPrice(r.earnings)}</span>
            </div>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <Field label="Lavados" value={String(r.washes)} />
              <Field label="Ticket prom." value={formatPrice(r.avgTicket)} />
              <Field
                label="Descuentos"
                value={r.promotionDiscount + r.manualDiscount > 0 ? `−${formatPrice(r.promotionDiscount + r.manualDiscount)}` : "—"}
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Números exactos por periodo, para quien no quiera leer la gráfica. */
function PeriodTable({ data }: { data: EmployeeEarnings }) {
  const { series, granularity } = data;
  // Los periodos en cero se omiten en la tabla; en la gráfica sí se ven.
  const rows = series.filter((b) => b.washes > 0);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Detalle por periodo</h3>
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium text-right">Lavados</th>
              <th className="px-4 py-3 font-medium text-right">Ganancias</th>
              <th className="hidden px-4 py-3 font-medium text-right sm:table-cell">Ticket prom.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((b) => (
              <tr key={b.key}>
                <td className="px-4 py-3 capitalize">{bucketLongLabel(b.key, granularity)}</td>
                <td className="px-4 py-3 text-right font-mono">{b.washes}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatPrice(b.earnings)}</td>
                <td className="hidden px-4 py-3 text-right font-mono sm:table-cell">
                  {formatPrice(b.earnings / b.washes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
