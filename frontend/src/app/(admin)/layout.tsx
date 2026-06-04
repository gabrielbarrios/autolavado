import { requireAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin();
  return (
    <AdminShell
      user={{ name: user.name ?? user.username, email: user.email }}
      isSuperAdmin={role === "superadmin"}
    >
      {children}
    </AdminShell>
  );
}
