"use client";

import * as React from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/types/models";

export function ProductDetail({ product }: { product: Product }) {
  const cart = useCart();
  const [qty, setQty] = React.useState(1);
  const mainImage = product.images?.[0] ? strapiMediaUrl(product.images[0], "large") : null;
  const outOfStock = product.stock === 0;

  function add() {
    cart.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        imageUrl: mainImage ?? undefined,
      },
      qty,
    );
    toast.success(`${product.name} agregado al carrito`);
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        {mainImage && (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        )}
      </div>
      <div className="space-y-6">
        <div>
          <Badge variant="outline" className="mb-3 capitalize">
            {product.category}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold">{formatPrice(product.price)}</p>
        </div>
        {product.description && <p className="text-muted-foreground">{product.description}</p>}

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center font-mono text-lg">{qty}</span>
            <Button variant="outline" size="icon" onClick={() => setQty((q) => q + 1)} disabled={qty >= product.stock}>
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{product.stock} disponibles</span>
          </div>
          <Button onClick={add} variant="premium" size="xl" className="w-full" disabled={outOfStock}>
            <ShoppingBag className="h-4 w-4" /> {outOfStock ? "Agotado" : "Agregar al carrito"}
          </Button>
        </div>
      </div>
    </div>
  );
}
