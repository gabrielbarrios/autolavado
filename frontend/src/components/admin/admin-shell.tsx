"use client";

import { LayoutDashboard, QrCode, Users, Package, ShoppingBag, Gift, Calendar, Wrench, Sparkles, UserPlus, Clock, ShieldCheck, Cookie } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NewAppointmentWatcher } from "@/components/admin/new-appointment-watcher";
import { logoutAction } from "@/actions/auth";
import { STORE_ENABLED, EMPLOYEE_ROUTES } from "@/lib/constants";
import type { DashboardShellProps } from "@/components/shared/dashboard-shell";
import type { UserRole } from "@/types/models";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escanear", label: "Escanear QR", icon: QrCode },
  { href: "/walk-in", label: "Walk-in", icon: UserPlus },
  { href: "/en-progreso", label: "Tablero", icon: Clock },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/paquetes-admin", label: "Paquetes", icon: Package },
  { href: "/extras-admin", label: "Otros servicios", icon: Sparkles },
  { href: "/snacks-admin", label: "Snacks", icon: Cookie },
  ...(STORE_ENABLED ? [{ href: "/productos-admin", label: "Productos", icon: ShoppingBag }] : []),
  { href: "/promociones-admin", label: "Promociones", icon: Gift },
  { href: "/reservaciones", label: "Reservaciones", icon: Calendar },
  { href: "/servicios", label: "Servicios", icon: Wrench },
];

// Solo super admin: supervisión de empleados (admins).
const SUPERADMIN_NAV = [{ href: "/empleados", label: "Empleados", icon: ShieldCheck }];

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  superadmin: "Super Admin",
  employee: "Empleado",
  admin: "admin",
};

export function AdminShell({
  user,
  brand,
  role,
  children,
}: {
  user: { name?: string; email: string };
  brand?: DashboardShellProps["brand"];
  role: UserRole;
  children: React.ReactNode;
}) {
  // El empleado solo ve la operación del día; el resto del menú es de admin.
  // Ocultarlo no basta (la URL sigue ahí): cada página lo confirma en servidor.
  const base =
    role === "employee"
      ? NAV.filter((item) => (EMPLOYEE_ROUTES as readonly string[]).includes(item.href))
      : NAV;
  const nav = role === "superadmin" ? [...base, ...SUPERADMIN_NAV] : base;

  return (
    <DashboardShell
      nav={nav}
      brand={brand}
      user={{ name: user.name, email: user.email, role: ROLE_LABELS[role] ?? role }}
      onLogout={() => logoutAction()}
    >
      {/* Sondea reservaciones nuevas mientras el panel esté abierto. */}
      <NewAppointmentWatcher />
      {children}
    </DashboardShell>
  );
}
