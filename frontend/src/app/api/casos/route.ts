// PALANTIR v1.1.0 — GET /api/casos
// Lista de casos para la sesión actual. ADMIN ve los 500; CALIFICADOR solo los que tiene
// asignados (calificador_asignado_id) y nunca los NO_APTO (regla no negociable, filtrada acá
// a nivel de query, no solo en el frontend). Cada fila pasa por mapearFila() (lib/casos-mapper),
// que arma `analisis` con prioridad: JSON real del bot > ficha sintética desde columnas planas
// > null (casos con tiene_error_bot). Requiere sesión (401 si no hay).

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { SELECT_BASE, mapearFila, adjuntarDocumentos, type FilaCaso } from "@/lib/casos-mapper";

export async function GET() {
  const sesion = await obtenerSesionServidor();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const pool = getPool();

  const { rows } =
    sesion.rol === "ADMIN"
      ? await pool.query<FilaCaso>(`${SELECT_BASE} ORDER BY c.created_at DESC`)
      : // CALIFICADOR: solo sus propios casos, nunca NO_APTO (regla no negociable).
        await pool.query<FilaCaso>(
          `${SELECT_BASE} WHERE c.calificador_asignado_id = $1 AND c.estado_checklist <> 'NO_APTO' ORDER BY c.created_at DESC`,
          [sesion.id],
        );

  return NextResponse.json(await adjuntarDocumentos(pool, rows.map(mapearFila)));
}
