"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/types/models";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const mainMedia = product.images?.[0] ?? null;
  const img = mainMedia ? strapiMediaUrl(mainMedia, "small") : null;
  const thumbForCart = mainMedia ? strapiMediaUrl(mainMedia, "thumbnail") : null;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock === 0;

  function add() {
    cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: thumbForCart ?? undefined,
    });
    toast.success(`${product.name} agregado al carrito`);
  }

  return (
    <Card className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <Link href={`/tienda/${product.slug}`} className="block">
        <div className="relative h-48 w-full bg-muted">
          {img && (
            <Image
              src={img}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="destructive">Agotado</Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="space-y-3 p-5">
        <div>
          <Link href={`/tienda/${product.slug}`} className="hover:underline">
            <h3 className="font-semibold">{product.name}</h3>
          </Link>
          <p className="text-xs capitalize text-muted-foreground">{product.category}</p>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
          {lowStock && <Badge variant="warning">Quedan {product.stock}</Badge>}
        </div>
        <Button onClick={add} variant="premium" className="w-full" disabled={outOfStock}>
          <ShoppingBag className="h-4 w-4" /> Agregar
        </Button>
      </CardContent>
    </Card>
  );
}
