// PALANTIR v1.0.0 — POST /api/casos/[id]/modificar
// El calificador confirma o corrige el % final (body: { porcentajeFinal: number, 0-100).
// Escribe calificaciones_finales con modificado_por_calificador = true si difiere del %
// propuesto por la IA, mueve estado_caso a FINALIZADO y deja motivo en historial_estados_caso
// cuando hubo modificación. Solo CALIFICADOR, solo su propio caso asignado, nunca NO_APTO.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const { porcentajeFinal } = await request.json();

  if (typeof porcentajeFinal !== "number" || porcentajeFinal < 0 || porcentajeFinal > 100) {
    return NextResponse.json({ error: "Porcentaje inválido." }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, porcentaje_propuesto_ia, calificador_asignado_id, estado_checklist
       FROM casos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const caso = rows[0];

    if (!caso || caso.calificador_asignado_id !== sesion.id || caso.estado_checklist === "NO_APTO") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Caso no encontrado o no asignado a este usuario." }, { status: 404 });
    }

    const modificado = Number(caso.porcentaje_propuesto_ia) !== porcentajeFinal;

    await client.query(
      `INSERT INTO calificaciones_finales (caso_id, calificador_id, porcentaje_final, modificado_por_calificador, fecha_calificacion)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (caso_id) DO UPDATE SET porcentaje_final = EXCLUDED.porcentaje_final, modificado_por_calificador = EXCLUDED.modificado_por_calificador, fecha_calificacion = now()`,
      [id, sesion.id, porcentajeFinal, modificado]
    );

    const estadoAnterior = await client.query(`SELECT estado_caso_id FROM casos WHERE id = $1`, [id]);
    const nuevoEstado = await client.query(`SELECT id FROM estados_caso WHERE nombre = 'FINALIZADO'`);

    await client.query(`UPDATE casos SET estado_caso_id = $1 WHERE id = $2`, [nuevoEstado.rows[0].id, id]);

    await client.query(
      `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, sesion.id, estadoAnterior.rows[0].estado_caso_id, nuevoEstado.rows[0].id, modificado ? "Calificador modificó el % propuesto por el motor de EES" : null]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({ error: "Error al guardar la calificación." }, { status: 500 });
  } finally {
    client.release();
  }
}
