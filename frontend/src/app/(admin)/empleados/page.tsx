import { Card, CardContent } from "@/components/ui/card";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { employeeStats } from "@/lib/strapi/admin";
import { EmployeesDashboard } from "@/components/admin/employees-dashboard";

export const metadata = { title: "Empleados" };

export default async function EmpleadosPage() {
  await requireSuperAdmin();
  const stats = await employeeStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
        <p className="text-muted-foreground">
          Supervisión de administradores: lavados realizados, ganancias y tendencia.
        </p>
      </div>

      {!stats ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No se pudieron cargar las estadísticas. Intenta de nuevo.
          </CardContent>
        </Card>
      ) : (
        <EmployeesDashboard stats={stats} />
      )}
    </div>
  );
}
