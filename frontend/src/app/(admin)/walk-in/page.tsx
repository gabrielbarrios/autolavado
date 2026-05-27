import { listPackages } from "@/lib/strapi/packages";
import { listExtraServices } from "@/lib/strapi/extra-services";
import { WalkInForm } from "@/components/admin/walk-in-form";

export const metadata = { title: "Walk-in" };

export default async function WalkInPage() {
  const [packages, extras] = await Promise.all([
    listPackages().catch(() => []),
    listExtraServices().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Walk-in</h1>
        <p className="text-muted-foreground">
          Registra un servicio para un cliente que no tiene cuenta.
          No acumula fidelidad pero sí suma a estadísticas y ganancias.
        </p>
      </div>
      <WalkInForm packages={packages} extraServices={extras} />
    </div>
  );
}
