// Migración Revisión 11 -> 12: columnas derivadas por Node en `casos`.
// Idempotente (ADD COLUMN IF NOT EXISTS) — se puede correr más de una vez.
//
//   node scripts/migracion-r11-a-r12.mjs
//
// Lee DATABASE_URL de .env.local, igual que el resto de scripts/.
//
// Bloques del analysis.json que estas columnas espejan:
//   - edad_calculada                                   -> edad_calc_*
//   - profesional_ivadec                               -> ivadec_prof_*
//   - fuentes_duras_calificacion.ibf.descripcion_estado_funcional_ibf
//                                                      -> ibf_descripcion_estado_funcional_literal

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL"));
const conn = linea.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const COLUMNAS = [
  ["edad_calc_texto", "text"],
  ["edad_calc_total_meses", "integer"],
  ["edad_calc_fecha_referencia", "date"],
  ["edad_calc_fuente_fecha_nac", "text"],
  ["edad_calc_advertencia", "text"],
  ["ivadec_prof_nombre", "text"],
  ["ivadec_prof_run", "text"],
  ["ivadec_prof_run_dv_valido", "boolean"],
  ["ivadec_prof_profesion", "text"],
  ["ivadec_prof_advertencia", "text"],
  ["ibf_descripcion_estado_funcional_literal", "text"],
];

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();

try {
  await cliente.query("BEGIN");
  for (const [nombre, tipo] of COLUMNAS) {
    await cliente.query(`ALTER TABLE casos ADD COLUMN IF NOT EXISTS ${nombre} ${tipo}`);
  }
  await cliente.query("COMMIT");

  const res = await cliente.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_name = 'casos' AND column_name = ANY($1)
      ORDER BY column_name`,
    [COLUMNAS.map(([n]) => n)],
  );
  console.log(`casos: ${res.rows.length}/${COLUMNAS.length} columnas de la Revisión 12 presentes`);
  console.table(res.rows);
} catch (e) {
  await cliente.query("ROLLBACK");
  throw e;
} finally {
  await cliente.end();
}
