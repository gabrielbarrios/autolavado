import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteSetting } from "@/lib/strapi/site-setting";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const setting = await getSiteSetting();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader setting={setting} />
      <main className="flex-1">{children}</main>
      <SiteFooter setting={setting} />
    </div>
  );
}
