// Devuelve casos ya calificados a su estado de recién cargado (BORRADOR, sin resolución),
// como si el calificador nunca los hubiera tocado. NO desasigna al calificador.
//
//   node scripts/reset-resolucion.mjs 33454915 33433197        (reset real)
//   node scripts/reset-resolucion.mjs --dry 33454915 33433197  (solo muestra)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const conn = env.split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const DRY = process.argv.includes("--dry");
const IDS = process.argv.slice(2).filter((a) => a !== "--dry");
if (IDS.length === 0) {
  console.error("Uso: node scripts/reset-resolucion.mjs [--dry] <ID_TRAMITE> [ID_TRAMITE...]");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();

try {
  const { rows: est } = await cliente.query("SELECT id FROM estados_caso WHERE nombre='BORRADOR'");
  const borradorId = est[0].id;

  for (const idTramite of IDS) {
    const { rows } = await cliente.query(
      `SELECT c.id, c.id_tramite, ec.nombre AS estado_caso, cf.decision, cf.porcentaje_final,
              c.subido_cerofilas, (c.ficha_editada IS NOT NULL) AS ficha_editada
       FROM casos c
       JOIN estados_caso ec ON ec.id = c.estado_caso_id
       LEFT JOIN calificaciones_finales cf ON cf.caso_id = c.id
       WHERE c.id_tramite = $1`,
      [idTramite]
    );
    if (rows.length === 0) { console.error(`❌ ${idTramite}: no existe`); continue; }
    const caso = rows[0];
    console.log(`\n${idTramite} — antes: estado_caso=${caso.estado_caso} decision=${caso.decision ?? "—"} %=${caso.porcentaje_final ?? "—"} subido_cerofilas=${caso.subido_cerofilas} ficha_editada=${caso.ficha_editada}`);

    if (DRY) { console.log("  [DRY] se resetearía a BORRADOR, sin calificaciones_finales, sin movimientos de resolución"); continue; }

    await cliente.query("BEGIN");
    const d1 = await cliente.query("DELETE FROM calificaciones_finales WHERE caso_id = $1", [caso.id]);
    const d2 = await cliente.query("DELETE FROM historial_calificacion WHERE caso_id = $1", [caso.id]);
    // Borra los movimientos de estado posteriores al alta (el alta tiene estado_anterior_id NULL).
    const d3 = await cliente.query(
      "DELETE FROM historial_estados_caso WHERE caso_id = $1 AND estado_anterior_id IS NOT NULL",
      [caso.id]
    );
    await cliente.query(
      `UPDATE casos SET
         estado_caso_id = $2,
         subido_cerofilas = false, subido_cerofilas_en = NULL,
         ficha_editada = NULL, ficha_editada_en = NULL, ficha_editada_por = NULL,
         reprocesado_en = NULL
       WHERE id = $1`,
      [caso.id, borradorId]
    );
    await cliente.query("COMMIT");
    console.log(`  ✓ reseteado. Borrado: calificaciones_finales ${d1.rowCount}, historial_calificacion ${d2.rowCount}, historial_estados_caso ${d3.rowCount}`);
  }

  if (!DRY) {
    const { rows } = await cliente.query(
      `SELECT c.id_tramite, ec.nombre AS estado_caso,
              (cf.id IS NOT NULL) AS tiene_calificacion,
              (SELECT count(*) FROM historial_estados_caso h WHERE h.caso_id = c.id)::int AS movimientos
       FROM casos c JOIN estados_caso ec ON ec.id = c.estado_caso_id
       LEFT JOIN calificaciones_finales cf ON cf.caso_id = c.id
       WHERE c.id_tramite = ANY($1) ORDER BY c.id_tramite`,
      [IDS]
    );
    console.log("\n=== Después ===");
    console.table(rows);
  }
} finally {
  await cliente.end();
}
