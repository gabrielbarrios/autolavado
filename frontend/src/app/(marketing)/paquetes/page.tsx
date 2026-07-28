import { listPackages } from "@/lib/strapi/packages";
import { listExtraServices } from "@/lib/strapi/extra-services";
import { PackagesGrid } from "@/components/marketing/packages-grid";
import { getSession, isVipRole } from "@/lib/auth/session";

export const metadata = { title: "Paquetes" };

export default async function PaquetesPage() {
  const [packages, extras, session] = await Promise.all([
    listPackages().catch(() => []),
    listExtraServices().catch(() => []),
    getSession().catch(() => null),
  ]);
  const isVip = isVipRole(session?.role);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Nuestros paquetes
        </h1>
        <p className="mt-4 text-muted-foreground">
          Servicios pensados para cada necesidad. El precio varía según el tipo de auto.
        </p>
      </div>

      <PackagesGrid packages={packages} extras={extras} isVip={isVip} />
    </div>
  );
}
