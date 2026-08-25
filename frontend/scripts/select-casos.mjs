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
    SELECT c.id, c.id_tramite, c.rut, c.nombre_completo, c.region,
           ec.nombre AS estado_caso, c.estado_checklist,
           u.correo AS calificador
    FROM casos c
    LEFT JOIN estados_caso ec ON ec.id = c.estado_caso_id
    LEFT JOIN usuarios u ON u.id = c.calificador_asignado_id
    ORDER BY c.id
  `);
  console.log("Total filas en casos:", r.rowCount);
  console.table(r.rows);
} finally {
  await cliente.end();
}
