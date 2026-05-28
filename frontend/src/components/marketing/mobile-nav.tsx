"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string };

export function MobileNav({
  nav,
  authenticated,
}: {
  nav: NavItem[];
  authenticated: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  // Cierra con Escape y bloquea scroll del body mientras está abierto.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-background/70 backdrop-blur-sm md:hidden"
            onClick={close}
          />
          <div
            id="mobile-nav-panel"
            className="fixed inset-x-0 top-16 z-40 border-b border-border/40 bg-background shadow-lg md:hidden"
          >
            <nav className="container mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="rounded-md px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              {!authenticated && (
                <>
                  <Link
                    href="/login"
                    onClick={close}
                    className="rounded-md px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Iniciar sesión
                  </Link>
                  <Button asChild variant="premium" size="lg" className="mt-2">
                    <Link href="/registro" onClick={close}>
                      Registrarse
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
