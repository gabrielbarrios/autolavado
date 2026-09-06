import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "autolavado_session";

const CLIENT_PROTECTED = ["/perfil", "/autos", "/reservar", "/historial", "/mis-promociones", "/qr", "/pedidos", "/carrito/checkout"];
const ADMIN_PROTECTED = ["/dashboard", "/escanear", "/walk-in", "/en-progreso", "/clientes", "/paquetes-admin", "/extras-admin", "/productos-admin", "/snacks", "/promociones-admin", "/reservaciones", "/servicios"];
const AUTH_ROUTES = ["/login", "/registro", "/recuperar"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isClientProtected = CLIENT_PROTECTED.some((p) => pathname.startsWith(p));
  const isAdminProtected = ADMIN_PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if ((isClientProtected || isAdminProtected) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/perfil";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|next.svg|vercel.svg|api/).*)",
  ],
};
