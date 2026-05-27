import { listPackages } from "@/lib/strapi/packages";
import { listExtraServices } from "@/lib/strapi/extra-services";
import { QrScanner } from "@/components/admin/qr-scanner";

export const metadata = { title: "Escanear QR" };

export default async function EscanearPage() {
  const [packages, extras] = await Promise.all([
    listPackages().catch(() => []),
    listExtraServices().catch(() => []),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escanear QR</h1>
        <p className="text-muted-foreground">Identifica al cliente y registra su servicio.</p>
      </div>
      <QrScanner packages={packages} extraServices={extras} />
    </div>
  );
}
