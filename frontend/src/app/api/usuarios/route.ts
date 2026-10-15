// PALANTIR v1.0.0 — GET /api/usuarios
// Lista todos los usuarios (activos e inactivos) con su rol, para el panel ADMIN. Solo ADMIN
// (403 si no). Nunca devuelve `password_hash`.
//
// PALANTIR v1.0.0 — POST /api/usuarios
// Crea un calificador (o admin, con rol: "ADMIN") — body: { nombre, apellido, rut,
// correo (@grupoees.cl), password (mín. 8), rol? }. RUT se valida/normaliza y la contraseña
// se hashea con bcrypt. 409 si el RUT o correo ya existen. Solo ADMIN. Editar / activar / desactivar vive en
// /api/usuarios/[id] (PATCH) — acá nunca hay DELETE (regla no negociable: un usuario nunca
// se elimina, solo se desactiva).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { normalizarRut } from "@/lib/rut";
import { cifrarCopia, hashCalificador, cifradoConfigurado } from "@/lib/credenciales";
import type { Usuario } from "@/data/usuarios";

interface FilaUsuario {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  correo: string;
  rol: Usuario["rol"];
  estado: string;
}

export async function GET() {
  const sesion = await obtenerSesionServidor();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  // La gestión de usuarios es exclusiva de administración; se revalida en el servidor
  // aunque el middleware ya filtre la ruta por rol.
  if (sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const pool = getPool();
  const { rows } = await pool.query<FilaUsuario>(
    `SELECT u.id, u.nombre, u.apellido, u.rut, u.correo, r.nombre AS rol, eu.estado
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
      ORDER BY r.nombre, u.nombre`
  );

  const usuarios: Usuario[] = rows.map((fila) => ({
    id: fila.id,
    nombreCompleto: `${fila.nombre} ${fila.apellido}`,
    rut: fila.rut,
    correo: fila.correo,
    rol: fila.rol,
    activo: fila.estado === "ACTIVO",
  }));

  return NextResponse.json(usuarios);
}

const CORREO_INSTITUCIONAL = /^[^\s@]+@grupoees\.cl$/i;

export async function POST(request: Request) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const { nombre, apellido, correo, rut, password, rol } = cuerpo ?? {};
  const rutNormalizado = typeof rut === "string" ? normalizarRut(rut) : null;

  if (
    typeof nombre !== "string" || !nombre.trim() ||
    typeof apellido !== "string" || !apellido.trim() ||
    typeof correo !== "string" || !CORREO_INSTITUCIONAL.test(correo.trim()) ||
    !rutNormalizado ||
    typeof password !== "string" || password.length < 7
  ) {
    return NextResponse.json(
      { error: "Datos inválidos: nombre, apellido, RUT válido y correo @grupoees.cl son obligatorios; la contraseña debe tener al menos 7 caracteres." },
      { status: 400 }
    );
  }
  const rolFinal = rol === "ADMIN" ? "ADMIN" : "CALIFICADOR";

  // CALIFICADOR: Argon2id + copia cifrada AES-256-GCM (falla cerrado sin clave). ADMIN: bcrypt, sin copia.
  if (rolFinal === "CALIFICADOR" && !cifradoConfigurado()) {
    return NextResponse.json({ error: "Falta configurar el cifrado de credenciales (CREDENCIALES_CLAVE)." }, { status: 503 });
  }
  const pool = getPool();
  const passwordHash = rolFinal === "CALIFICADOR" ? await hashCalificador(password) : await bcrypt.hash(password, 10);
  const copia = rolFinal === "CALIFICADOR" ? await cifrarCopia(password) : null;

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query<{ id: string }>(
      `INSERT INTO usuarios (nombre, apellido, rut, correo, password_hash, rol_id, estado_usuario_id)
       VALUES ($1, $2, $3, $4, $5,
         (SELECT id FROM roles WHERE nombre = $6),
         (SELECT id FROM estado_usuario WHERE estado = 'ACTIVO'))
       RETURNING id`,
      [nombre.trim(), apellido.trim(), rutNormalizado, correo.trim().toLowerCase(), passwordHash, rolFinal]
    );
    if (copia) {
      await cliente.query(
        `INSERT INTO credenciales_calificador (usuario_id, password_cifrada, version_clave) VALUES ($1, $2, $3)`,
        [rows[0].id, copia.passwordCifrada, copia.versionClave]
      );
    }
    await cliente.query("COMMIT");

    const usuario: Usuario = {
      id: rows[0].id,
      nombreCompleto: `${nombre.trim()} ${apellido.trim()}`,
      rut: rutNormalizado,
      correo: correo.trim().toLowerCase(),
      rol: rolFinal,
      activo: true,
    };
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe un usuario con ese RUT o correo." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  } finally {
    cliente.release();
  }
}
