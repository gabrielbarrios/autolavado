import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAllAppointments } from "@/lib/strapi/appointments";
import { listBoardAppointmentIds } from "@/lib/strapi/qr";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { formatDate, cn } from "@/lib/utils";
import { formatTime } from "@/lib/business-hours";
import type { AppointmentStatus } from "@/types/models";

export const metadata = { title: "Reservaciones" };

const statusVariant = {
  pending: "warning",
  approved: "info",
  cancelled: "destructive",
  completed: "success",
} as const;

const statusLabel: Record<AppointmentStatus, string> = {
  pending: "Pendientes",
  approved: "Aprobadas",
  completed: "Completadas",
  cancelled: "Canceladas",
};

const FILTERS: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReservacionesAdminPage(props: PageProps) {
  const { status } = await props.searchParams;
  const statusFilter = (FILTERS.find((f) => f.value === status)?.value ?? "all") as
    | AppointmentStatus
    | "all";

  const [all, setting, onBoardIds] = await Promise.all([
    listAllAppointments().catch(() => []),
    getSiteSetting().catch(() => null),
    listBoardAppointmentIds().catch(() => new Set<number>()),
  ]);

  // Conteos por estado
  const counts = all.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<AppointmentStatus, number>,
  );

  const items =
    statusFilter === "all" ? all : all.filter((a) => a.status === statusFilter);

  // Ordenar pending primero (lo urgente), luego approved, luego completed, luego cancelled
  const order: Record<AppointmentStatus, number> = {
    pending: 0,
    approved: 1,
    completed: 2,
    cancelled: 3,
  };
  const sorted = [...items].sort((a, b) => {
    const so = order[a.status] - order[b.status];
    if (so !== 0) return so;
    // por fecha + hora desc dentro del mismo estado
    return `${b.date}T${b.timeSlot}`.localeCompare(`${a.date}T${a.timeSlot}`);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reservaciones</h1>
        <p className="text-muted-foreground">
          Aprueba, completa o cancela las reservas de tus clientes.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending", "approved", "completed", "cancelled"] as AppointmentStatus[]).map((s) => (
          <Link key={s} href={`/reservaciones?status=${s}`} className="block">
            <Card
              className={cn(
                "transition-colors hover:border-primary/40",
                statusFilter === s && "border-primary/60 ring-1 ring-primary/30",
              )}
            >
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {statusLabel[s]}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{counts[s] ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href = f.value === "all" ? "/reservaciones" : `/reservaciones?status=${f.value}`;
          const active = statusFilter === f.value;
          return (
            <Link
              key={f.value}
              href={href}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Paquete</th>
                  <th className="px-4 py-3 font-medium">Auto</th>
                  <th className="px-4 py-3 font-medium">Fecha y hora</th>
                  <th className="px-4 py-3 font-medium">Notas</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {statusFilter === "all"
                        ? "Sin reservaciones todavía."
                        : `Sin reservaciones ${statusLabel[statusFilter as AppointmentStatus].toLowerCase()}.`}
                    </td>
                  </tr>
                ) : (
                  sorted.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.user?.name ?? a.user?.username}</p>
                        <p className="text-xs text-muted-foreground">{a.user?.email}</p>
                        {a.user?.phone && (
                          <p className="text-xs text-muted-foreground">{a.user.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p>{a.package?.name ?? "—"}</p>
                        {a.package?.durationMinutes && (
                          <p className="text-xs text-muted-foreground">
                            {a.package.durationMinutes} min
                          </p>
                        )}
                        {a.extraServices && a.extraServices.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.extraServices.map((e) => (
                              <Badge key={e.id} variant="outline" className="text-[10px]">
                                + {e.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.vehicle ? (
                          <>
                            <p>{a.vehicle.brand} {a.vehicle.model}</p>
                            {a.vehicle.plate && (
                              <p className="font-mono text-xs">{a.vehicle.plate}</p>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatDate(a.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(a.timeSlot)}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-xs text-muted-foreground">
                        {a.customerNotes || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[a.status]}>{statusLabel[a.status].slice(0, -1)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AppointmentActions
                          appointment={a}
                          businessHours={setting?.businessHours ?? []}
                          closedDates={setting?.closedDates ?? []}
                          onBoard={onBoardIds.has(a.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="divide-y divide-border/40 md:hidden">
            {sorted.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {statusFilter === "all"
                  ? "Sin reservaciones todavía."
                  : `Sin reservaciones ${statusLabel[statusFilter as AppointmentStatus].toLowerCase()}.`}
              </p>
            ) : (
              sorted.map((a) => (
                <div key={a.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.user?.name ?? a.user?.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.user?.email}</p>
                      {a.user?.phone && (
                        <p className="truncate text-xs text-muted-foreground">{a.user.phone}</p>
                      )}
                    </div>
                    <Badge variant={statusVariant[a.status]} className="shrink-0">
                      {statusLabel[a.status].slice(0, -1)}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Fecha</dt>
                      <dd>{formatDate(a.date)}</dd>
                      <dd className="text-muted-foreground">{formatTime(a.timeSlot)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Auto</dt>
                      <dd className="truncate">
                        {a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model}` : "—"}
                      </dd>
                      {a.vehicle?.plate && (
                        <dd className="truncate font-mono text-muted-foreground">{a.vehicle.plate}</dd>
                      )}
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Paquete</dt>
                      <dd>
                        {a.package?.name ?? "—"}
                        {a.package?.durationMinutes && (
                          <span className="text-muted-foreground"> · {a.package.durationMinutes} min</span>
                        )}
                      </dd>
                      {a.extraServices && a.extraServices.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.extraServices.map((e) => (
                            <Badge key={e.id} variant="outline" className="text-[10px]">
                              + {e.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {a.customerNotes && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Notas</dt>
                        <dd className="whitespace-pre-wrap">{a.customerNotes}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="flex justify-end">
                    <AppointmentActions
                      appointment={a}
                      businessHours={setting?.businessHours ?? []}
                      closedDates={setting?.closedDates ?? []}
                      onBoard={onBoardIds.has(a.id)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
