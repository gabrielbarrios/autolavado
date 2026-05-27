import { NextResponse, type NextRequest } from "next/server";
import { fetchAvailableSlots } from "@/lib/strapi/appointments";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? "";
  const rawPackageId = Number(req.nextUrl.searchParams.get("packageId"));
  const packageId = Number.isFinite(rawPackageId) && rawPackageId > 0 ? rawPackageId : null;
  const excludeRaw = req.nextUrl.searchParams.get("excludeAppointmentId");
  const excludeAppointmentId = excludeRaw ? Number(excludeRaw) : undefined;
  const extraServiceIds = (req.nextUrl.searchParams.get("extraServiceIds") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (!packageId && extraServiceIds.length === 0)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const data = await fetchAvailableSlots(date, packageId, extraServiceIds, excludeAppointmentId);
  return NextResponse.json(data ?? { closed: true, reason: "Sin disponibilidad", slots: [] });
}
