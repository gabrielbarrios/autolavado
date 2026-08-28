import { requireUser } from "@/lib/auth/guards";
import { loadMyActiveServices } from "@/lib/strapi/visits";
import { ClienteShell } from "@/components/cliente/cliente-shell";
import { listVehicleTypes } from "@/lib/strapi/vehicle-types";
import { VehicleTypesProvider } from "@/components/shared/vehicle-types-provider";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  // El contador del nav vive en el layout para que se vea desde cualquier página
  // del cliente, no solo en /perfil. Se refresca con cada router.refresh().
  const [active, vehicleTypes] = await Promise.all([
    loadMyActiveServices(),
    listVehicleTypes().catch(() => []),
  ]);

  return (
    <VehicleTypesProvider types={vehicleTypes}>
      <ClienteShell
        user={{ name: user.name ?? user.username, email: user.email }}
        activeServices={active.services.length}
      >
        {children}
      </ClienteShell>
    </VehicleTypesProvider>
  );
}
