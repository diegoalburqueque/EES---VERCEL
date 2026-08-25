// PALANTIR v1.0.0 — PATCH /api/usuarios/[id]
// Edita nombre/apellido/correo y/o activa-desactiva un usuario — body: cualquier subconjunto
// de { nombre, apellido, correo, activo }, solo se actualiza lo presente. "activo: false" es
// lo más destructivo que existe acá: nunca hay DELETE (regla no negociable, un usuario nunca
// se elimina de la base, solo se desactiva). 409 si el correo nuevo ya existe. Solo ADMIN.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import type { Usuario } from "@/data/usuarios";

const CORREO_INSTITUCIONAL = /^[^\s@]+@grupoees\.cl$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const { nombre, apellido, correo, activo } = cuerpo as Record<string, unknown>;

  if (correo !== undefined && (typeof correo !== "string" || !CORREO_INSTITUCIONAL.test(correo.trim()))) {
    return NextResponse.json({ error: "El correo debe ser una dirección @grupoees.cl válida." }, { status: 400 });
  }
  if (nombre !== undefined && (typeof nombre !== "string" || !nombre.trim())) {
    return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
  }
  if (apellido !== undefined && (typeof apellido !== "string" || !apellido.trim())) {
    return NextResponse.json({ error: "El apellido no puede estar vacío." }, { status: 400 });
  }
  if (activo !== undefined && typeof activo !== "boolean") {
    return NextResponse.json({ error: "'activo' debe ser boolean." }, { status: 400 });
  }

  const pool = getPool();

  try {
    if (activo !== undefined) {
      await pool.query(
        `UPDATE usuarios SET estado_usuario_id = (SELECT id FROM estado_usuario WHERE estado = $1) WHERE id = $2`,
        [activo ? "ACTIVO" : "INACTIVO", id]
      );
    }
    if (nombre !== undefined) {
      await pool.query(`UPDATE usuarios SET nombre = $1 WHERE id = $2`, [(nombre as string).trim(), id]);
    }
    if (apellido !== undefined) {
      await pool.query(`UPDATE usuarios SET apellido = $1 WHERE id = $2`, [(apellido as string).trim(), id]);
    }
    if (correo !== undefined) {
      await pool.query(`UPDATE usuarios SET correo = $1 WHERE id = $2`, [
        (correo as string).trim().toLowerCase(),
        id,
      ]);
    }

    const { rows } = await pool.query<{
      id: string;
      nombre: string;
      apellido: string;
      correo: string;
      rol: Usuario["rol"];
      estado: string;
    }>(
      `SELECT u.id, u.nombre, u.apellido, u.correo, r.nombre AS rol, eu.estado
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
        WHERE u.id = $1`,
      [id]
    );
    const fila = rows[0];
    if (!fila) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const usuario: Usuario = {
      id: fila.id,
      nombreCompleto: `${fila.nombre} ${fila.apellido}`,
      correo: fila.correo,
      rol: fila.rol,
      activo: fila.estado === "ACTIVO",
    };
    return NextResponse.json(usuario);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 500 });
  }
}
