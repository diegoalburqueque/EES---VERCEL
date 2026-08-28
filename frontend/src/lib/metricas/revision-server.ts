import "server-only";
import type { PoolClient } from "pg";

// Métricas de productividad (Revisión 13): cuánto tiempo real dedica el calificador a
// cada caso. El front manda 3 eventos a /api/casos/[id]/revision/latido:
//   INICIO  — al abrir el detalle de un caso propio sin resolver
//   LATIDO  — cada ~45 s mientras la pestaña está visible
//   PAUSA   — al ocultar/cerrar la pestaña
// El servidor acumula `segundos_activos` sumando el intervalo entre latidos consecutivos,
// pero SOLO cuando ese intervalo es <= UMBRAL_IDLE_SEG (un gap más largo = el calificador
// se fue a hacer otra cosa; no cuenta como trabajo). Todas las marcas de tiempo las pone
// el servidor con now(); el cliente solo manda el tipo de evento (no se confía en su reloj).

export const UMBRAL_IDLE_SEG = 180; // 3 min sin latido = sesión inactiva, el hueco no suma

type EventoRevision = "INICIO" | "LATIDO" | "PAUSA";

/**
 * Aplica un evento de revisión sobre la sesión abierta del caso (o abre una nueva).
 * Debe llamarse dentro de una transacción con el caso ya bloqueado (FOR UPDATE).
 */
export async function registrarEventoRevision(
  client: PoolClient,
  casoId: string,
  calificadorId: string,
  evento: EventoRevision,
): Promise<void> {
  const abierta = await client.query(
    `SELECT id
       FROM sesiones_revision
      WHERE caso_id = $1 AND calificador_id = $2 AND finalizada_en IS NULL
      ORDER BY iniciada_en DESC
      LIMIT 1
      FOR UPDATE`,
    [casoId, calificadorId],
  );

  if (!abierta.rows.length) {
    if (evento === "PAUSA") return; // no hay sesión que pausar (ya se cerró o nunca abrió)

    // INICIO, o un LATIDO que llegó sin INICIO previo (recarga de la página): nueva sentada.
    await client.query(
      `INSERT INTO sesiones_revision (caso_id, calificador_id) VALUES ($1, $2)`,
      [casoId, calificadorId],
    );
    await client.query(
      `UPDATE casos
          SET revision_iniciada_en = COALESCE(revision_iniciada_en, now()),
              revision_num_sesiones = revision_num_sesiones + 1
        WHERE id = $1`,
      [casoId],
    );
    return;
  }

  const sesionId = abierta.rows[0].id as string;

  // El intervalo activo desde el último latido se calcula 100% server-side.
  await client.query(
    `UPDATE sesiones_revision
        SET segundos_activos = segundos_activos
              + CASE
                  WHEN EXTRACT(EPOCH FROM (now() - ultimo_latido_en)) <= $2
                  THEN EXTRACT(EPOCH FROM (now() - ultimo_latido_en))::int
                  ELSE 0
                END,
            ultimo_latido_en = now(),
            finalizada_en = CASE WHEN $3 THEN now() ELSE finalizada_en END,
            cierre = CASE WHEN $3 THEN 'PAUSA' ELSE cierre END
      WHERE id = $1`,
    [sesionId, UMBRAL_IDLE_SEG, evento === "PAUSA"],
  );
}

/**
 * Cierra la sesión de revisión abierta (si la hay) y vuelca el rollup a `casos`.
 * Llamar dentro de la transacción de confirmar / modificar / no-evaluable, antes del COMMIT.
 */
export async function cerrarRevision(
  client: PoolClient,
  casoId: string,
  calificadorId: string,
): Promise<void> {
  await client.query(
    `UPDATE sesiones_revision
        SET segundos_activos = segundos_activos
              + CASE
                  WHEN EXTRACT(EPOCH FROM (now() - ultimo_latido_en)) <= $3
                  THEN EXTRACT(EPOCH FROM (now() - ultimo_latido_en))::int
                  ELSE 0
                END,
            ultimo_latido_en = now(),
            finalizada_en = now(),
            cierre = 'RESUELTA'
      WHERE caso_id = $1 AND calificador_id = $2 AND finalizada_en IS NULL`,
    [casoId, calificadorId, UMBRAL_IDLE_SEG],
  );

  await client.query(
    `UPDATE casos c
        SET revision_finalizada_en = now(),
            revision_segundos_activos = COALESCE(agg.total, 0),
            revision_num_sesiones = COALESCE(agg.n, c.revision_num_sesiones),
            revision_iniciada_en = COALESCE(c.revision_iniciada_en, agg.inicio)
       FROM (
         SELECT SUM(segundos_activos)::int AS total,
                COUNT(*)::int             AS n,
                MIN(iniciada_en)          AS inicio
           FROM sesiones_revision
          WHERE caso_id = $1
       ) agg
      WHERE c.id = $1`,
    [casoId],
  );
}
