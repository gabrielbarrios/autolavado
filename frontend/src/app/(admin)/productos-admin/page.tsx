import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAllProductsAdmin } from "@/lib/strapi/products";
import { strapiMediaUrl, formatPrice } from "@/lib/utils";

export const metadata = { title: "Productos" };

export default async function ProductosAdminPage() {
  const products = await listAllProductsAdmin().catch(() => []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Catálogo de la tienda online.</p>
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337"}/admin/content-manager/collection-types/api::product.product`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          Abrir en Strapi →
        </a>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
