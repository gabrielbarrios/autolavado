"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { DateRange } from "react-day-picker";
import { AlertTriangle, Banknote, CreditCard, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobsAction } from "@/actions/admin";
import type { EmployeeEarningsRow, JobRow, JobsReport, StaffMember } from "@/lib/strapi/admin";
import type { EarningsGranularity } from "@/lib/report-dates";
import { cn, formatPrice } from "@/lib/utils";
import {
  addDays,
  bucketLabel,
  bucketLongLabel,
  granularityForSpan,
  presetBounds,
  rangeLabel,
  startOfDay,
} from "@/lib/report-dates";
import { DateRangePicker } from "@/components/admin/date-range-picker";

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

/**
 * One flat list of periods. The chart granularity (day / week / month) is
 * picked from the window's length, so there is no "Ver" selector here.
 */
const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "last30", label: "Últimos 30 días" },
  { value: "thisWeek", label: "Esta semana" },
  { value: "lastWeek", label: "Semana pasada" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes pasado" },
  { value: "custom", label: "Fechas elegidas" },
];

const DEFAULT_PERIOD = "last7";
const ALL_EMPLOYEES = "all";

/** Rows shown in the car list before the "Mostrar más" button. */
const JOBS_PAGE_SIZE = 50;

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

const PAYMENT_LABEL: Record<NonNullable<JobRow["paymentMethod"]>, { label: string; icon: typeof Banknote }> = {
  cash: { label: "Efectivo", icon: Banknote },
  card: { label: "Tarjeta", icon: CreditCard },
  transfer: { label: "Transferencia", icon: Landmark },
};

/** 4520 → "1 h 15 min". For washes the minute is the useful unit. */
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

function formatShortDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

/**
 * "10:20 – 11:05" when the car went through the board; otherwise the time it
 * was charged. The day is prefixed when the window spans more than one.
 */
function formatSchedule(row: JobRow, multiDay: boolean): { day: string | null; time: string } {
  const anchor = row.startedAt ?? row.date;
  const day = multiDay ? formatShortDay(anchor) : null;
  if (row.startedAt && row.finishedAt) {
    return { day, time: `${formatClock(row.startedAt)} – ${formatClock(row.finishedAt)}` };
  }
  return { day, time: formatClock(anchor) };
}

/** Does the window cover more than one calendar day? */
function spansMultipleDays(fromISO: string, toISO: string): boolean {
  const last = addDays(new Date(toISO), -1);
  return startOfDay(new Date(fromISO)).getTime() < startOfDay(last).getTime();
}

