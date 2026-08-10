import { requireUser } from "@/lib/auth/guards";
import { loadMyActiveServices } from "@/lib/strapi/visits";
import { ClienteShell } from "@/components/cliente/cliente-shell";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  // El contador del nav vive en el layout para que se vea desde cualquier página
  // del cliente, no solo en /perfil. Se refresca con cada router.refresh().
  const active = await loadMyActiveServices();

  return (
    <ClienteShell
      user={{ name: user.name ?? user.username, email: user.email }}
      activeServices={active.services.length}
    >
      {children}
    </ClienteShell>
  );
}
