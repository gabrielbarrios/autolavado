import { listExtraServices } from "@/lib/strapi/extra-services";
import { ExtraServicesSelector } from "@/components/marketing/extra-services-selector";
import { getSession, isVipRole } from "@/lib/auth/session";

export const metadata = { title: "Otros servicios" };

export default async function ServiciosPage() {
  const [services, session] = await Promise.all([
    listExtraServices().catch(() => []),
    getSession().catch(() => null),
  ]);
  const isVip = isVipRole(session?.role);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Otros servicios
        </h1>
        <p className="mt-4 text-muted-foreground">
          Servicios sueltos a precio fijo. Puedes reservar uno o varios sin necesidad de un paquete.
        </p>
      </div>

      <ExtraServicesSelector services={services} isVip={isVip} />
    </div>
  );
}
