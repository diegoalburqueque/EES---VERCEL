// Read-only: lista todos los usuarios con rol, profesión y estado.
//   node scripts/listar-usuarios.mjs

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
    SELECT u.nombre, u.apellido, u.correo, r.nombre AS rol,
           COALESCE(p.etiqueta, '—') AS profesion, eu.estado,
           u.created_at::date AS creado
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
    LEFT JOIN profesiones p ON p.id = u.profesion_id
    ORDER BY r.nombre, u.created_at, u.nombre
  `);
  console.log(`Total: ${r.rowCount} usuarios\n`);
  console.table(r.rows);
} finally {
  await cliente.end();
}
