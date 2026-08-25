// PALANTIR v1.0.0 — POST /api/auth/login
// Login con correo + contraseña contra `usuarios` (bcrypt). Rechaza si el usuario está
// INACTIVO. Si es válido, firma un JWT de sesión (8h) y lo deja en la cookie httpOnly
// `compin_token`. Pública (sin sesión previa).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import { firmarSesion } from "@/lib/jwt";
import { rutaPorRol, NOMBRE_COOKIE_SESION } from "@/lib/auth";
import type { Rol } from "@/data/usuarios";

const OCHO_HORAS_EN_SEGUNDOS = 8 * 60 * 60;

interface FilaUsuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  password_hash: string;
  rol: Rol;
  estado_usuario: string;
}

export async function POST(request: Request) {
  const { correo, password } = await request.json();

  if (typeof correo !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Correo y contraseña son obligatorios." }, { status: 400 });
  }

  const pool = getPool();
  const { rows } = await pool.query<FilaUsuario>(
    `SELECT u.id, u.nombre, u.apellido, u.correo, u.password_hash, r.nombre AS rol, eu.estado AS estado_usuario
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
     WHERE u.correo = $1`,
    [correo.trim().toLowerCase()]
  );

  const usuario = rows[0];

  if (!usuario || usuario.estado_usuario !== "ACTIVO") {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos, o el usuario está inactivo." },
      { status: 401 }
    );
  }

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos, o el usuario está inactivo." },
      { status: 401 }
    );
  }

  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

  const token = await firmarSesion({
    sub: usuario.id,
    nombreCompleto,
    correo: usuario.correo,
    rol: usuario.rol,
  });

  const respuesta = NextResponse.json({
    rol: usuario.rol,
    redirigirA: rutaPorRol(usuario.rol),
  });

  respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OCHO_HORAS_EN_SEGUNDOS,
  });

  return respuesta;
}
