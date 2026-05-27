import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/shared/site-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getSession } from "@/lib/auth/session";
import type { SiteSetting } from "@/types/models";

const NAV = [
  { href: "/paquetes", label: "Paquetes" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contacto" },
];

export async function SiteHeader({ setting }: { setting?: SiteSetting | null }) {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <SiteLogo name={setting?.businessName ?? undefined} logo={setting?.logo ?? null} />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <Button asChild size="sm">
              <Link href={session.role === "admin" ? "/dashboard" : "/perfil"}>
                {session.role === "admin" ? "Dashboard" : "Mi cuenta"}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" variant="premium">
                <Link href="/registro">Registrarse</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
