import Link from "next/link";
import { Users, Calendar, Receipt, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminStats } from "@/lib/strapi/admin";
import { listAllAppointments } from "@/lib/strapi/appointments";
import { StatCard } from "@/components/admin/stat-card";
import { RecentAppointments } from "@/components/admin/recent-appointments";
import { STORE_ENABLED } from "@/lib/constants";

export const metadata = { title: "Dashboard" };

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
            <Calendar className="h-4 w-4" /> Ver pendientes
          </Link>
        </Button>
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
              <p className="text-sm font-semibold text-amber-200">
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
