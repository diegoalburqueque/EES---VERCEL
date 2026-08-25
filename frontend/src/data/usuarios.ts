/**
 * Tipos de usuario. Los datos salen de la tabla `usuarios` de Supabase, vía /api/usuarios.
 *
 * Aquí vivía un dataset mock con contraseñas en texto plano; se eliminó porque ya estaba
 * desincronizado con la base y el login real valida con bcrypt contra Postgres.
 */

export type Rol = "ADMIN" | "CALIFICADOR";

export interface Usuario {
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: Rol;
  activo: boolean;
}
