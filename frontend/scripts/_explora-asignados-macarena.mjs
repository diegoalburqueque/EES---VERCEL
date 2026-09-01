// Read-only: valida el plan de inserción del lote "Planilla Macarena / ASIGNADOS".
// No toca nada (ni Sheets ni BD).
//
//   node scripts/_explora-asignados-macarena.mjs
//
// Cruza:
//   - Planilla Macarena (11LUjuQ0...) hoja "ASIGNADOS"  → id → calificador asignado
//   - Sheet grande (13xzr...) hoja "SEMANA 2"           → los ~990 ids a insertar
//   - Sheet grande (13xzr...) hoja "MAESTRO_RM"         → datos del caso (analysis.json, docs)
//   - BD Supabase                                       → qué ya está insertado + usuarios CALIFICADOR

import { google } from "googleapis";
import path from "node:path";
import { readFileSync } from "node:fs";
import pg from "pg";

const SID_MACARENA = "11LUjuQ0RfIjkcrH3XQma3XLl4swrzkNpYhyR75JD0mk";
const SID_GRANDE = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const norm = (s) => String(s ?? "").trim();
const esId = (s) => /^\d{6,9}$/.test(norm(s));

async function pestanas(sid) {
  const r = await sheets.spreadsheets.get({ spreadsheetId: sid, fields: "sheets(properties(title,gridProperties(rowCount,columnCount)))" });
  return r.data.sheets.map((s) => `${s.properties.title} (${s.properties.gridProperties.rowCount}x${s.properties.gridProperties.columnCount})`);
}
async function valores(sid, rango) {
  return (await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: rango })).data.values ?? [];
}

// ── 1. Planilla Macarena / ASIGNADOS ──────────────────────────────────────
console.log("=== Planilla Macarena (11LUjuQ0...) ===");
console.log("Pestañas:", (await pestanas(SID_MACARENA)).join("  ·  "));
const asig = await valores(SID_MACARENA, "ASIGNADOS");
console.log(`\nASIGNADOS: ${asig.length} filas (con encabezado)`);
console.log("Encabezado:");
(asig[0] ?? []).forEach((h, i) => console.log(`  ${String.fromCharCode(65 + i)}[${i}] : ${h}`));
console.log("\nPrimeras 5 filas:");
for (const r of asig.slice(1, 6)) console.log("  ", r.map((c, i) => `${String.fromCharCode(65 + i)}=${c}`).join(" | "));

// heurística: columna id = la que tiene más celdas que matchean \d{6,9}; columna calificador = texto con espacios repetido
const cols = (asig[0] ?? []).map((_, i) => i);
const puntajeId = cols.map((i) => asig.slice(1).filter((r) => esId(r[i])).length);
const colId = puntajeId.indexOf(Math.max(...puntajeId));
// calificador: columna de texto (no id, no vacía, con repetición de valores)
let colCalif = -1, mejorRep = 0;
for (const i of cols) {
  if (i === colId) continue;
  const vals = asig.slice(1).map((r) => norm(r[i])).filter(Boolean);
  if (vals.length < asig.length * 0.5) continue;
  const distintos = new Set(vals).size;
  const rep = vals.length - distintos; // más repetición = más probable "calificador"
  if (rep > mejorRep && distintos < 60 && vals.some((v) => /\s/.test(v))) { mejorRep = rep; colCalif = i; }
}
console.log(`\n→ Detectado: columna ID = ${String.fromCharCode(65 + colId)}[${colId}], columna calificador = ${colCalif === -1 ? "??" : String.fromCharCode(65 + colCalif) + "[" + colCalif + "]"}`);

const asignaciones = [];
for (const r of asig.slice(1)) {
  const id = norm(r[colId]);
  if (!esId(id)) continue;
  asignaciones.push({ id, calificador: colCalif === -1 ? "" : norm(r[colCalif]) });
}
const idsMacUnicos = [...new Set(asignaciones.map((a) => a.id))];
const dupMac = asignaciones.map((a) => a.id).filter((x, i, arr) => arr.indexOf(x) !== i);
console.log(`Filas con ID válido: ${asignaciones.length} · IDs únicos: ${idsMacUnicos.length} · duplicados: ${[...new Set(dupMac)].length}`);

const porCalif = {};
for (const a of asignaciones) porCalif[a.calificador || "(sin calificador)"] = (porCalif[a.calificador || "(sin calificador)"] || 0) + 1;
console.log("\nAsignaciones por calificador:");
console.table(Object.entries(porCalif).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ calificador: k, casos: v })));

// ── 2. SEMANA 2 (sheet grande) ────────────────────────────────────────────
console.log("\n=== Sheet grande (13xzr...) — SEMANA 2 ===");
const s2 = await valores(SID_GRANDE, "SEMANA 2");
console.log("Encabezado:", (s2[0] ?? []).join(" | "));
const idxIdS2 = (s2[0] ?? []).findIndex((h) => /^id$/i.test(norm(h))) !== -1 ? (s2[0] ?? []).findIndex((h) => /^id$/i.test(norm(h))) : 1;
const idsS2 = s2.slice(1).map((r) => norm(r[idxIdS2])).filter(esId);
const idsS2Unicos = [...new Set(idsS2)];
console.log(`Filas: ${s2.length - 1} · IDs válidos: ${idsS2.length} · únicos: ${idsS2Unicos.length}`);

