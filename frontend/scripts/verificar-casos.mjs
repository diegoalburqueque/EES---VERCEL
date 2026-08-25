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
  const r = await cliente.query(`
    SELECT
      c.id_tramite,
      c.nombre_completo,
      u.correo AS calificador,
      c.rut IS NOT NULL AS tiene_rut,
      c.analysis_json IS NOT NULL AS tiene_analysis_json,
      c.calif_diagnostico_principal IS NOT NULL AS tiene_diagnostico,
      c.checklist_cedula_resultado IS NOT NULL AS tiene_checklist_cedula,
      c.checklist_ibf_resultado IS NOT NULL AS tiene_checklist_ibf,
      c.checklist_isra_resultado IS NOT NULL AS tiene_checklist_isra,
      c.checklist_ivadec_resultado IS NOT NULL AS tiene_checklist_ivadec,
      c.cerofilas_porcentaje_discapacidad_texto IS NOT NULL AS tiene_cerofilas,
      c.porcentaje_propuesto_ia IS NOT NULL AS tiene_pct_ia,
      c.word_nombre_archivo_sugerido IS NOT NULL AS tiene_word
    FROM casos c
    LEFT JOIN usuarios u ON u.id = c.calificador_asignado_id
    ORDER BY c.id_tramite
  `);
  console.log("Total filas:", r.rowCount);
  console.table(r.rows);

  const camposClave = [
    "tiene_rut","tiene_analysis_json","tiene_diagnostico",
    "tiene_checklist_cedula","tiene_checklist_ibf","tiene_checklist_isra","tiene_checklist_ivadec",
    "tiene_cerofilas","tiene_pct_ia","tiene_word",
  ];
  console.log("\n--- Resumen ---");
  for (const fila of r.rows) {
    const faltantes = camposClave.filter((c) => fila[c] !== true);
    console.log(
      fila.id_tramite,
      "-",
      fila.nombre_completo,
      "->",
      faltantes.length === 0 ? "COMPLETO" : `FALTAN: ${faltantes.join(", ")}`
    );
  }
} finally {
  await cliente.end();
}
