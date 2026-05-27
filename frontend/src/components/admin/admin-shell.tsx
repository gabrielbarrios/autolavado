"use client";

import { LayoutDashboard, QrCode, Users, Package, ShoppingBag, Gift, Calendar, Wrench, Sparkles, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escanear", label: "Escanear QR", icon: QrCode },
  { href: "/walk-in", label: "Walk-in", icon: UserPlus },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/paquetes-admin", label: "Paquetes", icon: Package },
  { href: "/extras-admin", label: "Otros servicios", icon: Sparkles },
  { href: "/productos-admin", label: "Productos", icon: ShoppingBag },
  { href: "/promociones-admin", label: "Promociones", icon: Gift },
  { href: "/reservaciones", label: "Reservaciones", icon: Calendar },
  { href: "/servicios", label: "Servicios", icon: Wrench },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name?: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      nav={NAV}
      user={{ name: user.name, email: user.email, role: "admin" }}
      onLogout={() => logoutAction()}
    >
      {children}
    </DashboardShell>
  );
}
