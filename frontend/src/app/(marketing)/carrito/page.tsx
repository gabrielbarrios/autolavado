import { getSession } from "@/lib/auth/session";
import { CartView } from "@/components/tienda/cart-view";

export const metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const session = await getSession();
  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Carrito</h1>
        <p className="text-muted-foreground">Revisa y confirma tu pedido.</p>
      </div>
      <CartView isAuthenticated={!!session} />
    </div>
  );
}
