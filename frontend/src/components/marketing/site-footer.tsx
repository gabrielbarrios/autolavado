import Link from "next/link";
import { Facebook, Instagram, MessageCircle, Music2 } from "lucide-react";
import { SiteLogo } from "@/components/shared/site-logo";
import { dayLabel, hoursByDay, WEEK_DAYS, formatTime } from "@/lib/business-hours";
import type { SiteSetting } from "@/types/models";

export function SiteFooter({ setting }: { setting?: SiteSetting | null }) {
  const contact = setting?.contactInfo;
  const hoursIndex = hoursByDay(setting?.businessHours);

  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <SiteLogo name={setting?.businessName ?? undefined} logo={setting?.logo ?? null} />
            <p className="text-sm text-muted-foreground">
              {setting?.description ??
                "Servicio premium de autolavado. Reserva en línea, acumula visitas y recibe promociones automáticas."}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Navegación</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/paquetes">Paquetes</Link></li>
              <li><Link className="hover:text-foreground" href="/tienda">Tienda</Link></li>
              <li><Link className="hover:text-foreground" href="/contacto">Contacto</Link></li>
              <li><Link className="hover:text-foreground" href="/login">Iniciar sesión</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Horarios</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {WEEK_DAYS.map((day) => {
                const h = hoursIndex[day];
                const isClosed = !h || h.closed || (!h.open && !h.close);
                return (
                  <li key={day} className="flex justify-between gap-3">
                    <span>{dayLabel(day)}</span>
                    <span className={isClosed ? "text-destructive/70" : "text-foreground"}>
                      {isClosed ? "Cerrado" : `${formatTime(h?.open)} - ${formatTime(h?.close)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Contacto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {contact?.address && <li>{contact.address}</li>}
              {contact?.phone && <li>Tel: {contact.phone}</li>}
              {contact?.whatsapp && <li>WhatsApp: {contact.whatsapp}</li>}
              {contact?.email && <li>{contact.email}</li>}
            </ul>
            <div className="mt-4 flex gap-3 text-muted-foreground">
              {contact?.facebook && (
                <a href={contact.facebook} aria-label="Facebook" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {contact?.instagram && (
                <a href={contact.instagram} aria-label="Instagram" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {contact?.tiktok && (
                <a href={contact.tiktok} aria-label="TikTok" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  <Music2 className="h-4 w-4" />
                </a>
              )}
              {contact?.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                  aria-label="WhatsApp"
                  className="hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {setting?.businessName ?? "AutoLavado"}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
