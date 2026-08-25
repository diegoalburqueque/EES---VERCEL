// PALANTIR v1.0.0 — POST /api/casos/[id]/confirmar
// El calificador confirma la propuesta de la IA tal cual (sin editar el %). Escribe
// calificaciones_finales (porcentaje_final = porcentaje_propuesto_ia, modificado=false),
// mueve estado_caso a FINALIZADO y deja registro en historial_estados_caso. Solo CALIFICADOR,
// solo su propio caso asignado, nunca sobre un NO_APTO (404 si no cumple).

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

    await client.query(
      `INSERT INTO calificaciones_finales (caso_id, calificador_id, porcentaje_final, modificado_por_calificador, fecha_calificacion)
       VALUES ($1, $2, $3, false, now())
       ON CONFLICT (caso_id) DO UPDATE SET porcentaje_final = EXCLUDED.porcentaje_final, modificado_por_calificador = false, fecha_calificacion = now()`,
      [id, sesion.id, caso.porcentaje_propuesto_ia]
    );

    const estadoAnterior = await client.query(`SELECT estado_caso_id FROM casos WHERE id = $1`, [id]);
    const nuevoEstado = await client.query(`SELECT id FROM estados_caso WHERE nombre = 'FINALIZADO'`);

    await client.query(`UPDATE casos SET estado_caso_id = $1 WHERE id = $2`, [nuevoEstado.rows[0].id, id]);

    await client.query(
      `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
       VALUES ($1, $2, $3, $4, NULL)`,
      [id, sesion.id, estadoAnterior.rows[0].estado_caso_id, nuevoEstado.rows[0].id]
    );

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
