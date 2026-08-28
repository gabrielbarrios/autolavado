import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { listVehicleTypes } from "@/lib/strapi/vehicle-types";
import { VehicleTypesProvider } from "@/components/shared/vehicle-types-provider";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [setting, vehicleTypes] = await Promise.all([
    getSiteSetting(),
    listVehicleTypes().catch(() => []),
  ]);
  return (
    <VehicleTypesProvider types={vehicleTypes}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader setting={setting} />
        <main className="flex-1">{children}</main>
        <SiteFooter setting={setting} />
      </div>
    </VehicleTypesProvider>
  );
}
