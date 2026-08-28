import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { listMyOrders } from "@/lib/strapi/orders";
import { formatDate, formatPrice } from "@/lib/utils";
import { STORE_ENABLED } from "@/lib/constants";

export const metadata = { title: "Mis pedidos" };

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
const statusVariant: Record<string, "warning" | "info" | "success" | "destructive"> = {
  pending: "warning",
  paid: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "destructive",
};

export default async function PedidosPage() {
  // La tienda está apagada (STORE_ENABLED): la ruta no existe para nadie.
  if (!STORE_ENABLED) notFound();

  // Solo como guardia de sesión: el backend resuelve el dueño desde el JWT.
  await requireUser();
  const orders = await listMyOrders().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis pedidos</h1>
        <p className="text-muted-foreground">Historial de productos que has comprado.</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Aún no tienes pedidos.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Pedido #{o.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                  </div>
                  <Badge variant={statusVariant[o.status] ?? "outline"}>{statusLabel[o.status] ?? o.status}</Badge>
                </div>
                {o.items && (
                  <ul className="space-y-1 text-sm">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {it.product?.name ?? "Producto"} × {it.quantity}
                        </span>
                        <span className="font-mono">{formatPrice(it.unitPrice * it.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-between border-t border-border/40 pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{formatPrice(o.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
