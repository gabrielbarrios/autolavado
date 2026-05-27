import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listMyVehicles } from "@/lib/strapi/vehicles";
import { VehicleCard } from "@/components/cliente/vehicle-card";

export const metadata = { title: "Mis autos" };

export default async function AutosPage() {
  const { user } = await requireUser();
  const vehicles = await listMyVehicles(user.id).catch(() => []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis autos</h1>
          <p className="text-muted-foreground">Gestiona los vehículos asociados a tu cuenta.</p>
        </div>
        <Button asChild variant="premium">
          <Link href="/autos/nuevo">
            <Plus className="h-4 w-4" /> Agregar
          </Link>
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
          <p className="text-sm text-muted-foreground">No has registrado ningún auto todavía.</p>
          <Button asChild variant="premium" className="mt-4">
            <Link href="/autos/nuevo">Registrar mi primer auto</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}
