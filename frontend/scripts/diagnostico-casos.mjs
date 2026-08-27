// Diagnóstico read-only antes de resetear los casos de prueba.
// Muestra: cuántas filas hay por tabla, qué tablas tienen FK a `casos`, y el detalle
// de usuarios/catálogos que NO se deben tocar.
//
//   node scripts/diagnostico-casos.mjs

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
  const conteos = await cliente.query(`
    SELECT 'roles' AS tabla, count(*)::int FROM roles
    UNION ALL SELECT 'estados_caso', count(*)::int FROM estados_caso
    UNION ALL SELECT 'estado_usuario', count(*)::int FROM estado_usuario
    UNION ALL SELECT 'profesiones', count(*)::int FROM profesiones
    UNION ALL SELECT 'usuarios', count(*)::int FROM usuarios
    UNION ALL SELECT '── casos y derivadas ──', NULL
    UNION ALL SELECT 'casos', count(*)::int FROM casos
    UNION ALL SELECT 'calificaciones_finales', count(*)::int FROM calificaciones_finales
    UNION ALL SELECT 'documentos_caso', count(*)::int FROM documentos_caso
    UNION ALL SELECT 'casos_errores', count(*)::int FROM casos_errores
    UNION ALL SELECT 'casos_embeddings', count(*)::int FROM casos_embeddings
    UNION ALL SELECT 'asignaciones', count(*)::int FROM asignaciones
    UNION ALL SELECT 'historial_estados_caso', count(*)::int FROM historial_estados_caso
    UNION ALL SELECT 'historial_calificacion', count(*)::int FROM historial_calificacion
  `);
  console.log("\n=== Filas por tabla ===");
  console.table(conteos.rows);

  const fks = await cliente.query(`
    SELECT tc.table_name AS tabla_hija, kcu.column_name AS columna
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'casos'
    ORDER BY tc.table_name
  `);
  console.log("\n=== Tablas con FK a `casos` (todas hay que vaciarlas) ===");
  console.table(fks.rows);

  const usuarios = await cliente.query(`
    SELECT r.nombre AS rol, eu.estado, count(*)::int
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    JOIN estado_usuario eu ON eu.id = u.estado_usuario_id
    GROUP BY r.nombre, eu.estado
    ORDER BY r.nombre, eu.estado
  `);
  console.log("\n=== Usuarios (NO se tocan) ===");
  console.table(usuarios.rows);
} finally {
  await cliente.end();
}
