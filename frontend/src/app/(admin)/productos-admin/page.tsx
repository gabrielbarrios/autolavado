import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAllProductsAdmin } from "@/lib/strapi/products";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Productos" };

export default async function ProductosAdminPage() {
  const products = await listAllProductsAdmin().catch(() => []);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">
            Catálogo de la tienda online. Para imágenes y ajustes finos,{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337"}/admin/content-manager/collection-types/api::product.product`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              abrir en Strapi →
            </a>
          </p>
        </div>
        <ProductForm />
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-right">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Precio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Sin productos.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td className="flex items-center gap-3 px-4 py-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-muted">
                          {p.images?.[0] && (
                            <Image
                              src={strapiMediaUrl(p.images[0], "thumbnail") ?? ""}
                              alt={p.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.stock}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatPrice(p.price)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.active ? "success" : "outline"}>
                          {p.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="divide-y divide-border/40 md:hidden">
            {products.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sin productos.</p>
            ) : (
              products.map((p) => (
                <div key={p.id} className="space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.images?.[0] && (
                        <Image
                          src={strapiMediaUrl(p.images[0], "thumbnail") ?? ""}
                          alt={p.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">{p.category}</p>
                    </div>
                    <Badge variant={p.active ? "success" : "outline"} className="shrink-0">
                      {p.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Stock</dt>
                      <dd className="font-mono">{p.stock}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-muted-foreground">Precio</dt>
                      <dd className="font-mono">{formatPrice(p.price)}</dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
