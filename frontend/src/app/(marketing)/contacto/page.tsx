import { Mail, MapPin, Phone, Clock, CalendarX, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteSetting } from "@/lib/strapi/site-setting";
import { dayLabel, hoursByDay, WEEK_DAYS, formatTime } from "@/lib/business-hours";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Contacto" };

export default async function ContactoPage() {
  const setting = await getSiteSetting().catch(() => null);
  const c = setting?.contactInfo;
  const hoursIndex = hoursByDay(setting?.businessHours);
  const closedDates = (setting?.closedDates ?? [])
    .filter((d) => new Date(d.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Contáctanos</h1>
        <p className="mt-4 text-muted-foreground">
          {setting?.businessName ?? "AutoLavado"} — estamos para atenderte.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c?.address && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <MapPin className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Dirección</p>
              <p className="text-xs text-muted-foreground">{c.address}</p>
            </CardContent>
          </Card>
        )}
        {c?.phone && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <Phone className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Teléfono</p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </CardContent>
          </Card>
        )}
        {c?.whatsapp && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <MessageCircle className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">WhatsApp</p>
              <a
                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                className="text-xs text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.whatsapp}
              </a>
            </CardContent>
          </Card>
        )}
        {c?.email && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Correo</p>
              <p className="text-xs text-muted-foreground">{c.email}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Horarios</h2>
            </div>
            <ul className="space-y-2 text-sm">
              {WEEK_DAYS.map((day) => {
                const h = hoursIndex[day];
                const isClosed = !h || h.closed || (!h.open && !h.close);
                return (
                  <li key={day} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                    <span className="font-medium">{dayLabel(day)}</span>
                    <span className={isClosed ? "text-muted-foreground" : "font-mono"}>
                      {isClosed ? "Cerrado" : `${formatTime(h?.open)} - ${formatTime(h?.close)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Próximos días cerrados</h2>
            </div>
            {closedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay días cerrados próximos.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {closedDates.map((d) => (
                  <li key={d.id} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                    <span className="font-medium">{formatDate(d.date)}</span>
                    <span className="text-muted-foreground">{d.reason ?? "Cerrado"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {c?.mapUrl && (
        <div className="mt-10 overflow-hidden rounded-2xl border border-border/60">
          <iframe src={c.mapUrl} className="aspect-video w-full" loading="lazy" allowFullScreen title="Mapa" />
        </div>
      )}
    </div>
  );
}