const GRANULARITY_WORD: Record<EarningsGranularity, string> = { day: "día", week: "semana", month: "mes" };

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function JobsPanel({ staff }: { staff: StaffMember[] }) {
  const [preset, setPreset] = React.useState(DEFAULT_PERIOD);
  const [employeeId, setEmployeeId] = React.useState<string>(ALL_EMPLOYEES);
  // Days picked in the calendar (both inclusive). It also mirrors the active
  // preset so the button always says which window is being shown.
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = startOfDay(new Date());
    return { from: addDays(today, -6), to: today };
  });
  const [data, setData] = React.useState<JobsReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const load = React.useCallback((from: Date, to: Date, emp: string) => {
    startTransition(async () => {
      const res = await jobsAction(
        from.toISOString(),
        to.toISOString(),
        granularityForSpan(from, to),
        new Date().getTimezoneOffset(),
        emp === ALL_EMPLOYEES ? null : Number(emp),
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

  // The window depends on the browser's time zone: it is computed on mount.
  React.useEffect(() => {
    const b = presetBounds(DEFAULT_PERIOD);
    if (b) load(b.from, b.to, ALL_EMPLOYEES);
  }, [load]);

  /** Loads the days picked in the calendar; a single day counts as a one-day range. */
  function applyRange(r: DateRange | undefined, emp: string) {
    if (!r?.from) {
      setError("Elige al menos un día en el calendario.");
      return;
    }
    const from = startOfDay(r.from);
    const last = startOfDay(r.to ?? r.from);
    // `to` is exclusive: the last day is included whole.
    load(from, addDays(last, 1), emp);
  }

  function applyPreset(p: string, emp: string) {
    if (p === "custom") return applyRange(range, emp);
    const b = presetBounds(p);
    if (!b) return;
    // The calendar mirrors the preset's window; `to` is exclusive there.
    setRange({ from: b.from, to: addDays(b.to, -1) });
    load(b.from, b.to, emp);
  }

  function onPresetChange(value: string) {
    setPreset(value);
    applyPreset(value, employeeId);
  }

  function onRangeChange(next: DateRange | undefined) {
    setRange(next);
    if (!next?.from) return;
    setPreset("custom");
    applyRange(next, employeeId);
  }

  function onEmployeeChange(value: string) {
    setEmployeeId(value);
    applyPreset(preset, value);
  }

  const selectedEmployee = staff.find((s) => String(s.id) === employeeId) ?? null;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <CardTitle>Trabajos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Servicios cobrados: cuánto entró y qué autos se atendieron.
            {data && ` — ${rangeLabel(data.from, data.to)}`}
            {selectedEmployee && ` · ${selectedEmployee.name}`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="jobs-preset">Periodo</Label>
            <Select value={preset} onValueChange={onPresetChange}>
              <SelectTrigger id="jobs-preset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="jobs-range">Fechas</Label>
            <DateRangePicker id="jobs-range" value={range} onChange={onRangeChange} disabled={isPending} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobs-employee">Empleado</Label>
            <Select value={employeeId} onValueChange={onEmployeeChange}>
              <SelectTrigger id="jobs-employee" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EMPLOYEES}>Todos</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data ? null : data.totals.washes === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {selectedEmployee
              ? `${selectedEmployee.name} no cobró ningún servicio en este periodo.`
              : "No se cobró ningún servicio en este periodo."}
          </p>
        ) : (
          <div className={isPending ? "space-y-6 opacity-60 transition-opacity" : "space-y-6"}>
            <SummaryTable data={data} />
            {data.series.length > 1 && <EarningsLineChart data={data} />}
            <JobsTable data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */

/** The columns the owner asked for, one row per employee plus the total. */
function SummaryTable({ data }: { data: JobsReport }) {
  const rows = data.byEmployee;
  const t = data.totals;
  const extrasOf = (r: EmployeeEarningsRow) => r.extras ?? { count: 0, earnings: 0 };
  const extrasCell = (x: { count: number; earnings: number }) =>
    x.count > 0 ? `${x.count} · ${formatPrice(x.earnings)}` : "—";
  const discountCell = (n: number) => (n > 0 ? `−${formatPrice(n)}` : "—");
  const showTotal = rows.length > 1;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Resumen</h3>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium text-right">Lavados</th>
              <th className="px-4 py-3 font-medium text-right">Ganancias</th>
              <th className="px-4 py-3 font-medium text-right">Efectivo</th>
              <th className="px-4 py-3 font-medium text-right">Tarjeta</th>
              <th className="px-4 py-3 font-medium text-right">Transferencia</th>
              <th className="px-4 py-3 font-medium text-right">Servicios extras</th>
              <th className="px-4 py-3 font-medium text-right">Promedio</th>
              <th className="px-4 py-3 font-medium text-right">Descuentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((r) => (
              <tr key={r.id ?? "unassigned"} className={r.id === null ? "bg-amber-500/5" : undefined}>
                <td className="px-4 py-3">
                  <span className={r.id === null ? "font-medium text-amber-800 dark:text-amber-200" : "font-medium"}>
                    {r.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{r.washes}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatPrice(r.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatPrice(r.byPayment.cash.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatPrice(r.byPayment.card.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatPrice(r.byPayment.transfer.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{extrasCell(extrasOf(r))}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(r.avgTicket)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {discountCell(r.promotionDiscount + r.manualDiscount)}
                </td>
              </tr>
            ))}
          </tbody>
          {showTotal && (
            <tfoot className="border-t border-border/60 bg-card/40 font-semibold">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono">{t.washes}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(t.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(t.byPayment.cash.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(t.byPayment.card.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(t.byPayment.transfer.earnings)}</td>
                <td className="px-4 py-3 text-right font-mono">{extrasCell(data.extras.totals)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(t.avgTicket)}</td>
                <td className="px-4 py-3 text-right font-mono">{discountCell(t.promotionDiscount + t.manualDiscount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div
            key={r.id ?? "unassigned"}
            className={cn(
              "space-y-3 rounded-lg border p-4",
              r.id === null ? "border-amber-500/30 bg-amber-500/5" : "border-border/50 bg-card/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.washes} lavados</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold">{formatPrice(r.earnings)}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Efectivo" value={formatPrice(r.byPayment.cash.earnings)} />
              <Field label="Tarjeta" value={formatPrice(r.byPayment.card.earnings)} />
              <Field label="Transferencia" value={formatPrice(r.byPayment.transfer.earnings)} />
              <Field label="Servicios extras" value={extrasCell(extrasOf(r))} />
              <Field label="Promedio" value={formatPrice(r.avgTicket)} />
              <Field label="Descuentos" value={discountCell(r.promotionDiscount + r.manualDiscount)} />
            </dl>
          </div>
        ))}
        {showTotal && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Total</p>
                <p className="text-xs text-muted-foreground">{t.washes} lavados</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold">{formatPrice(t.earnings)}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Efectivo" value={formatPrice(t.byPayment.cash.earnings)} />
              <Field label="Tarjeta" value={formatPrice(t.byPayment.card.earnings)} />
              <Field label="Transferencia" value={formatPrice(t.byPayment.transfer.earnings)} />
              <Field label="Servicios extras" value={extrasCell(data.extras.totals)} />
              <Field label="Promedio" value={formatPrice(t.avgTicket)} />
              <Field label="Descuentos" value={discountCell(t.promotionDiscount + t.manualDiscount)} />
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gráfica                                                             */
/* ------------------------------------------------------------------ */

/** Earnings over the window as a dotted line, one point per day / week / month. */
function EarningsLineChart({ data }: { data: JobsReport }) {
  const { series, granularity } = data;
  const chartData = series.map((b) => ({
    periodo: bucketLabel(b.key, granularity),
    key: b.key,
    ganancias: Number(b.earnings.toFixed(2)),
    lavados: b.washes,
  }));

  // Many buckets (e.g. 30 days) on a phone: show only some labels.
  const interval = series.length > 14 ? Math.ceil(series.length / 8) - 1 : 0;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Ganancias por {GRANULARITY_WORD[granularity]}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" interval={interval} />
            <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              formatter={(value: number, name: string) => [name === "Ganancias" ? formatPrice(value) : value, name]}
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
            <Line
              type="monotone"
              dataKey="ganancias"
              name="Ganancias"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Autos atendidos                                                     */
/* ------------------------------------------------------------------ */

function PaymentBadge({ method }: { method: JobRow["paymentMethod"] }) {
  if (!method) return null;
  const meta = PAYMENT_LABEL[method];
  return (
    <Badge variant="outline" className="gap-1 text-[10px] font-normal">
      <meta.icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function JobsTable({ data }: { data: JobsReport }) {
  const [limit, setLimit] = React.useState(JOBS_PAGE_SIZE);
  // A new report starts from the first page again (state reset during render,
  // the React-sanctioned way to react to a prop change without an effect).
  const [seen, setSeen] = React.useState(data);
  if (seen !== data) {
    setSeen(data);
    setLimit(JOBS_PAGE_SIZE);
  }

  const rows = data.jobs;
  if (rows.length === 0) return null;
  const multiDay = spansMultipleDays(data.from, data.to);
  const visible = rows.slice(0, limit);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Autos atendidos</h3>
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "auto" : "autos"} · del más reciente al más antiguo
        </p>
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Auto</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium text-right">Duración</th>
              <th className="px-4 py-3 font-medium text-right">Cobro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((r) => {
              const when = formatSchedule(r, multiDay);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 whitespace-nowrap font-mono">
                    {when.day && <span className="mr-2 text-muted-foreground">{when.day}</span>}
                    {when.time}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.vehicle}</p>
                    {(r.package || r.extras.length > 0) && (
                      <p className="text-xs text-muted-foreground">
                        {[r.package, ...r.extras].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.customer ?? <span className="text-muted-foreground">Visitante</span>}</td>
                  <td className="px-4 py-3">
                    {r.employee ? (
                      r.employee.name
                    ) : (
                      <span className="text-amber-800 dark:text-amber-200">Sin acreditar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.seconds === null ? <span className="text-muted-foreground">—</span> : formatDuration(r.seconds)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PaymentBadge method={r.paymentMethod} />
                      <span className="font-mono font-semibold">{formatPrice(r.totalAmount)}</span>
                    </div>
                    {r.discount > 0 && (
                      <p className="text-xs text-muted-foreground">−{formatPrice(r.discount)} de descuento</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {visible.map((r) => {
          const when = formatSchedule(r, multiDay);
          return (
            <div key={r.id} className="space-y-3 rounded-lg border border-border/50 bg-card/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.vehicle}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {when.day && `${when.day} · `}
                    {when.time}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold">{formatPrice(r.totalAmount)}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="Cliente" value={r.customer ?? "Visitante"} />
                <Field label="Empleado" value={r.employee?.name ?? "Sin acreditar"} />
                <Field label="Duración" value={r.seconds === null ? "—" : formatDuration(r.seconds)} />
                <Field label="Pago" value={r.paymentMethod ? PAYMENT_LABEL[r.paymentMethod].label : "—"} />
              </dl>
            </div>
          );
        })}
      </div>

      {rows.length > limit && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => setLimit((n) => n + JOBS_PAGE_SIZE)}>
            Mostrar más ({rows.length - limit} restantes)
          </Button>
        </div>
      )}
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
