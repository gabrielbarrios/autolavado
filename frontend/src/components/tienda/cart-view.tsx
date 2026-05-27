"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { checkoutAction } from "@/actions/orders";

export function CartView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function checkout() {
    if (!isAuthenticated) {
      toast.error("Inicia sesión para finalizar tu pedido");
      router.push("/login?redirect=/carrito");
      return;
    }
    setSubmitting(true);
    const res = await checkoutAction(
      cart.items.map((i) => ({ productId: i.productId, unitPrice: i.price, quantity: i.quantity })),
      notes,
    );
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    cart.clear();
    toast.success("Pedido creado — pago en sucursal");
    router.push("/pedidos");
  }

  if (cart.items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>
          <Button asChild variant="premium" className="mt-4">
            <Link href="/tienda">Ir a la tienda</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {cart.items.map((item) => (
          <Card key={item.productId}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{formatPrice(item.price)} c/u</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => cart.setQty(item.productId, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-mono">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => cart.setQty(item.productId, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="w-20 text-right font-mono">{formatPrice(item.price * item.quantity)}</p>
              <Button variant="ghost" size="icon" onClick={() => cart.remove(item.productId)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <CardContent className="space-y-4 p-6">
          <h3 className="text-lg font-semibold">Resumen</h3>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(cart.total)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatPrice(cart.total)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            El pago se realiza en sucursal. Pronto añadiremos pagos en línea.
          </p>
          <Button onClick={checkout} variant="premium" className="w-full" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Finalizar pedido
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
