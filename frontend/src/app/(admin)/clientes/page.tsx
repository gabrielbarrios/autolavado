import { requireAdmin } from "@/lib/auth/guards";
import { listAllUsers } from "@/lib/strapi/admin";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { ClientesTable } from "@/components/admin/clientes-table";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  // Pantalla de administración: el empleado se queda en su dashboard.
  await requireAdmin();
  const [users, setting] = await Promise.all([
    listAllUsers().catch(() => []),
    getSiteSetting().catch(() => null),
  ]);
  const businessName = setting?.businessName?.trim() || "Autolavado";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">Listado de usuarios registrados.</p>
      </div>

      <ClientesTable users={users} businessName={businessName} />
    </div>
  );
}
