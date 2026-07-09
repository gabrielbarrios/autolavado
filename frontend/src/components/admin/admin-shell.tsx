"use client";

import { LayoutDashboard, QrCode, Users, Package, ShoppingBag, Gift, Calendar, Wrench, Sparkles, UserPlus, Clock, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escanear", label: "Escanear QR", icon: QrCode },
  { href: "/walk-in", label: "Walk-in", icon: UserPlus },
  { href: "/en-progreso", label: "Tablero", icon: Clock },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/paquetes-admin", label: "Paquetes", icon: Package },
  { href: "/extras-admin", label: "Otros servicios", icon: Sparkles },
  { href: "/productos-admin", label: "Productos", icon: ShoppingBag },
  { href: "/promociones-admin", label: "Promociones", icon: Gift },
  { href: "/reservaciones", label: "Reservaciones", icon: Calendar },
  { href: "/servicios", label: "Servicios", icon: Wrench },
];

// Solo super admin: supervisión de empleados (admins).
const SUPERADMIN_NAV = [{ href: "/empleados", label: "Empleados", icon: ShieldCheck }];

export function AdminShell({
  user,
  isSuperAdmin = false,
  children,
}: {
  user: { name?: string; email: string };
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}) {
  const nav = isSuperAdmin ? [...NAV, ...SUPERADMIN_NAV] : NAV;
  return (
    <DashboardShell
      nav={nav}
      user={{ name: user.name, email: user.email, role: isSuperAdmin ? "Super Admin" : "admin" }}
      onLogout={() => logoutAction()}
    >
      {children}
    </DashboardShell>
  );
}
