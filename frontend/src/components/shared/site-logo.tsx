import Link from "next/link";
import Image from "next/image";
import { Droplets } from "lucide-react";
import { cn, strapiMediaUrl } from "@/lib/utils";
import type { StrapiMedia } from "@/types/strapi";

interface SiteLogoProps {
  className?: string;
  href?: string;
  name?: string;
  logo?: StrapiMedia | null;
}

export function SiteLogo({ className, href = "/", name, logo }: SiteLogoProps) {
  const displayName = name?.trim() || "AutoLavado";
  // Split for the "Auto"/"Lavado" two-tone style when no custom logo
  const [first, ...rest] = displayName.split(" ");
  const second = rest.join(" ");
  const logoUrl = logo ? strapiMediaUrl(logo, "thumbnail") : null;

  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      {logoUrl ? (
        <span className="relative h-12 w-12 overflow-hidden rounded-lg">
          <Image src={logoUrl} alt={displayName} fill sizes="48px" className="object-cover" />
        </span>
      ) : (
        <span className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
          <Droplets className="h-7 w-7 text-white" />
        </span>
      )}
      <span className="text-xl">
        {second ? (
          <>
            {first}
            <span className="text-primary"> {second}</span>
          </>
        ) : (
          first
        )}
      </span>
    </Link>
  );
}
