import type { Rol } from "@/data/usuarios";

export const NOMBRE_COOKIE_SESION = "compin_token";

export interface Sesion {
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: Rol;
}

export function rutaPorRol(rol: Rol): string {
  return rol === "ADMIN" ? "/admin" : "/calificador";
}
