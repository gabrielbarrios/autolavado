import { Card, CardContent } from "@/components/ui/card";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { employeeStats } from "@/lib/strapi/admin";
import { EmployeesDashboard } from "@/components/admin/employees-dashboard";
import { EmployeeTimesPanel } from "@/components/admin/employee-times";
import { EmployeeEarningsPanel } from "@/components/admin/employee-earnings";

export const metadata = { title: "Empleados" };

export default async function EmpleadosPage() {
  await requireSuperAdmin();
  const stats = await employeeStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
        <p className="text-muted-foreground">
          Supervisión del personal: ganancias por periodo, tiempos por auto, lavados y tendencia.
        </p>
      </div>

      <EmployeeEarningsPanel />

      <EmployeeTimesPanel />

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
