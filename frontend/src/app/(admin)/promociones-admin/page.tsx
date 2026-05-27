import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { strapiServerFetch } from "@/lib/strapi/server";
import type { Promotion } from "@/types/models";
import type { StrapiCollectionResponse } from "@/types/strapi";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Promociones" };

async function listAllPromotions(): Promise<Promotion[]> {
  try {
    const res = await strapiServerFetch<StrapiCollectionResponse<Promotion>>("/api/promotions", {
      query: {
        "populate[user]": "true",
        "sort[0]": "createdAt:desc",
        "pagination[pageSize]": "200",
      },
      cache: "no-store",
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export default async function PromocionesAdminPage() {
  const promos = await listAllPromotions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
        <p className="text-muted-foreground">Todas las promociones generadas (manuales y automáticas).</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Válida hasta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Sin promociones.
                    </td>
                  </tr>
                ) : (
                  promos.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3">{p.user?.name ?? p.user?.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        {p.discountType === "percent"
                          ? `${p.discountValue}%`
                          : p.discountType === "fixed"
                          ? `-$${p.discountValue}`
                          : "Gratis"}
                      </td>
                      <td className="px-4 py-3">{formatDate(p.validUntil)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.used ? "outline" : "success"}>{p.used ? "Usada" : "Activa"}</Badge>
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
