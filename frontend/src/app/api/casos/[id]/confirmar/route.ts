// PALANTIR v1.1.0 — POST /api/casos/[id]/confirmar
// El calificador RATIFICA la propuesta del motor tal cual (sin editar el %). Escribe
// calificaciones_finales (decision=ACEPTA, porcentaje_final = porcentaje_propuesto_ia,
// modificado=false, + IDIS/grado del motor, dirección vs. IVADEC original, MR/REEV que eligió
// el calificador), mueve estado_caso a FINALIZADO y deja registro en historial_estados_caso.
// Solo CALIFICADOR, solo su propio caso asignado, nunca sobre un NO_APTO (404 si no cumple).
// Body opcional: { mr?: boolean, reev?: ReevaluacionFinal }.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { calcularDireccion, esReevValida } from "@/lib/resolucion";
import { resolverComparativaIdis } from "@/lib/comparativa-idis";
import { cerrarRevision } from "@/lib/metricas/revision-server";
import type { AnalisisQA } from "@/data/analisis";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const { mr, reev } = (cuerpo ?? {}) as { mr?: unknown; reev?: unknown };
  if (mr !== undefined && typeof mr !== "boolean") {
    return NextResponse.json({ error: "'mr' debe ser boolean." }, { status: 400 });
  }
  if (reev !== undefined && !esReevValida(reev)) {
    return NextResponse.json({ error: "'reev' inválido." }, { status: 400 });
  }

  const { id } = await params;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, porcentaje_propuesto_ia, porcentaje_ivadec_documento, calif_idis, calif_grado_discapacidad,
              valid_idis_tabla, valid_grado_tabla, calif_porcentaje_discapacidad_texto, analysis_json,
              calificador_asignado_id, estado_checklist
       FROM casos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const caso = rows[0];

    if (!caso || caso.calificador_asignado_id !== sesion.id || caso.estado_checklist === "NO_APTO") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Caso no encontrado o no asignado a este usuario." }, { status: 404 });
    }

    // analysis_json manda sobre las columnas planas — evita guardar porcentaje_final = NULL
    // cuando el bot no llegó a parsear esas columnas pero el JSON sí tiene el % real.
    const comparativa = resolverComparativaIdis(caso.analysis_json as AnalisisQA | null, caso);
    const direccion =
      comparativa.porcentajeMotor === null
        ? null
        : calcularDireccion(comparativa.porcentajeMotor, comparativa.porcentajeIvadecDocumento);

    await client.query(
      `INSERT INTO calificaciones_finales
         (caso_id, calificador_id, porcentaje_final, modificado_por_calificador, fecha_calificacion,
          decision, idis_final, grado_final, direccion, mr_final, reev_final)
       VALUES ($1, $2, $3, false, now(), 'ACEPTA', $4, $5, $6, $7, $8)
       ON CONFLICT (caso_id) DO UPDATE SET
         porcentaje_final = EXCLUDED.porcentaje_final, modificado_por_calificador = false, fecha_calificacion = now(),
         decision = 'ACEPTA', idis_final = EXCLUDED.idis_final, grado_final = EXCLUDED.grado_final,
         direccion = EXCLUDED.direccion, mr_final = EXCLUDED.mr_final, reev_final = EXCLUDED.reev_final,
         motivo_codigo = NULL, causa_codigo = NULL, explicacion = NULL`,
      [
        id,
        sesion.id,
        comparativa.porcentajeMotor,
        comparativa.idisMotor,
        comparativa.gradoMotor,
        direccion,
        mr ?? null,
        reev ?? null,
      ]
    );

    const estadoAnterior = await client.query(`SELECT estado_caso_id FROM casos WHERE id = $1`, [id]);
    const nuevoEstado = await client.query(`SELECT id FROM estados_caso WHERE nombre = 'FINALIZADO'`);

    await client.query(`UPDATE casos SET estado_caso_id = $1 WHERE id = $2`, [nuevoEstado.rows[0].id, id]);

    await client.query(
      `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
       VALUES ($1, $2, $3, $4, NULL)`,
      [id, sesion.id, estadoAnterior.rows[0].estado_caso_id, nuevoEstado.rows[0].id]
    );

    await cerrarRevision(client, id, sesion.id);

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({ error: "Error al confirmar el caso." }, { status: 500 });
  } finally {
    client.release();
  }
}
