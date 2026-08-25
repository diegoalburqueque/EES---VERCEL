// PALANTIR v1.0.0 — POST /api/auth/logout
// Borra la cookie de sesión (`compin_token`). No valida sesión previa ni toca la base.

import { NextResponse } from "next/server";
import { NOMBRE_COOKIE_SESION } from "@/lib/auth";

export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.delete(NOMBRE_COOKIE_SESION);
  return respuesta;
}
