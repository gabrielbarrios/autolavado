import { requireStaff } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";
import { listVehicleTypes } from "@/lib/strapi/vehicle-types";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { VehicleTypesProvider } from "@/components/shared/vehicle-types-provider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Portero del grupo: entran empleados y admins. Las pantallas que no son
  // del empleado se defienden solas con requireAdmin() / requireSuperAdmin().
  const { user, role } = await requireStaff();
  const [vehicleTypes, setting] = await Promise.all([
    listVehicleTypes().catch(() => []),
    getSiteSetting(),
  ]);
  return (
    <VehicleTypesProvider types={vehicleTypes}>
      <AdminShell
        user={{ name: user.name ?? user.username, email: user.email }}
        brand={{ name: setting?.businessName, logo: setting?.logo }}
        role={role}
      >
        {children}
      </AdminShell>
    </VehicleTypesProvider>
  );
}
