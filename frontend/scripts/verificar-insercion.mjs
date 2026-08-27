// Read-only: verifica el lote de 18 casos recién insertado.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const conn = env.split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();
try {
  const tot = await cliente.query(`
    SELECT 'casos' AS t, count(*)::int FROM casos
    UNION ALL SELECT 'documentos_caso', count(*)::int FROM documentos_caso
    UNION ALL SELECT 'historial_estados_caso', count(*)::int FROM historial_estados_caso
    UNION ALL SELECT 'con analysis_json real', count(*)::int FROM casos WHERE analysis_json ? 'checklist_admisibilidad_rm'
    UNION ALL SELECT 'con calificador asignado', count(*)::int FROM casos WHERE calificador_asignado_id IS NOT NULL
    UNION ALL SELECT 'con fecha_asignacion', count(*)::int FROM casos WHERE fecha_asignacion IS NOT NULL
  `);
  console.log("=== Totales ==="); console.table(tot.rows);

  const chk = await cliente.query(`
    SELECT COALESCE(estado_checklist::text,'(null)') AS estado_checklist, count(*)::int
    FROM casos GROUP BY estado_checklist ORDER BY 1
  `);
  console.log("=== Por estado_checklist ==="); console.table(chk.rows.map(r => ({ estado_checklist: r.estado_checklist, n: r.count })));

  const porCal = await cliente.query(`
    SELECT u.correo, p.etiqueta AS profesion,
           count(*)::int AS asignados,
           count(*) FILTER (WHERE c.estado_checklist <> 'NO_APTO')::int AS visibles_calificador,
           count(*) FILTER (WHERE c.estado_checklist = 'NO_APTO')::int AS no_apto
    FROM casos c
    JOIN usuarios u ON u.id = c.calificador_asignado_id
    LEFT JOIN profesiones p ON p.id = u.profesion_id
    GROUP BY u.correo, p.etiqueta ORDER BY u.correo
  `);
  console.log("=== Por calificador ==="); console.table(porCal.rows);

  const docs = await cliente.query(`
    SELECT tipo, count(*)::int FROM documentos_caso GROUP BY tipo ORDER BY tipo
  `);
  console.log("=== documentos_caso por tipo ==="); console.table(docs.rows);

  const detalle = await cliente.query(`
    SELECT c.id_tramite, c.nombre_completo, c.estado_checklist, ec.nombre AS estado_caso,
           u.correo AS calificador,
           c.porcentaje_propuesto_ia AS pct_ia, c.porcentaje_ivadec_documento AS pct_ivadec,
           (SELECT count(*) FROM documentos_caso d WHERE d.caso_id = c.id)::int AS docs,
           (c.analysis_json ? 'checklist_admisibilidad_rm') AS json_real
    FROM casos c
    JOIN estados_caso ec ON ec.id = c.estado_caso_id
    JOIN usuarios u ON u.id = c.calificador_asignado_id
    ORDER BY u.correo, c.estado_checklist, c.id_tramite
  `);
  console.log("=== Detalle ==="); console.table(detalle.rows);
} finally {
  await cliente.end();
}
