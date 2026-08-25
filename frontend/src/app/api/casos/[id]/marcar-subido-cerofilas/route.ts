// PALANTIR v1.0.0 — POST /api/casos/[id]/marcar-subido-cerofilas
// Botón "Ya lo subí": el calificador marca que ya subió el caso a CeroFilas por su cuenta.
// Independiente de la resolución en nuestro sistema (puede marcarse en cualquier momento,
// incluso antes de ratificar/modificar/declarar no evaluable) y puramente informativo para
// el admin — no cambia estado_caso ni bloquea nada. Solo CALIFICADOR, solo su propio caso.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT calificador_asignado_id FROM casos WHERE id = $1`,
    [id]
  );
  const caso = rows[0];
  if (!caso || caso.calificador_asignado_id !== sesion.id) {
    return NextResponse.json({ error: "Caso no encontrado o no asignado a este usuario." }, { status: 404 });
  }

  await pool.query(
    `UPDATE casos SET subido_cerofilas = true, subido_cerofilas_en = now() WHERE id = $1`,
    [id]
  );

  return NextResponse.json({ ok: true });
}
