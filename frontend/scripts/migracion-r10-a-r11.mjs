// Migración Revisión 10 -> 11: tabla `profesiones` + `usuarios.profesion_id`.
// Idempotente (IF NOT EXISTS / ON CONFLICT DO NOTHING) — se puede correr más de una vez.
//
//   node scripts/migracion-r10-a-r11.mjs
//
// Lee DATABASE_URL de .env.local, igual que el resto de scripts/.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL"));
const conn = linea.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();

try {
  await cliente.query("BEGIN");

  await cliente.query(`
    CREATE TABLE IF NOT EXISTS profesiones (
      id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre   text NOT NULL UNIQUE,
      etiqueta text NOT NULL
    )
  `);

  await cliente.query(`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS profesion_id uuid REFERENCES profesiones(id)
  `);

  await cliente.query(`
    CREATE INDEX IF NOT EXISTS idx_usuarios_profesion ON usuarios (profesion_id)
  `);

  await cliente.query(`
    INSERT INTO profesiones (nombre, etiqueta) VALUES
      ('KINESIOLOGIA',        'Kinesiología'),
      ('TERAPIA_OCUPACIONAL', 'Terapia Ocupacional'),
      ('FONOAUDIOLOGIA',      'Fonoaudiología'),
      ('ENFERMERIA',          'Enfermería'),
      ('PSICOLOGIA',          'Psicología')
    ON CONFLICT (nombre) DO NOTHING
  `);

  await cliente.query("COMMIT");

  const prof = await cliente.query(`SELECT nombre, etiqueta FROM profesiones ORDER BY nombre`);
  console.log("profesiones:");
  console.table(prof.rows);

  const col = await cliente.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'profesion_id'
  `);
  console.log("usuarios.profesion_id:");
  console.table(col.rows);
} catch (e) {
  await cliente.query("ROLLBACK");
  throw e;
} finally {
  await cliente.end();
}
