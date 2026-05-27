import { Suspense } from "react";
import { requireUser } from "@/lib/auth/guards";
import { listPackages } from "@/lib/strapi/packages";
import { listMyVehicles } from "@/lib/strapi/vehicles";
import { listExtraServices } from "@/lib/strapi/extra-services";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { BookingForm } from "@/components/cliente/booking-form";

export const metadata = { title: "Reservar" };

export default async function ReservarPage() {
  const { user } = await requireUser();
  const [packages, vehicles, setting, extras] = await Promise.all([
    listPackages().catch(() => []),
    listMyVehicles(user.id).catch(() => []),
    getSiteSetting().catch(() => null),
    listExtraServices().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reservar servicio</h1>
        <p className="text-muted-foreground">Selecciona paquete, auto, horario y extras.</p>
      </div>
      <Suspense>
        <BookingForm
          packages={packages}
          vehicles={vehicles}
          businessHours={setting?.businessHours ?? []}
          closedDates={setting?.closedDates ?? []}
          extraServices={extras}
        />
      </Suspense>
    </div>
  );
}
