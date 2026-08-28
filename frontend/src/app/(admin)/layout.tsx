import { requireAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";
import { listVehicleTypes } from "@/lib/strapi/vehicle-types";
import { VehicleTypesProvider } from "@/components/shared/vehicle-types-provider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin();
  const vehicleTypes = await listVehicleTypes().catch(() => []);
  return (
    <VehicleTypesProvider types={vehicleTypes}>
      <AdminShell
        user={{ name: user.name ?? user.username, email: user.email }}
        isSuperAdmin={role === "superadmin"}
      >
        {children}
      </AdminShell>
    </VehicleTypesProvider>
  );
}
