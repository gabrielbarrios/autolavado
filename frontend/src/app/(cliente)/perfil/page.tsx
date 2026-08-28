import Link from "next/link";
import { Car, QrCode, Calendar, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { listMyVehicles } from "@/lib/strapi/vehicles";
import { listMyAppointments } from "@/lib/strapi/appointments";
import { listMyPromotions, getMyLoyaltyProgress } from "@/lib/strapi/promotions";
import { loadMyActiveServices } from "@/lib/strapi/visits";
import { LoyaltyProgress } from "@/components/cliente/loyalty-progress";
import { ServiceTracker } from "@/components/cliente/service-tracker";
import { AutoRefresh } from "@/components/cliente/auto-refresh";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const { user } = await requireUser();

  const [vehicles, appointments, promos, loyalty, activeServices] = await Promise.all([
    listMyVehicles(user.id).catch(() => []),
    listMyAppointments(user.id).catch(() => []),
    listMyPromotions().catch(() => []),
    getMyLoyaltyProgress().catch(() => null),
    // No usa `.catch(() => [])`: un fallo aquí se muestra como tal en el tracker
    // en vez de verse igual que "no tienes nada en curso".
    loadMyActiveServices(),
  ]);

  const upcoming = appointments.find((a) => a.status === "approved" || a.status === "pending");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hola, {user.name ?? user.username}</h1>
        <p className="text-muted-foreground">Tu centro de mando para reservas, autos y promociones.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Car} label="Autos registrados" value={vehicles.length.toString()} href="/autos" />
        <StatCard icon={Gift} label="Promociones activas" value={promos.length.toString()} href="/mis-promociones" />
        <StatCard
          icon={Calendar}
          label="Próxima reservación"
          value={upcoming ? formatDate(upcoming.date) : "—"}
          href="/reservar"
        />
      </div>

      {/* AutoRefresh va siempre montado (antes solo si ya había algo en curso, así
          que un lavado iniciado con la página abierta nunca aparecía solo). */}
      <AutoRefresh intervalMs={30000} />
      <ServiceTracker services={activeServices.services} failed={!activeServices.ok} />

      <LoyaltyProgress current={loyalty?.currentCount ?? user.visitCount ?? 0} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mis autos</h2>
              <Button asChild size="sm" variant="outline">
                <Link href="/autos">Ver todos</Link>
              </Button>
            </div>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no tienes autos.{" "}
                <Link href="/autos/nuevo" className="font-medium text-primary hover:underline">
                  Agrega el primero
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {vehicles.slice(0, 3).map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">
                        {v.brand} {v.model} · {v.year}
                      </p>
                      <p className="text-xs text-muted-foreground">{v.plate}</p>
                    </div>
                    <Badge variant="outline">{v.color}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">Acciones rápidas</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="premium">
                <Link href="/reservar">
                  <Calendar className="h-4 w-4" /> Reservar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/qr">
                  <QrCode className="h-4 w-4" /> Ver mi QR
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/autos/nuevo">
                  <Car className="h-4 w-4" /> Agregar auto
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/mis-promociones">
                  <Gift className="h-4 w-4" /> Promociones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
