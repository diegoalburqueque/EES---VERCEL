// Migración Revisión 12 -> 13: métricas de revisión (tiempo de calificación por caso).
// Idempotente (CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS).
//
//   node scripts/migracion-r12-a-r13.mjs
//
// Lee DATABASE_URL de .env.local, igual que el resto de scripts/.
//
// Crea:
//   - tabla sesiones_revision (una fila por "sentada" del calificador sobre un caso)
//   - casos.revision_iniciada_en / revision_finalizada_en / revision_segundos_activos / revision_num_sesiones
//     (rollup para consultar productividad sin agregar la tabla en cada query)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL"));
const conn = linea.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const CREAR_TABLA = `
  CREATE TABLE IF NOT EXISTS sesiones_revision (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id          uuid NOT NULL REFERENCES casos(id),
    calificador_id   uuid NOT NULL REFERENCES usuarios(id),
    iniciada_en      timestamptz NOT NULL DEFAULT now(),
    ultimo_latido_en timestamptz NOT NULL DEFAULT now(),
    finalizada_en    timestamptz,
    segundos_activos integer NOT NULL DEFAULT 0,
    cierre           text
  )
`;

const INDICES = [
  `CREATE INDEX IF NOT EXISTS idx_sesiones_revision_caso ON sesiones_revision (caso_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sesiones_revision_calificador ON sesiones_revision (calificador_id, iniciada_en)`,
  `CREATE INDEX IF NOT EXISTS idx_sesiones_revision_abierta ON sesiones_revision (caso_id, calificador_id) WHERE finalizada_en IS NULL`,
];

const COLUMNAS = [
  ["revision_iniciada_en", "timestamptz"],
  ["revision_finalizada_en", "timestamptz"],
  ["revision_segundos_activos", "integer NOT NULL DEFAULT 0"],
  ["revision_num_sesiones", "integer NOT NULL DEFAULT 0"],
];

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();

try {
  await cliente.query("BEGIN");
  await cliente.query(CREAR_TABLA);
  for (const sql of INDICES) await cliente.query(sql);
  for (const [nombre, tipo] of COLUMNAS) {
    await cliente.query(`ALTER TABLE casos ADD COLUMN IF NOT EXISTS ${nombre} ${tipo}`);
  }
  await cliente.query("COMMIT");

  const tabla = await cliente.query(
    `SELECT to_regclass('public.sesiones_revision') IS NOT NULL AS existe`,
  );
  const cols = await cliente.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_name = 'casos' AND column_name = ANY($1)
      ORDER BY column_name`,
    [COLUMNAS.map(([n]) => n)],
  );
  console.log(`sesiones_revision: ${tabla.rows[0].existe ? "OK" : "FALTA"}`);
  console.log(`casos: ${cols.rows.length}/${COLUMNAS.length} columnas de la Revisión 13 presentes`);
  console.table(cols.rows);
} catch (e) {
  await cliente.query("ROLLBACK");
  throw e;
} finally {
  await cliente.end();
}
