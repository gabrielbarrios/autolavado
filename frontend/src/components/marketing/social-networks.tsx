import { Linkedin, Youtube } from "lucide-react";
import type { SocialNetwork } from "@/types/models";

/**
 * Catálogo de redes sociales que el sitio sabe dibujar. Es el espejo del enum
 * `network` de `shared.social-link` en Strapi: si se agrega un valor allá hay
 * que darle aquí su etiqueta, color de marca e icono. Una red desconocida no
 * se pinta (ver los `filter` en SocialLinks y SiteFooter).
 */

type IconProps = React.SVGProps<SVGSVGElement>;

function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21.9v-7.4h2.5l.4-3h-2.9V9.6c0-.9.3-1.5 1.5-1.5h1.6V5.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5v7.4h3z" />
    </svg>
  );
}

function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z" />
    </svg>
  );
}

function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.5 3h3l-6.8 7.8L21.7 21h-6.2l-4.9-6.4L5 21H2l7.3-8.4L1.7 3H8l4.4 5.8L17.5 3zm-1.1 16.2h1.7L7 4.7H5.2l11.2 14.5z" />
    </svg>
  );
}

function ThreadsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 21c-5 0-7.5-3.2-7.5-9S7 3 12 3c4.3 0 6.6 2.1 7.2 5.2" />
      <path d="M15.6 12.3c0 3.1-1.6 4.9-4 4.9-1.8 0-3.1-1-3.1-2.5 0-1.6 1.4-2.6 3.6-2.6 1.3 0 2.5.3 3.5.7" />
      <path d="M15.6 12.3c0-2.4-1.3-3.8-3.3-3.8-1.3 0-2.4.6-3 1.6" />
      <path d="M15.6 12.3c1.6.8 2.6 2 2.6 3.6 0 2.9-2.6 5.1-6.2 5.1" />
    </svg>
  );
}

interface NetworkMeta {
  label: string;
  /** Clases del círculo grande del icono (color de marca). */
  color: string;
  Icon: (props: IconProps) => React.ReactNode;
}

export const SOCIAL_NETWORKS: Record<SocialNetwork, NetworkMeta> = {
  facebook: { label: "Facebook", color: "bg-[#1877f2] text-white", Icon: FacebookIcon },
  instagram: {
    label: "Instagram",
    color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
    Icon: InstagramIcon,
  },
  tiktok: { label: "TikTok", color: "bg-black text-white ring-1 ring-white/20", Icon: TikTokIcon },
  youtube: { label: "YouTube", color: "bg-[#ff0000] text-white", Icon: Youtube },
  x: { label: "X", color: "bg-black text-white ring-1 ring-white/20", Icon: XIcon },
  threads: { label: "Threads", color: "bg-black text-white ring-1 ring-white/20", Icon: ThreadsIcon },
  linkedin: { label: "LinkedIn", color: "bg-[#0a66c2] text-white", Icon: Linkedin },
};

export function SocialNetworkIcon({ network, className }: { network: SocialNetwork; className?: string }) {
  const meta = SOCIAL_NETWORKS[network];
  if (!meta) return null;
  const Icon = meta.Icon;
  return <Icon className={className} />;
}
