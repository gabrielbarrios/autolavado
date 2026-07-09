import { Card, CardContent } from "@/components/ui/card";
import { listBoardServices } from "@/lib/strapi/qr";
import { listAdmins } from "@/lib/strapi/admin";
import { getSession } from "@/lib/auth/session";
import { ServiceBoard } from "@/components/admin/service-board";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Tablero de servicios" };

export default async function EnProgresoPage() {
  const session = await getSession();
  const isSuperAdmin = session?.role === "superadmin";
  const [board, adminUsers] = await Promise.all([
    listBoardServices().catch(() => ({ waiting: [], in_progress: [], to_pay: [] })),
    isSuperAdmin ? listAdmins().catch(() => []) : Promise.resolve([]),
  ]);
  const admins = adminUsers.map((u) => ({
    id: u.id,
    name: u.name ?? u.username ?? u.email,
  }));
  const currentUserId = session?.user.id ?? null;

  const toPayTotal = board.to_pay.reduce((acc, s) => acc + Number(s.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tablero de servicios</h1>
        <p className="text-muted-foreground">
          Flujo: <strong>En espera</strong> → un empleado <strong>inicia</strong> el lavado →
          lo <strong>termina</strong> → la caja lo <strong>cobra</strong>. La visita de fidelidad
          se registra al cobrar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="En espera" value={String(board.waiting.length)} />
        <Stat label="Trabajando" value={String(board.in_progress.length)} />
        <Stat label="Por cobrar" value={String(board.to_pay.length)} />
        <Stat label="Total por cobrar" value={formatPrice(toPayTotal)} />
      </div>

      <ServiceBoard
        waiting={board.waiting}
        inProgress={board.in_progress}
        toPay={board.to_pay}
        isSuperAdmin={isSuperAdmin}
        admins={admins}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
