// PALANTIR v2.0.0 — POST /api/casos/[id]/modificar
// El calificador MODIFICA la propuesta del motor. Body:
//   { porcentajeFinal: number, motivoCodigo: string, fundamento: string (>=20 chars),
//     mr?: boolean, reev?: ReevaluacionFinal }
// `porcentajeFinal` debe ser uno de los 41 valores oficiales de la tabla IDIS (TABLA_IDIS) —
// se revalida acá, nunca confiar en que el <select> del frontend ya filtró. idis_final/
// grado_final se derivan de ese valor, nunca a mano. `direccion` compara porcentajeFinal
// contra el IVADEC ORIGINAL del documento (porcentaje_ivadec_documento), NUNCA contra la
// propuesta del motor — ver src/lib/resolucion.ts. Escribe calificaciones_finales con
// decision=MODIFICA, mueve estado_caso a FINALIZADO y deja motivo en historial_estados_caso.
// Solo CALIFICADOR, solo su propio caso asignado, nunca NO_APTO.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { calcularDireccion, esReevValida } from "@/lib/resolucion";
import { buscarValorIdis, MOTIVOS_MODIFICACION } from "@/data/resolucion-catalogos";
import { resolverComparativaIdis } from "@/lib/comparativa-idis";
import { cerrarRevision } from "@/lib/metricas/revision-server";
import type { AnalisisQA } from "@/data/analisis";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const { porcentajeFinal, motivoCodigo, fundamento, mr, reev } = (cuerpo ?? {}) as Record<string, unknown>;

  if (typeof porcentajeFinal !== "number") {
    return NextResponse.json({ error: "Porcentaje inválido." }, { status: 400 });
  }
  const valorIdis = buscarValorIdis(porcentajeFinal);
  if (!valorIdis) {
    return NextResponse.json({ error: "El porcentaje debe ser uno de los valores oficiales de la tabla IDIS." }, { status: 400 });
  }
  if (typeof motivoCodigo !== "string" || !MOTIVOS_MODIFICACION.some((m) => m.codigo === motivoCodigo)) {
    return NextResponse.json({ error: "Selecciona un motivo válido." }, { status: 400 });
  }
  if (typeof fundamento !== "string" || fundamento.trim().length < 20) {
    return NextResponse.json({ error: "El fundamento debe tener al menos 20 caracteres." }, { status: 400 });
  }
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

    // analysis_json manda sobre las columnas planas — mismo criterio que Ratificar, evita que
    // "modificado" y "dirección" salgan mal cuando el bot no llegó a parsear esas columnas.
    const comparativa = resolverComparativaIdis(caso.analysis_json as AnalisisQA | null, caso);
    const modificado = comparativa.porcentajeMotor === null || comparativa.porcentajeMotor !== porcentajeFinal;
    const direccion = calcularDireccion(porcentajeFinal, comparativa.porcentajeIvadecDocumento);

    await client.query(
      `INSERT INTO calificaciones_finales
         (caso_id, calificador_id, porcentaje_final, modificado_por_calificador, fecha_calificacion,
          decision, idis_final, grado_final, direccion, mr_final, reev_final, motivo_codigo, explicacion)
       VALUES ($1, $2, $3, $4, now(), 'MODIFICA', $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (caso_id) DO UPDATE SET
         porcentaje_final = EXCLUDED.porcentaje_final, modificado_por_calificador = EXCLUDED.modificado_por_calificador,
         fecha_calificacion = now(), decision = 'MODIFICA', idis_final = EXCLUDED.idis_final,
         grado_final = EXCLUDED.grado_final, direccion = EXCLUDED.direccion, mr_final = EXCLUDED.mr_final,
         reev_final = EXCLUDED.reev_final, motivo_codigo = EXCLUDED.motivo_codigo, explicacion = EXCLUDED.explicacion,
         causa_codigo = NULL`,
      [
        id,
        sesion.id,
        porcentajeFinal,
        modificado,
        valorIdis.idis,
        valorIdis.grado,
        direccion,
        mr ?? null,
        reev ?? null,
        motivoCodigo,
        fundamento.trim(),
      ]
    );

    const estadoAnterior = await client.query(`SELECT estado_caso_id FROM casos WHERE id = $1`, [id]);
    const nuevoEstado = await client.query(`SELECT id FROM estados_caso WHERE nombre = 'FINALIZADO'`);

    await client.query(`UPDATE casos SET estado_caso_id = $1 WHERE id = $2`, [nuevoEstado.rows[0].id, id]);

    await client.query(
      `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, sesion.id, estadoAnterior.rows[0].estado_caso_id, nuevoEstado.rows[0].id, modificado ? "Calificador modificó el % propuesto por el motor de EES" : null]
    );

    await cerrarRevision(client, id, sesion.id);

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
