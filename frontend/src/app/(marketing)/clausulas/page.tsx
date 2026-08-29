import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Clauses } from "@/components/marketing/clauses";
import { clausesTitle } from "@/lib/clauses";
import { getSiteSetting } from "@/lib/strapi/site-setting";

export const metadata = { title: "Cláusulas" };

export default async function ClausulasPage() {
  const setting = await getSiteSetting();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-8 w-8 text-amber-500" />
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {clausesTitle(setting?.businessName)}
        </h1>
        <p className="mt-4 text-muted-foreground">
          Al dejar tu auto con nosotros aceptas estas condiciones del servicio.
        </p>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="p-6 sm:p-8">
          <Clauses variant="page" />
        </CardContent>
      </Card>

      {setting?.contactInfo?.phone && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Dudas sobre alguna cláusula? Llámanos al {setting.contactInfo.phone}.
        </p>
      )}
    </div>
  );
}
