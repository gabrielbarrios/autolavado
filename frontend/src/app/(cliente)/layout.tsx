import { requireUser } from "@/lib/auth/guards";
import { ClienteShell } from "@/components/cliente/cliente-shell";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <ClienteShell user={{ name: user.name ?? user.username, email: user.email }}>
      {children}
    </ClienteShell>
  );
}
