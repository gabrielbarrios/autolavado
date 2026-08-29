import { Hero } from "@/components/marketing/hero";
import { ServicesShowcase } from "@/components/marketing/services-showcase";
import { ExtraServicesShowcase } from "@/components/marketing/extra-services-showcase";
import { Benefits } from "@/components/marketing/benefits";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Gallery } from "@/components/marketing/gallery";
import { Testimonials } from "@/components/marketing/testimonials";
import { FAQ } from "@/components/marketing/faq";
import { CTA } from "@/components/marketing/cta";
import { Clauses } from "@/components/marketing/clauses";
import { listPackages } from "@/lib/strapi/packages";
import { listExtraServices } from "@/lib/strapi/extra-services";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { getSession, isVipRole } from "@/lib/auth/session";

export default async function HomePage() {
  const [packages, extras, setting, session] = await Promise.all([
    listPackages({ featuredOnly: true, pageSize: 3 }).catch(() => []),
    listExtraServices().catch(() => []),
    getSiteSetting().catch(() => null),
    getSession().catch(() => null),
  ]);
  const isVip = isVipRole(session?.role);

  return (
    <>
      <Hero setting={setting} />
      <ServicesShowcase packages={packages} isVip={isVip} />
      <ExtraServicesShowcase services={extras} isVip={isVip} />
      <Benefits />
      <HowItWorks />
      <Gallery images={setting?.gallery} />
      <Testimonials items={setting?.testimonials} />
      <FAQ faqs={setting?.faqs} />
      <Clauses businessName={setting?.businessName} />
      <CTA />
    </>
  );
}
