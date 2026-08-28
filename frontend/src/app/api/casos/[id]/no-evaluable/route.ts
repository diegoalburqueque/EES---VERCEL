// PALANTIR v1.1.0 — POST /api/casos/[id]/no-evaluable
// El calificador declara que el expediente no permite pronunciarse (no es un rechazo
// clínico, es "no tengo antecedentes suficientes/confiables para calificar"). Body:
// { causaCodigo: string, detalle: string (>=20 chars) }. Escribe calificaciones_finales
// con decision=NO_EVALUABLE, porcentaje_final=NULL. Mueve estado_caso a
// RECHAZADO_CALIFICADOR — estado ya existente en el seed (Revisión 5), reutilizado acá
// porque describe exactamente esto: "el calificador devuelve el caso, requiere motivo, va
// a bandeja admin". El caso pasa a bandeja de administración, no a CeroFilas.
// Solo CALIFICADOR, solo su propio caso asignado, nunca NO_APTO.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { CAUSAS_NO_EVALUABLE } from "@/data/resolucion-catalogos";
import { cerrarRevision } from "@/lib/metricas/revision-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const { causaCodigo, detalle } = (cuerpo ?? {}) as Record<string, unknown>;

  if (typeof causaCodigo !== "string" || !CAUSAS_NO_EVALUABLE.some((c) => c.codigo === causaCodigo)) {
    return NextResponse.json({ error: "Selecciona una causa válida." }, { status: 400 });
  }
  if (typeof detalle !== "string" || detalle.trim().length < 20) {
    return NextResponse.json({ error: "El detalle debe tener al menos 20 caracteres." }, { status: 400 });
  }

  const { id } = await params;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, calificador_asignado_id, estado_checklist FROM casos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const caso = rows[0];

    if (!caso || caso.calificador_asignado_id !== sesion.id || caso.estado_checklist === "NO_APTO") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Caso no encontrado o no asignado a este usuario." }, { status: 404 });
    }

    await client.query(
      `INSERT INTO calificaciones_finales
         (caso_id, calificador_id, porcentaje_final, modificado_por_calificador, fecha_calificacion,
          decision, causa_codigo, explicacion)
       VALUES ($1, $2, NULL, false, now(), 'NO_EVALUABLE', $3, $4)
       ON CONFLICT (caso_id) DO UPDATE SET
         porcentaje_final = NULL, modificado_por_calificador = false, fecha_calificacion = now(),
         decision = 'NO_EVALUABLE', causa_codigo = EXCLUDED.causa_codigo, explicacion = EXCLUDED.explicacion,
         idis_final = NULL, grado_final = NULL, direccion = NULL, motivo_codigo = NULL`,
      [id, sesion.id, causaCodigo, detalle.trim()]
    );

    const estadoAnterior = await client.query(`SELECT estado_caso_id FROM casos WHERE id = $1`, [id]);
    const nuevoEstado = await client.query(`SELECT id FROM estados_caso WHERE nombre = 'RECHAZADO_CALIFICADOR'`);

    await client.query(`UPDATE casos SET estado_caso_id = $1 WHERE id = $2`, [nuevoEstado.rows[0].id, id]);

    await client.query(
      `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, sesion.id, estadoAnterior.rows[0].estado_caso_id, nuevoEstado.rows[0].id, `No evaluable: ${causaCodigo}`]
    );

    await cerrarRevision(client, id, sesion.id);

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({ error: "Error al declarar el caso no evaluable." }, { status: 500 });
  } finally {
    client.release();
  }
}
