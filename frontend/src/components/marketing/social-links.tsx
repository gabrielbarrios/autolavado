import type { ContactInfo, SocialLink } from "@/types/models";
import { cn } from "@/lib/utils";
import { SOCIAL_NETWORKS } from "@/components/marketing/social-networks";

/**
 * Redes sociales del negocio con icono grande. Toma
 * `siteSetting.contactInfo.socialLinks` (repetible en Strapi) y, aparte, el
 * WhatsApp del mismo bloque. Debajo del nombre de la red va el `customName`
 * capturado en Strapi; si no hay, el @usuario sacado de la URL.
 */

interface SocialItem {
  key: string;
  label: string;
  href: string;
  /** Texto secundario: customName, el @usuario de la URL, o el número. */
  handle: string | null;
  /** Clases del círculo del icono (color de marca). */
  color: string;
  icon: React.ReactNode;
}

/** "https://instagram.com/autolavado_mx/" → "@autolavado_mx". */
function handleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    const last = seg[seg.length - 1];
    if (!last || last.length > 40) return null;
    return last.startsWith("@") ? last : `@${last}`;
  } catch {
    return null;
  }
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5zm0 17.3a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A7.8 7.8 0 1 1 12 19.8zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}

function itemFromLink(link: SocialLink): SocialItem | null {
  const meta = SOCIAL_NETWORKS[link.network];
  if (!meta || !link.url) return null;
  const custom = link.customName?.trim();
  return {
    key: `${link.network}-${link.id}`,
    label: meta.label,
    href: link.url,
    handle: custom || handleFromUrl(link.url),
    color: meta.color,
    icon: <meta.Icon className="h-9 w-9" />,
  };
}

function buildItems(c: ContactInfo | undefined): SocialItem[] {
  if (!c) return [];
  const items = (c.socialLinks ?? []).map(itemFromLink).filter((i): i is SocialItem => i !== null);

  if (c.whatsapp) {
    items.push({
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`,
      handle: c.whatsapp,
      color: "bg-[#25d366] text-white",
      icon: <WhatsAppIcon className="h-9 w-9" />,
    });
  }
  return items;
}

export function SocialLinks({ contact, className }: { contact?: ContactInfo; className?: string }) {
  const items = buildItems(contact);
  if (items.length === 0) return null;

  return (
    <ul className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      {items.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.label}${s.handle ? ` ${s.handle}` : ""} (se abre en una pestaña nueva)`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-6 text-center transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-105",
                s.color,
              )}
            >
              {s.icon}
            </span>
            <span className="text-sm font-semibold">{s.label}</span>
            {s.handle && <span className="truncate text-xs text-muted-foreground">{s.handle}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
