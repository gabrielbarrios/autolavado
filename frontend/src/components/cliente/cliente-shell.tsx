"use client";

import { User, Car, QrCode, Calendar, History, Gift, ShoppingBag, Receipt } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/autos", label: "Mis autos", icon: Car },
  { href: "/qr", label: "Mi QR", icon: QrCode },
  { href: "/reservar", label: "Reservar", icon: Calendar },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/promociones", label: "Promociones", icon: Gift },
  { href: "/pedidos", label: "Mis pedidos", icon: Receipt },
  { href: "/tienda", label: "Tienda", icon: ShoppingBag },
];

export function ClienteShell({
  user,
  children,
}: {
  user: { name?: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      nav={NAV}
      user={{ name: user.name, email: user.email, role: "cliente" }}
      onLogout={() => logoutAction()}
    >
      {children}
    </DashboardShell>
  );
}
