import { requireUser } from "@/lib/auth/guards";
import { QrCard } from "@/components/cliente/qr-card";
import { getSiteSetting } from "@/lib/strapi/site-setting";

export const metadata = { title: "Mi QR" };

export default async function QrPage() {
  const { user } = await requireUser();
  const setting = await getSiteSetting().catch(() => null);
  const token = user.qrToken || `user-${user.id}`;
  const businessName = setting?.businessName?.trim() || "Autolavado";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tu QR personal</h1>
        <p className="text-muted-foreground">
          Muéstralo al personal al llegar. Acelera el registro y aplica tus promociones.
        </p>
      </div>
      <QrCard token={token} name={user.name ?? user.username} businessName={businessName} />
    </div>
  );
}
