"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Menu, X } from "lucide-react";
import { SiteLogo } from "@/components/shared/site-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { StrapiMedia } from "@/types/strapi";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contador opcional al final del item (ej. lavados en curso). 0/undefined = no se muestra. */
  badge?: number;
}

export interface DashboardShellProps {
  nav: NavItem[];
  user: { name?: string; email: string; role: string };
  /** Marca del negocio (site-setting). Sin ella el logo cae al genérico. */
  brand?: { name?: string; logo?: StrapiMedia | null };
  children: React.ReactNode;
  onLogout: () => void;
}

export function DashboardShell({ nav, user, brand, children, onLogout }: DashboardShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/70 px-4 backdrop-blur md:px-6">
        <SiteLogo name={brand?.name} logo={brand?.logo ?? null} />
        <div className="flex items-center gap-2">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium">{user.name ?? user.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="hidden md:inline-flex"
          >
            Salir
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-border/40 bg-card/30 p-4 md:block">
          <NavList items={nav} pathname={pathname} />
        </aside>

        {/* Sidebar móvil */}
        {open && (
          <div className="fixed inset-x-0 top-16 z-20 border-b border-border bg-background p-4 md:hidden">
            <NavList items={nav} pathname={pathname} onNavigate={() => setOpen(false)} />
            <Separator className="my-4" />
            <Button variant="outline" className="w-full" onClick={onLogout}>
              Cerrar sesión
            </Button>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {!!item.badge && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
