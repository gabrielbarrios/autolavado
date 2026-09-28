import Link from "next/link";
import { Users, Calendar, Receipt, Sparkles, ArrowRight, QrCode, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminStats } from "@/lib/strapi/admin";
import { listAllAppointments } from "@/lib/strapi/appointments";
import { StatCard } from "@/components/admin/stat-card";
import { RecentAppointments } from "@/components/admin/recent-appointments";
import { STORE_ENABLED } from "@/lib/constants";

export const metadata = { title: "Dashboard" };

/** Accesos directos a la operación del día: lo primero que se toca al abrir el panel. */
const QUICK_ACTIONS = [
  {
    href: "/escanear",
    label: "Escanear QR",
    description: "Identifica al cliente y registra su visita",
    icon: QrCode,
  },
  {
    href: "/walk-in",
    label: "Visitante",
    description: "Alta rápida de un auto sin cuenta",
    icon: UserPlus,
  },
  {
    href: "/en-progreso",
    label: "Tablero",
    description: "Autos en espera, en proceso y por cobrar",
    icon: Clock,
  },
];

export default async function DashboardPage() {
  const [stats, appointments] = await Promise.all([
    adminStats(),
    listAllAppointments().catch(() => []),
  ]);

  const pending = appointments.filter((a) => a.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de la operación.</p>
        </div>
        <Button asChild variant="premium">
          <Link href="/reservaciones?status=pending">
            <Calendar className="h-4 w-4" /> Ver reservaciones
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:items-center sm:gap-3 sm:p-7 sm:text-center"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 sm:h-20 sm:w-20">
              <a.icon className="h-8 w-8 sm:h-10 sm:w-10" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold tracking-tight sm:text-xl">{a.label}</span>
              <span className="block text-xs text-muted-foreground sm:text-sm">{a.description}</span>
            </span>
          </Link>
        ))}
      </div>

      <div
        className={
          STORE_ENABLED
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        <StatCard icon={Users} label="Clientes" value={stats.usersCount} />
        <StatCard icon={Sparkles} label="Visitas totales" value={stats.visitsCount} />
        <StatCard icon={Calendar} label="Reservas pendientes" value={pending.length} />
        {/* Los pedidos son de la tienda: sin tienda, la métrica no dice nada. */}
        {STORE_ENABLED && (
          <StatCard icon={Receipt} label="Pedidos totales" value={stats.ordersCount} />
        )}
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {pending.length} reservación{pending.length !== 1 ? "es" : ""} esperando aprobación
              </p>
              <p className="text-xs text-muted-foreground">Revísalas y apruébalas o cancélalas.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/reservaciones?status=pending">
                Revisar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentAppointments items={appointments} />
        </div>
      </div>
    </div>
  );
}
