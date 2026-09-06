import { NextResponse, type NextRequest } from "next/server";
import { getSession, isStaffRole } from "@/lib/auth/session";
import { listAllAppointments } from "@/lib/strapi/appointments";

/**
 * Sondeo del panel: ¿entraron reservaciones nuevas?
 *
 * El cliente manda el id más alto que ya conoce (`since`) y aquí se devuelven
 * solo las pendientes por encima de ese id. Con `since` vacío no se devuelve
 * ninguna: esa primera llamada solo sirve para fijar la línea base, así al
 * abrir el panel no salta un aviso por reservaciones que ya estaban.
 *
 * Vive en una route de Next y no en Strapi porque el JWT está en una cookie
 * httpOnly que el navegador no puede leer (ver lib/strapi/server.ts).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // El empleado también atiende reservaciones: el aviso es suyo también.
  if (!isStaffRole(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = req.nextUrl.searchParams.get("since");
  const since = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  const pending = await listAllAppointments("pending").catch(() => []);
  const latestId = pending.reduce((max, a) => Math.max(max, a.id), 0);

  const fresh =
    since === null
      ? []
      : pending
          .filter((a) => a.id > since)
          .sort((a, b) => b.id - a.id)
          .slice(0, 5)
          .map((a) => ({
            id: a.id,
            date: a.date,
            timeSlot: a.timeSlot,
            customer: a.user?.name ?? a.user?.email ?? null,
            vehicle: a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model}` : null,
            packageName: a.package?.name ?? null,
          }));

  return NextResponse.json({ latestId, pendingCount: pending.length, new: fresh });
}
