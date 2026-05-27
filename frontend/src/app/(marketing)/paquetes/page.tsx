import { listPackages } from "@/lib/strapi/packages";
import { listExtraServices } from "@/lib/strapi/extra-services";
import { PackagesGrid } from "@/components/marketing/packages-grid";

export const metadata = { title: "Paquetes" };

export default async function PaquetesPage() {
  const [packages, extras] = await Promise.all([
    listPackages().catch(() => []),
    listExtraServices().catch(() => []),
  ]);

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

      <PackagesGrid packages={packages} extras={extras} />
    </div>
  );
}
