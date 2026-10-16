import { requireStaff } from "@/lib/auth/guards";
import { listStaff } from "@/lib/strapi/admin";
import { JobsPanel } from "@/components/admin/jobs-panel";

export const metadata = { title: "Trabajos" };

/**
 * Everyone on staff (employee, admin, super admin): what was charged in a
 * period and which cars were attended, filterable by employee. The backend
 * checks the role again on /api/qr/jobs.
 */
export default async function TrabajosPage() {
  await requireStaff();
  const staff = await listStaff().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trabajos</h1>
        <p className="text-muted-foreground">
          Ganancias por periodo y lista de autos atendidos, por empleado o en conjunto.
        </p>
      </div>

      <JobsPanel staff={staff} />
    </div>
  );
}
