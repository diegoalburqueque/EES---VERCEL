import { NextResponse, type NextRequest } from "next/server";
import { verificarSesion } from "@/lib/jwt";
import { rutaPorRol, NOMBRE_COOKIE_SESION } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  const esRutaAdmin = pathname.startsWith("/admin");
  const esRutaCalificador = pathname.startsWith("/calificador");

  // Sin JWT válido → fuera, de vuelta al login.
  if ((esRutaAdmin || esRutaCalificador) && !sesion) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // JWT válido pero de otro rol (ej. calificador probando /admin a mano) → a su propia interfaz, no a la ajena.
  if (sesion && esRutaAdmin && sesion.rol !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = rutaPorRol(sesion.rol);
    return NextResponse.redirect(url);
  }
  if (sesion && esRutaCalificador && sesion.rol !== "CALIFICADOR") {
    const url = request.nextUrl.clone();
    url.pathname = rutaPorRol(sesion.rol);
    return NextResponse.redirect(url);
  }

  // Ya con sesión válida, si intenta volver al login lo mandamos directo a su interfaz.
  if (sesion && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = rutaPorRol(sesion.rol);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/calificador/:path*"],
};
