import type { ContactInfo } from "@/types/models";
import { cn } from "@/lib/utils";

/**
 * Redes sociales del negocio con icono grande. Toma las URLs de
 * `siteSetting.contactInfo`; solo se muestran las que estén capturadas.
 */

type SocialKey = "facebook" | "instagram" | "tiktok" | "whatsapp";

interface SocialItem {
  key: SocialKey;
  label: string;
  href: string;
  /** Texto secundario: el @usuario sacado de la URL, o el número. */
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

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21.9v-7.4h2.5l.4-3h-2.9V9.6c0-.9.3-1.5 1.5-1.5h1.6V5.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5v7.4h3z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z" />
    </svg>
  );
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5zm0 17.3a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A7.8 7.8 0 1 1 12 19.8zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}

function buildItems(c: ContactInfo | undefined): SocialItem[] {
  if (!c) return [];
  const items: SocialItem[] = [];

  if (c.instagram) {
    items.push({
      key: "instagram",
      label: "Instagram",
      href: c.instagram,
      handle: handleFromUrl(c.instagram),
      color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
      icon: <InstagramIcon className="h-9 w-9" />,
    });
  }
  if (c.facebook) {
    items.push({
      key: "facebook",
      label: "Facebook",
      href: c.facebook,
      handle: handleFromUrl(c.facebook),
      color: "bg-[#1877f2] text-white",
      icon: <FacebookIcon className="h-10 w-10" />,
    });
  }
  if (c.tiktok) {
    items.push({
      key: "tiktok",
      label: "TikTok",
      href: c.tiktok,
      handle: handleFromUrl(c.tiktok),
      color: "bg-black text-white ring-1 ring-white/20",
      icon: <TikTokIcon className="h-9 w-9" />,
    });
  }
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
