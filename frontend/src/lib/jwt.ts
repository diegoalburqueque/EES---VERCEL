import { SignJWT, jwtVerify } from "jose";
import type { Rol } from "@/data/usuarios";

export interface SesionPayload {
  sub: string; // id de usuario
  nombreCompleto: string;
  correo: string;
  rol: Rol;
}

const DURACION_SESION = "8h";

function obtenerClaveSecreta(): Uint8Array {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    throw new Error("JWT_SECRET no está configurado (revisa .env.local)");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(payload: SesionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACION_SESION)
    .sign(obtenerClaveSecreta());
}

export async function verificarSesion(token: string): Promise<SesionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, obtenerClaveSecreta());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.nombreCompleto !== "string" ||
      typeof payload.correo !== "string" ||
      (payload.rol !== "ADMIN" && payload.rol !== "CALIFICADOR")
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      nombreCompleto: payload.nombreCompleto,
      correo: payload.correo,
      rol: payload.rol,
    };
  } catch {
    return null;
  }
}
