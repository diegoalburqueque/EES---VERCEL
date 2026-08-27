// Reset de casos: vacía `casos` y las 7 tablas que le apuntan por FK.
// NO toca roles / estados_caso / estado_usuario / profesiones / usuarios.
// Irreversible — hacer respaldo antes (Supabase → Database → Backups).
//
//   node scripts/borrar-casos.mjs

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
    TRUNCATE TABLE
      historial_calificacion,
      historial_estados_caso,
      asignaciones,
      casos_embeddings,
      casos_errores,
      documentos_caso,
      calificaciones_finales,
      casos
    CASCADE
  `);
  await cliente.query("COMMIT");

  const r = await cliente.query(`
    SELECT 'casos' AS tabla, count(*)::int FROM casos
    UNION ALL SELECT 'documentos_caso', count(*)::int FROM documentos_caso
    UNION ALL SELECT 'calificaciones_finales', count(*)::int FROM calificaciones_finales
    UNION ALL SELECT 'casos_errores', count(*)::int FROM casos_errores
    UNION ALL SELECT 'historial_calificacion', count(*)::int FROM historial_calificacion
    UNION ALL SELECT 'historial_estados_caso', count(*)::int FROM historial_estados_caso
    UNION ALL SELECT 'usuarios (intacta)', count(*)::int FROM usuarios
    UNION ALL SELECT 'profesiones (intacta)', count(*)::int FROM profesiones
    UNION ALL SELECT 'estados_caso (intacta)', count(*)::int FROM estados_caso
  `);
  console.log("Reset OK. Conteos:");
  console.table(r.rows);
} catch (e) {
  await cliente.query("ROLLBACK");
  throw e;
} finally {
  await cliente.end();
}
