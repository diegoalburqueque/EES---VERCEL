// Read-only: cruza Hoja 5 (asignaciones) vs MAESTRO_RM (datos) vs BD. No toca nada.
//   node scripts/_explora-hoja5.mjs
import { google } from "googleapis";
import path from "node:path";
import { readFileSync } from "node:fs";
import pg from "pg";

const SID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const auth = new google.auth.GoogleAuth({ keyFile: path.resolve(process.cwd(), "service-account.json"), scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
const sheets = google.sheets({ version: "v4", auth });

const h5 = (await sheets.spreadsheets.values.get({ spreadsheetId: SID, range: "Hoja 5" })).data.values ?? [];
console.log("Hoja 5 header:", (h5[0] || []).join(" | "));
const rows5 = h5.slice(1).filter((r) => (r[1] || "").trim());
console.log("Hoja 5 filas con ID:", rows5.length);

const ids5 = rows5.map((r) => (r[1] || "").trim());
const dup5 = ids5.filter((x, i) => ids5.indexOf(x) !== i);
console.log("IDs duplicados en Hoja 5:", [...new Set(dup5)].length, dup5.length ? "→ " + [...new Set(dup5)].slice(0, 15).join(", ") : "");
console.log("IDs no numéricos:", ids5.filter((x) => !/^\d{6,9}$/.test(x)).slice(0, 10));

const porCalif = {};
for (const r of rows5) {
  const c = (r[2] || "").trim() || "(sin calificador)";
  porCalif[c] = (porCalif[c] || 0) + 1;
}
console.log("\nPor calificador en Hoja 5:");
console.table(Object.entries(porCalif).map(([k, v]) => ({ calificador: k, casos: v })));

const mrm = (await sheets.spreadsheets.values.get({ spreadsheetId: SID, range: "MAESTRO_RM" })).data.values ?? [];
const hmrm = mrm[0];
const ix = (c) => hmrm.indexOf(c);
const mrmById = new Map();
for (const f of mrm.slice(1)) { const id = (f[ix("ID_TRAMITE")] || "").trim(); if (id) { if (!mrmById.has(id)) mrmById.set(id, []); mrmById.get(id).push(f); } }

const setIds5 = [...new Set(ids5)];
let enMrm = 0, conJson = 0;
const sinFila = [], sinJson = [], dupMrm = [];
for (const id of setIds5) {
  const fs = mrmById.get(id);
  if (!fs) { sinFila.push(id); continue; }
  enMrm++;
  if (fs.length > 1) dupMrm.push(`${id}x${fs.length}`);
  const tieneJson = fs.some((f) => (f[ix("LINK_ANALISIS_JSON")] || "").trim());
  if (tieneJson) conJson++; else sinJson.push(id);
}
console.log(`\nIDs únicos en Hoja 5: ${setIds5.length}`);
console.log(`  en MAESTRO_RM: ${enMrm}  |  sin fila en MAESTRO_RM: ${sinFila.length}`);
console.log(`  con LINK_ANALISIS_JSON: ${conJson}  |  con fila pero sin JSON: ${sinJson.length}`);
if (dupMrm.length) console.log(`  duplicados en MAESTRO_RM: ${dupMrm.slice(0, 25).join(", ")}`);
if (sinFila.length) console.log(`  primeros sin fila: ${sinFila.slice(0, 20).join(", ")}`);
if (sinJson.length) console.log(`  primeros sin JSON: ${sinJson.slice(0, 20).join(", ")}`);

const conn = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
const cli = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cli.connect();
const { rows: yaEn } = await cli.query("SELECT id_tramite FROM casos WHERE id_tramite = ANY($1)", [setIds5]);
console.log(`\nYa en la BD (tabla casos): ${yaEn.length} de ${setIds5.length}`);
const { rows: totalBd } = await cli.query("SELECT count(*)::int c FROM casos");
console.log(`Total casos en BD hoy: ${totalBd[0].c}`);
const { rows: cal } = await cli.query("SELECT nombre||' '||apellido AS nom, correo FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE r.nombre='CALIFICADOR' ORDER BY nom");
console.log(`\nCalificadores en la BD (${cal.length}):`);
console.table(cal);
await cli.end();
