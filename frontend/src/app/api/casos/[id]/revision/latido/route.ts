// PALANTIR v1.0.0 — POST /api/casos/[id]/revision/latido
// Recibe los eventos de tiempo de revisión que manda la plataforma (Revisión 13):
//   body { evento: 'INICIO' | 'LATIDO' | 'PAUSA' }
// Acepta tanto fetch como navigator.sendBeacon (body text/plain con JSON). El servidor
// pone todas las marcas de tiempo — el cliente solo declara el tipo de evento.
// Solo CALIFICADOR, solo su propio caso asignado, nunca NO_APTO. Ver src/lib/metricas/revision-server.ts.

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerSesionServidor } from "@/lib/session-server";
import { registrarEventoRevision } from "@/lib/metricas/revision-server";

const EVENTOS = new Set(["INICIO", "LATIDO", "PAUSA"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionServidor();
  if (!sesion || sesion.rol !== "CALIFICADOR") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const texto = await request.text().catch(() => "");
  let evento: unknown;
  try {
    evento = (JSON.parse(texto || "{}") as { evento?: unknown }).evento;
  } catch {
    evento = undefined;
  }
  if (typeof evento !== "string" || !EVENTOS.has(evento)) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const { id } = await params;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT calificador_asignado_id, estado_checklist FROM casos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const caso = rows[0];
    if (!caso || caso.calificador_asignado_id !== sesion.id || caso.estado_checklist === "NO_APTO") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Caso no encontrado o no asignado a este usuario." }, { status: 404 });
    }

    await registrarEventoRevision(client, id, sesion.id, evento as "INICIO" | "LATIDO" | "PAUSA");

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({ error: "Error al registrar el evento de revisión." }, { status: 500 });
  } finally {
    client.release();
  }
}
