import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Appointment } from "@/types/models";

const statusVariant = {
  pending: "warning",
  approved: "info",
  cancelled: "destructive",
  completed: "success",
} as const;

export function RecentAppointments({ items }: { items: Appointment[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border/40 p-4">
          <h3 className="text-sm font-semibold">Últimas reservaciones</h3>
        </div>
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Sin reservaciones recientes.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {items.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.user?.name ?? a.user?.email ?? "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.package?.name} · {formatDate(a.date)} {a.timeSlot}
                  </p>
                </div>
                <Badge variant={statusVariant[a.status]}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
