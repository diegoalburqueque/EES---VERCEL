// Login por RUT (oct-2026): prepara `usuarios` y carga la planilla "PERFILES HABILITADOS SALUD 360".
//
//   node scripts/cargar-perfiles-rut.mjs --perfiles <perfiles.json> --dry     simula, NO escribe
//   node scripts/cargar-perfiles-rut.mjs --perfiles <perfiles.json>           aplica (una transacción)
//
// <perfiles.json> sale de `python -I scripts/exportar-perfiles.py <xlsx> <json>` (solo "Hoja1").
//
// Qué hace, todo idempotente:
//   1. DDL: usuarios.rut (único, validado), usuarios.correo_contacto, password_hash admite NULL
//      (NULL = "sin contraseña todavía": el login lo rechaza).
//   2. Cruza cada fila con un usuario existente por nombre + primer apellido (sin tildes) o por
//      RUT. Si existe: le pone rut, correo_contacto y profesión si le faltaba; NO toca su
//      contraseña ni su correo institucional. Si no existe: lo crea CALIFICADOR/ACTIVO sin contraseña.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const DRY = process.argv.includes("--dry");
const ARG = (n) => { const i = process.argv.indexOf(n); return i !== -1 ? process.argv[i + 1] : null; };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Misma regla que src/lib/rut.ts
function normalizarRut(value) {
  const compacto = String(value).trim().replace(/[.\s-]/g, "").toUpperCase();
  const m = compacto.match(/^(\d{1,8})([0-9K])$/);
  if (!m) return null;
  let suma = 0, factor = 2;
  for (let i = m[1].length - 1; i >= 0; i--) { suma += Number(m[1][i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const r = 11 - (suma % 11);
  const dv = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return m[2] === dv ? `${m[1]}-${dv}` : null;
}

const plano = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const primero = (s) => plano(s).split(" ")[0] ?? "";
const clave = (nombre, apellidos) => `${primero(nombre)}|${primero(apellidos)}`;

function profesionDe(texto) {
  const t = plano(texto);
  if (/^to$|ocupacional/.test(t)) return "TERAPIA_OCUPACIONAL";
  if (/kine/.test(t)) return "KINESIOLOGIA";
  if (/fono/.test(t)) return "FONOAUDIOLOGIA";
  if (/enferm/.test(t)) return "ENFERMERIA";
  if (/psicol/.test(t)) return "PSICOLOGIA";
  return null;
}

// La planilla trae "Oscar" / "Daniel" donde el usuario existente es Oscar Daniel Vargas Astudillo.
const CRUCE_MANUAL_POR_RUT = { "14438533-0": "oscar.vargas@grupoees.cl" };

const perfiles = JSON.parse(readFileSync(ARG("--perfiles"), "utf8"));
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
const pool = new pg.Pool({ connectionString: env, ssl: { rejectUnauthorized: false }, max: 1 });
const cli = await pool.connect();

try {
  await cli.query("BEGIN");

  // 1. DDL
  await cli.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rut text`);
  await cli.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_contacto text`);
  await cli.query(`ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL`);
  await cli.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_rut ON usuarios (rut) WHERE rut IS NOT NULL`);
  await cli.query(`DO $$ BEGIN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_rut_formato CHECK (rut IS NULL OR rut ~ '^[0-9]{1,8}-[0-9K]$');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  const { rows: existentes } = await cli.query(
    `SELECT u.id, u.nombre, u.apellido, u.correo, u.rut, u.profesion_id, p.nombre AS profesion
       FROM usuarios u LEFT JOIN profesiones p ON p.id = u.profesion_id`);
  const profIds = Object.fromEntries((await cli.query(`SELECT id, nombre FROM profesiones`)).rows.map((r) => [r.nombre, r.id]));
  const usados = new Set(existentes.filter((u) => u.rut).map((u) => u.rut));

  const informe = { actualizados: [], creados: [], omitidos: [] };

  for (const p of perfiles) {
    const rut = normalizarRut(p.run);
    const nombre = String(p.nombre).replace(/\s+/g, " ").trim();
    const apellido = String(p.apellidos).replace(/\s+/g, " ").trim();
    const etiqueta = `${p.n}. ${nombre} ${apellido}`;
    if (!rut) { informe.omitidos.push(`${etiqueta} — RUT inválido (${p.run})`); continue; }
    if (plano(p.rol) !== "calificador") { informe.omitidos.push(`${etiqueta} — rol "${p.rol}" no soportado`); continue; }
    const profesion = profesionDe(p.profesion);
    if (!profesion) { informe.omitidos.push(`${etiqueta} — profesión no reconocida (${p.profesion})`); continue; }
    const contacto = String(p.correo).trim().toLowerCase();

    const correoManual = CRUCE_MANUAL_POR_RUT[rut];
    const candidatos = existentes.filter((u) =>
      u.rut === rut || (correoManual ? u.correo === correoManual : clave(u.nombre, u.apellido) === clave(nombre, apellido)));
    if (candidatos.length > 1) { informe.omitidos.push(`${etiqueta} — ambiguo: ${candidatos.map((c) => c.correo).join(", ")}`); continue; }

    if (candidatos.length === 1) {
      const u = candidatos[0];
      if (u.rut && u.rut !== rut) { informe.omitidos.push(`${etiqueta} — ya tiene otro RUT (${u.rut})`); continue; }
      if (!u.rut && usados.has(rut)) { informe.omitidos.push(`${etiqueta} — RUT ya usado por otro usuario`); continue; }
      await cli.query(
        `UPDATE usuarios SET rut = $1, correo_contacto = $2, profesion_id = COALESCE(profesion_id, $3) WHERE id = $4`,
        [rut, contacto, profIds[profesion], u.id]);
      usados.add(rut);
      const aviso = u.profesion && u.profesion !== profesion ? ` ⚠ planilla dice ${profesion}, BD ${u.profesion}` : "";
      informe.actualizados.push(`${etiqueta} → ${u.correo}${u.profesion ? "" : ` (+ profesión ${profesion})`}${aviso}`);
    } else {
      const { rowCount } = await cli.query(
        `INSERT INTO usuarios (nombre, apellido, rut, correo, correo_contacto, password_hash, rol_id, estado_usuario_id, profesion_id)
         VALUES ($1,$2,$3,$4,$4,NULL,(SELECT id FROM roles WHERE nombre='CALIFICADOR'),(SELECT id FROM estado_usuario WHERE estado='ACTIVO'),$5)
         ON CONFLICT (correo) DO NOTHING`,
        [nombre, apellido, rut, contacto, profIds[profesion]]);
      if (!rowCount) { informe.omitidos.push(`${etiqueta} — el correo ${contacto} ya existe`); continue; }
      usados.add(rut);
      informe.creados.push(`${etiqueta} (${rut}, ${profesion})`);
    }
  }

  console.log(`\nACTUALIZADOS (${informe.actualizados.length})`); informe.actualizados.forEach((l) => console.log("  ", l));
  console.log(`\nCREADOS sin contraseña (${informe.creados.length})`); informe.creados.forEach((l) => console.log("  ", l));
  console.log(`\nOMITIDOS (${informe.omitidos.length})`); informe.omitidos.forEach((l) => console.log("  ", l));

  if (DRY) { await cli.query("ROLLBACK"); console.log("\n--dry: transacción revertida, la BD no cambió."); }
  else { await cli.query("COMMIT"); console.log("\nAplicado."); }
} catch (e) {
  await cli.query("ROLLBACK"); console.error("Revertido por error:", e.message); process.exitCode = 1;
} finally { cli.release(); await pool.end(); }
