import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verificarSesion } from "@/lib/jwt";
import { rutaPorRol, NOMBRE_COOKIE_SESION, type Sesion } from "@/lib/auth";
import type { Rol } from "@/data/usuarios";

export async function obtenerSesionServidor(): Promise<Sesion | null> {
  const token = (await cookies()).get(NOMBRE_COOKIE_SESION)?.value;
  if (!token) return null;

  const payload = await verificarSesion(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    nombreCompleto: payload.nombreCompleto,
    correo: payload.correo,
    rol: payload.rol,
  };
}

/**
 * Defensa en profundidad: el middleware ya filtra por rol antes de llegar acá,
 * pero el layout vuelve a exigir la sesión por si alguna ruta queda sin cubrir
 * en el matcher del middleware.
 */
export async function exigirSesion(rolRequerido: Rol): Promise<Sesion> {
  const sesion = await obtenerSesionServidor();

  if (!sesion) {
    redirect("/");
  }
  if (sesion.rol !== rolRequerido) {
    redirect(rutaPorRol(sesion.rol));
  }

  return sesion;
}
