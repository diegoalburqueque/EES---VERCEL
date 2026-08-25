// PALANTIR v1.0.0 — POST /api/casos/[id]/ficha
// Guarda el snapshot completo de la ficha editada (body: { valores: Record<string,string> })
// en casos.ficha_editada/ficha_editada_en/ficha_editada_por, reemplazando a localStorage como
// fuente de verdad. `analysis_json` NUNCA se toca acá — sigue siendo la propuesta original de
// la IA, para poder comparar después "qué corrigió el humano". Solo CALIFICADOR, solo su
// propio caso asignado, nunca NO_APTO.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const valores = cuerpo?.valores;
  if (!valores || typeof valores !== "object") {
    return NextResponse.json({ error: "Falta 'valores' en el cuerpo de la petición." }, { status: 400 });
  }

  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT calificador_asignado_id, estado_checklist FROM casos WHERE id = $1`,
    [id]
  );
  const caso = rows[0];
  if (!caso || caso.calificador_asignado_id !== sesion.id || caso.estado_checklist === "NO_APTO") {
    return NextResponse.json({ error: "Caso no encontrado o no asignado a este usuario." }, { status: 404 });
  }

  await pool.query(
    `UPDATE casos SET ficha_editada = $1, ficha_editada_en = now(), ficha_editada_por = $2 WHERE id = $3`,
    [JSON.stringify(valores), sesion.id, id]
  );

  return NextResponse.json({ ok: true });
}