// ── 3. MAESTRO_RM ─────────────────────────────────────────────────────────
console.log("\n=== MAESTRO_RM ===");
const mrm = await valores(SID_GRANDE, "MAESTRO_RM");
const hmrm = mrm[0] ?? [];
const ix = (n) => hmrm.indexOf(n);
console.log(`Filas: ${mrm.length - 1} · columnas: ${hmrm.length}`);
const mrmById = new Map();
for (const f of mrm.slice(1)) {
  const id = norm(f[ix("ID_TRAMITE")]);
  if (id && !mrmById.has(id)) mrmById.set(id, f);
}

// ── 4. Cruces ─────────────────────────────────────────────────────────────
console.log("\n=== CRUCES ===");
const setMac = new Set(idsMacUnicos);
const setS2 = new Set(idsS2Unicos);

const macNoEnS2 = idsMacUnicos.filter((id) => !setS2.has(id));
const s2NoEnMac = idsS2Unicos.filter((id) => !setMac.has(id));
console.log(`Planilla Macarena ∩ SEMANA 2 : ${idsMacUnicos.filter((id) => setS2.has(id)).length}`);
console.log(`  en Macarena pero NO en SEMANA 2: ${macNoEnS2.length}${macNoEnS2.length ? " → " + macNoEnS2.slice(0, 20).join(", ") : ""}`);
console.log(`  en SEMANA 2 pero NO en Macarena: ${s2NoEnMac.length}${s2NoEnMac.length ? " → " + s2NoEnMac.slice(0, 20).join(", ") : ""}`);

// ¿qué universo se inserta? el de SEMANA 2 (según el usuario). Verificamos cobertura en MAESTRO_RM.
let enMrm = 0, conJson = 0;
const sinFila = [], sinJson = [];
for (const id of idsS2Unicos) {
  const f = mrmById.get(id);
  if (!f) { sinFila.push(id); continue; }
  enMrm++;
  if (norm(f[ix("LINK_ANALISIS_JSON")])) conJson++; else sinJson.push(id);
}
console.log(`\nCobertura de SEMANA 2 en MAESTRO_RM:`);
console.log(`  con fila: ${enMrm}/${idsS2Unicos.length}  ·  sin fila: ${sinFila.length}`);
console.log(`  con LINK_ANALISIS_JSON: ${conJson}  ·  con fila pero sin JSON: ${sinJson.length}`);
if (sinFila.length) console.log(`  sin fila (primeros 20): ${sinFila.slice(0, 20).join(", ")}`);
if (sinJson.length) console.log(`  sin JSON (primeros 20): ${sinJson.slice(0, 20).join(", ")}`);

// cobertura de asignación: ¿todo ID de SEMANA 2 tiene calificador en la Planilla Macarena?
const idToCalif = new Map();
for (const a of asignaciones) if (!idToCalif.has(a.id)) idToCalif.set(a.id, a.calificador);
const s2SinAsignacion = idsS2Unicos.filter((id) => !idToCalif.has(id));
console.log(`\nIDs de SEMANA 2 sin asignación en Planilla Macarena: ${s2SinAsignacion.length}${s2SinAsignacion.length ? " → " + s2SinAsignacion.slice(0, 20).join(", ") : ""}`);

// ── 5. BD ─────────────────────────────────────────────────────────────────
const conn = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
const cli = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cli.connect();

const { rows: yaEn } = await cli.query("SELECT id_tramite FROM casos WHERE id_tramite = ANY($1)", [idsS2Unicos]);
console.log(`\n=== BD ===`);
console.log(`De los ${idsS2Unicos.length} IDs de SEMANA 2, ya insertados en 'casos': ${yaEn.length}`);
const { rows: tot } = await cli.query("SELECT count(*)::int c FROM casos");
console.log(`Total casos en BD hoy: ${tot[0].c}`);

const { rows: cal } = await cli.query(
  `SELECT u.nombre||' '||u.apellido AS nom, u.correo
   FROM usuarios u JOIN roles r ON r.id=u.rol_id
   WHERE r.nombre='CALIFICADOR' ORDER BY nom`
);
console.log(`\nCalificadores en la BD (${cal.length}):`);
console.table(cal);

// match nombres de la planilla vs BD
const nombresPlanilla = [...new Set(asignaciones.map((a) => a.calificador).filter(Boolean))];
const nombresBd = cal.map((c) => c.nom);
const limpio = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
const bdLimpios = nombresBd.map(limpio);
console.log("\nMatch nombre planilla → BD:");
for (const n of nombresPlanilla) {
  const nl = limpio(n);
  const exacto = nombresBd[bdLimpios.indexOf(nl)];
  const parcial = exacto ? null : nombresBd.find((_, i) => bdLimpios[i].includes(nl) || nl.includes(bdLimpios[i]));
  console.log(`  "${n}"  →  ${exacto ? "EXACTO: " + exacto : parcial ? "PARCIAL: " + parcial : "❌ SIN MATCH"}`);
}

await cli.end();
console.log("\n(read-only, no se insertó nada)");
