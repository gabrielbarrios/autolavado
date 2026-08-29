import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/strapi/products";
import { ProductCard } from "@/components/tienda/product-card";
import { STORE_ENABLED } from "@/lib/constants";

export const metadata = { title: "Tienda" };

export default async function TiendaPage() {
  // La tienda está apagada (STORE_ENABLED): la ruta no existe para nadie.
  if (!STORE_ENABLED) notFound();

  const products = await listProducts().catch(() => []);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Tienda</h1>
          <p className="mt-2 text-muted-foreground">Productos para mantener tu auto impecable.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/carrito">
            <ShoppingCart className="h-4 w-4" /> Carrito
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
          Por el momento no tenemos productos disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
