// PALANTIR v1.0.0 — GET /api/casos/[id]
// Detalle de un caso puntual. A diferencia de /api/casos (lista completa), acá se resuelve
// bajo demanda: si el caso no tiene todavía el analysis.json real del bot (`analysis_json`
// sin `checklist_admisibilidad_rm`) pero sí tiene `json_resultado_url` (el link de Drive que
// dejó el bot), lo va a buscar a Drive UNA vez, lo guarda en `casos.analysis_json`
// (cache-on-read) y ya no vuelve a pedirlo. Requiere sesión; CALIFICADOR solo puede ver un
// caso si es el asignado y no es NO_APTO (403 si no).

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { SELECT_BASE, mapearFila, type FilaCaso } from "@/lib/casos-mapper";
import { leerAnalysisJsonDesdeDrive } from "@/lib/google-drive";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const pool = getPool();

  const { rows } = await pool.query<FilaCaso>(`${SELECT_BASE} WHERE c.id = $1`, [id]);
  const fila = rows[0];

  if (!fila) {
    return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
  }
  if (sesion.rol !== "ADMIN" && (fila.calificador_asignado_id !== sesion.id || fila.estado_checklist === "NO_APTO")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const tieneJsonReal = !!fila.analysis_json?.checklist_admisibilidad_rm;

  if (!tieneJsonReal && fila.json_resultado_url) {
    const jsonReal = await leerAnalysisJsonDesdeDrive(fila.json_resultado_url);
    if (jsonReal && typeof jsonReal === "object" && "checklist_admisibilidad_rm" in jsonReal) {
      await pool.query(`UPDATE casos SET analysis_json = $1 WHERE id = $2`, [JSON.stringify(jsonReal), id]);
      fila.analysis_json = jsonReal as FilaCaso["analysis_json"];
    }
  }

  return NextResponse.json(mapearFila(fila));
}
