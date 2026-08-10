import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { QrCard } from "@/components/cliente/qr-card";
import { ServiceTracker } from "@/components/cliente/service-tracker";
import { AutoRefresh } from "@/components/cliente/auto-refresh";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { loadMyActiveServices } from "@/lib/strapi/visits";

export const metadata = { title: "Mi QR" };

export default async function QrPage() {
  const { user } = await requireUser();
  const [setting, active] = await Promise.all([
    getSiteSetting().catch(() => null),
    loadMyActiveServices(),
  ]);
  const token = user.qrToken || `user-${user.id}`;
  const businessName = setting?.businessName?.trim() || "Autolavado";
  // El estado vacío no se muestra acá (el cliente viene a enseñar el QR, no a
  // consultar): solo aparece el seguimiento cuando ya hay algo que seguir.
  const showTracker = active.services.length > 0 || !active.ok;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tu QR personal</h1>
        <p className="text-muted-foreground">
          Muéstralo al personal al llegar. Acelera el registro y aplica tus promociones.
        </p>
      </div>
      <QrCard token={token} name={user.name ?? user.username} businessName={businessName} />

      {/* Siempre montado: en cuanto el personal registre el auto, el seguimiento
          aparece acá mismo sin que el cliente tenga que recargar ni navegar. */}
      <AutoRefresh intervalMs={20000} />

      {showTracker ? (
        <ServiceTracker services={active.services} failed={!active.ok} />
      ) : (
        <p className="text-sm text-muted-foreground">
          En cuanto registren tu auto, el avance del lavado aparecerá aquí y en{" "}
          <Link href="/mi-auto" className="font-medium text-primary hover:underline">
            Estado de mi auto
          </Link>
          .
        </p>
      )}
    </div>
  );
}
