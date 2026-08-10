import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { loadMyActiveServices } from "@/lib/strapi/visits";
import { ServiceTracker } from "@/components/cliente/service-tracker";
import { AutoRefresh } from "@/components/cliente/auto-refresh";

export const metadata = { title: "Estado de mi auto" };

export default async function MiAutoPage() {
  // Solo como guardia de sesión: el backend resuelve el dueño desde el JWT.
  await requireUser();
  const active = await loadMyActiveServices();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">¿Dónde está mi auto?</h1>
        <p className="text-muted-foreground">
          El avance se actualiza solo mientras tengas esta página abierta.
        </p>
      </div>

      {/* Siempre montado: si el personal inicia el lavado mientras el cliente
          mira esta página, el seguimiento aparece sin que tenga que recargar. */}
      <AutoRefresh intervalMs={15000} />

      <ServiceTracker services={active.services} failed={!active.ok} />

      <p className="text-sm text-muted-foreground">
        Los lavados ya cobrados están en tu{" "}
        <Link href="/historial" className="font-medium text-primary hover:underline">
          historial
        </Link>
        .
      </p>
    </div>
  );
}
