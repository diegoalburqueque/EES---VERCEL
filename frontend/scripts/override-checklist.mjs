// Override manual de casos.estado_checklist (ej. NO_APTO -> REQUIERE_REVISION).
// NO toca analysis_json (queda el veredicto original del bot). Deja rastro en historial_estados_caso.
//
//   node scripts/override-checklist.mjs REQUIERE_REVISION 32971229 33436393 33463767
//   node scripts/override-checklist.mjs --dry REQUIERE_REVISION 32971229

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const conn = env.split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const DRY = process.argv.includes("--dry");
const args = process.argv.slice(2).filter((a) => a !== "--dry");
const NUEVO = args[0];
const IDS = args.slice(1);
const VALIDOS = new Set(["APTO", "REQUIERE_REVISION", "NO_APTO"]);
if (!VALIDOS.has(NUEVO) || IDS.length === 0) {
  console.error("Uso: node scripts/override-checklist.mjs [--dry] <APTO|REQUIERE_REVISION|NO_APTO> <ID_TRAMITE...>");
  process.exit(1);
}

const MOTIVO = "Override manual: estado_checklist -> " + NUEVO +
  " (falso NO_APTO del bot: la fecha del IVADEC viene como texto de edad, no como discrepancia real). analysis_json intacto.";

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();
try {
  for (const idTramite of IDS) {
    const { rows } = await cliente.query(
      `SELECT c.id, c.estado_checklist, c.estado_caso_id,
              c.analysis_json->'checklist_admisibilidad_rm'->>'resultado_general' AS json_general
       FROM casos c WHERE c.id_tramite = $1`,
      [idTramite]
    );
    if (rows.length === 0) { console.error(`❌ ${idTramite}: no existe`); continue; }
    const c = rows[0];
    console.log(`\n${idTramite}: estado_checklist actual = ${c.estado_checklist} (analysis_json dice ${c.json_general})`);
    if (c.estado_checklist === NUEVO) { console.log("  ya está en ese estado, nada que hacer"); continue; }

    if (DRY) { console.log(`  [DRY] -> ${NUEVO}`); continue; }

    await cliente.query("BEGIN");
    await cliente.query("UPDATE casos SET estado_checklist = $1 WHERE id = $2", [NUEVO, c.id]);
    await cliente.query(
      `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
       VALUES ($1, NULL, $2, $2, $3)`,
      [c.id, c.estado_caso_id, MOTIVO]
    );
    await cliente.query("COMMIT");
    console.log(`  ✓ ${c.estado_checklist} -> ${NUEVO}`);
  }

  if (!DRY) {
    const { rows } = await cliente.query(
      `SELECT id_tramite, nombre_completo, estado_checklist,
              (analysis_json->'checklist_admisibilidad_rm'->>'resultado_general') AS json_general
       FROM casos WHERE id_tramite = ANY($1) ORDER BY id_tramite`, [IDS]
    );
    console.log("\n=== Después ===");
    console.table(rows);
  }
} finally {
  await cliente.end();
}
