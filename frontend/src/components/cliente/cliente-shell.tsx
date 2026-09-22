"use client";

import { User, Car, QrCode, Calendar, History, Gift, ShoppingBag, Receipt, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { logoutAction } from "@/actions/auth";
import { STORE_ENABLED } from "@/lib/constants";
import type { DashboardShellProps } from "@/components/shared/dashboard-shell";
import type { UserRole } from "@/types/models";

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  superadmin: "Super Admin",
  admin: "Admin",
  employee: "Empleado",
  vip: "VIP",
};

const NAV = [
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/mi-auto", label: "Estado de mi auto", icon: Sparkles },
  { href: "/autos", label: "Mis autos", icon: Car },
  { href: "/qr", label: "Mi QR", icon: QrCode },
  { href: "/reservar", label: "Reservar", icon: Calendar },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/mis-promociones", label: "Promociones", icon: Gift },
  ...(STORE_ENABLED
    ? [
        { href: "/pedidos", label: "Mis pedidos", icon: Receipt },
        { href: "/tienda", label: "Tienda", icon: ShoppingBag },
      ]
    : []),
];

export function ClienteShell({
  user,
  brand,
  role = "cliente",
  isStaff = false,
  activeServices = 0,
  children,
}: {
  user: { name?: string; email: string };
  brand?: DashboardShellProps["brand"];
  role?: UserRole;
  /** Empleado, admin o super admin: se le pone el botón directo al panel. */
  isStaff?: boolean;
  /** Lavados en curso: alimenta el contador junto a "Estado de mi auto". */
  activeServices?: number;
  children: React.ReactNode;
}) {
  const nav = NAV.map((item) =>
    item.href === "/mi-auto" ? { ...item, badge: activeServices } : item,
  );

  return (
    <DashboardShell
      nav={nav}
      brand={brand}
      user={{ name: user.name, email: user.email, role: ROLE_LABELS[role] ?? "cliente" }}
      dashboardHref={isStaff ? "/dashboard" : undefined}
      onLogout={() => logoutAction()}
    >
      {children}
    </DashboardShell>
  );
}
