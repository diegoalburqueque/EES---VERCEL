// PALANTIR v1.0.0 — POST /api/auth/login
// Login con RUT + contraseña contra `usuarios` (bcrypt). Rechaza si el usuario está
// INACTIVO. Si es válido, firma un JWT de sesión (8h) y lo deja en la cookie httpOnly
// `compin_token`. Pública (sin sesión previa).
// CALIFICADOR: hash Argon2id + copia cifrada AES-256-GCM (src/lib/credenciales.ts). ADMIN: bcrypt.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import { firmarSesion } from "@/lib/jwt";
import { rutaPorRol, NOMBRE_COOKIE_SESION } from "@/lib/auth";
import { normalizarRut } from "@/lib/rut";
import { cifrarCopia, hashCalificador, cifradoConfigurado, verificarCalificador } from "@/lib/credenciales";
import type { Rol } from "@/data/usuarios";

const OCHO_HORAS_EN_SEGUNDOS = 8 * 60 * 60;

interface FilaUsuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  password_hash: string | null;
  rol: Rol;
  estado_usuario: string;
}

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const { rut, password } = cuerpo ?? {};

  if (typeof rut !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "RUT y contraseña son obligatorios." }, { status: 400 });
  }
  const rutNormalizado = normalizarRut(rut);
  if (!rutNormalizado) {
    return NextResponse.json({ error: "Ingresa un RUT válido." }, { status: 400 });
  }

  const pool = getPool();
  const { rows } = await pool.query<FilaUsuario>(
    `SELECT u.id, u.nombre, u.apellido, u.correo, u.password_hash, r.nombre AS rol, eu.estado AS estado_usuario
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
     WHERE u.rut = $1`,
    [rutNormalizado]
  );

  const usuario = rows[0];

  if (!usuario || usuario.estado_usuario !== "ACTIVO") {
    return NextResponse.json(
      { error: "RUT o contraseña incorrectos, o el usuario está inactivo." },
      { status: 401 }
    );
  }

  if (!usuario.password_hash) {
    // Primer ingreso: el CALIFICADOR todavía no tiene contraseña. La que escriba ahora se guarda
    // (solo el hash bcrypt) y pasa a ser su contraseña definitiva; el formulario no cambia. Un ADMIN nunca se
    // inscribe así: sin contraseña no entra.
    if (usuario.rol !== "CALIFICADOR") {
      return NextResponse.json({ error: "RUT o contraseña incorrectos, o el usuario está inactivo." }, { status: 401 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    // Falla cerrado: sin clave de cifrado no se crea una contraseña que después no se podría recuperar.
    if (!cifradoConfigurado()) {
      console.error("Primer ingreso bloqueado: falta CREDENCIALES_CLAVE.");
      return NextResponse.json({ error: "El ingreso no está disponible. Contacta a administración." }, { status: 503 });
    }
    const [passwordHash, copia] = await Promise.all([hashCalificador(password), cifrarCopia(password)]);
    // Hash y copia cifrada en una sola transacción. `password_hash IS NULL` en el WHERE: si dos
    // pestañas la crean a la vez, gana solo la primera.
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");
      const { rowCount } = await cliente.query(
        `UPDATE usuarios SET password_hash = $1 WHERE id = $2 AND password_hash IS NULL`,
        [passwordHash, usuario.id]
      );
      if (!rowCount) {
        await cliente.query("ROLLBACK");
        return NextResponse.json({ error: "RUT o contraseña incorrectos, o el usuario está inactivo." }, { status: 401 });
      }
      await cliente.query(
        `INSERT INTO credenciales_calificador (usuario_id, password_cifrada, version_clave) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id) DO UPDATE SET password_cifrada = EXCLUDED.password_cifrada, version_clave = EXCLUDED.version_clave`,
        [usuario.id, copia.passwordCifrada, copia.versionClave]
      );
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }
  } else if (
    !(usuario.rol === "CALIFICADOR"
      ? await verificarCalificador(password, usuario.password_hash)
      : await bcrypt.compare(password, usuario.password_hash))
  ) {
    return NextResponse.json(
      { error: "RUT o contraseña incorrectos, o el usuario está inactivo." },
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
