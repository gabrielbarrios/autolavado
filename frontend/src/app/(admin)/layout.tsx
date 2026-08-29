import { requireAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";
import { listVehicleTypes } from "@/lib/strapi/vehicle-types";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { VehicleTypesProvider } from "@/components/shared/vehicle-types-provider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin();
  const [vehicleTypes, setting] = await Promise.all([
    listVehicleTypes().catch(() => []),
    getSiteSetting(),
  ]);
  return (
    <VehicleTypesProvider types={vehicleTypes}>
      <AdminShell
        user={{ name: user.name ?? user.username, email: user.email }}
        brand={{ name: setting?.businessName, logo: setting?.logo }}
        isSuperAdmin={role === "superadmin"}
      >
        {children}
      </AdminShell>
    </VehicleTypesProvider>
  );
}
