// Solo lectura: analiza los IDs de 960.txt de 4 calificadores (Flavia, Nicole, María Saldías, Oscar)
// contra la BD (Supabase) y las hojas MAESTRO_RM / MAESTRO_CALIFICACION / "no aptos 18/09/2026".
//
//   node scripts/_analiza-960-4cal.mjs

import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import { google } from "googleapis";

const SID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const CAL = {
  "Flavia Durán Gutierrez": "flavia.duran@grupoees.cl",
  "Nicole Lara": "nicole.lara@grupoees.cl",
  "María Fernanda Saldías Lara": "maria.saldias@grupoees.cl",
  "Oscar Daniel Vargas Astudillo": "oscar.vargas@grupoees.cl",
};

const filas = readFileSync("960.txt", "utf8").trim().split(/\r?\n/).map((l) => l.split("\t").map((x) => x.trim()))
  .filter((r) => CAL[r[2]]);
const conn = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL=")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const auth = new google.auth.GoogleAuth({ keyFile: "service-account.json", scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
const sheets = google.sheets({ version: "v4", auth });
const val = async (r) => (await sheets.spreadsheets.values.get({ spreadsheetId: SID, range: r })).data.values ?? [];
const indexar = (rows, colId = "ID_TRAMITE") => {
  const h = rows[0] ?? []; const m = new Map();
  for (const f of rows.slice(1)) { const id = (f[h.indexOf(colId)] || "").trim(); if (id && !m.has(id)) m.set(id, Object.fromEntries(h.map((k, i) => [k, (f[i] ?? "").trim()]))); }
  return { h, m };
};

const mrm = indexar(await val("MAESTRO_RM"));
const mc = indexar(await val("MAESTRO_CALIFICACION"));
const na = await val("'no aptos 18/09/2026'");
const naIds = new Set(na.slice(1).flatMap((f) => f.map((c) => (c || "").trim()).filter((c) => /^\d{7,9}$/.test(c))));
console.log("cabecera MAESTRO_CALIFICACION:", mc.h.filter((k) => /ESTADO|CHECK|RESULT|APTO|CALIFICADOR/i.test(k)).join(", "));
console.log("cabecera no aptos:", (na[0] || []).join(" | "));

const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows: us } = await c.query("SELECT id, correo, nombre||' '||apellido nom FROM usuarios WHERE correo = ANY($1)", [Object.values(CAL)]);
console.log("usuarios en BD:", us.map((u) => `${u.nom} <${u.correo}>`).join(" · "));
const { rows: bd } = await c.query(
  `SELECT c.id_tramite, c.estado_checklist, e.nombre estado_caso, u.correo
     FROM casos c LEFT JOIN usuarios u ON u.id=c.calificador_asignado_id LEFT JOIN estados_caso e ON e.id=c.estado_caso_id
    WHERE c.id_tramite = ANY($1)`, [filas.map((r) => r[1])]);
await c.end();
const bdMap = new Map(bd.map((r) => [r.id_tramite, r]));

const out = [];
for (const [, id, nombre] of filas) {
  const r = mrm.m.get(id), q = mc.m.get(id), b = bdMap.get(id);
  const estSheet = r?.CHECKLIST_RM_RESULTADO || q?.CHECKLIST_RM_RESULTADO || q?.ESTADO_CHECKLIST || "";
  out.push({
    id, cal: nombre,
    enMRM: !!r, enMC: !!q, enNoAptos: naIds.has(id), linkJson: !!r?.LINK_ANALISIS_JSON,
    estadoSheet: naIds.has(id) ? "NO_APTO" : (estSheet || "SIN_ESTADO"),
    enBD: !!b, bdChecklist: b?.estado_checklist ?? null, bdEstado: b?.estado_caso ?? null,
    bdCalifOk: b ? b.correo === CAL[nombre] : null, bdCorreo: b?.correo ?? null,
  });
}
writeFileSync(process.env.OUT || "analisis-960-4cal.json", JSON.stringify(out, null, 1));

const cuenta = (arr, k) => arr.reduce((a, x) => ((a[x[k]] = (a[x[k]] || 0) + 1), a), {});
for (const n of Object.keys(CAL)) {
  const a = out.filter((x) => x.cal === n);
  console.log(`\n== ${n} (${a.length})`);
  console.log("  estado sheet:", JSON.stringify(cuenta(a, "estadoSheet")));
  console.log("  MAESTRO_RM:", a.filter((x) => x.enMRM).length, "| MAESTRO_CALIF:", a.filter((x) => x.enMC).length,
    "| en ninguna:", a.filter((x) => !x.enMRM && !x.enMC).length, "| no aptos tab:", a.filter((x) => x.enNoAptos).length);
  console.log("  ya en BD:", a.filter((x) => x.enBD).length, "| asignado a otra persona en BD:", a.filter((x) => x.enBD && !x.bdCalifOk).length);
}
const inconsist = out.filter((x) => x.enBD && x.bdChecklist && x.estadoSheet !== "SIN_ESTADO" && x.bdChecklist !== x.estadoSheet);
console.log("\nestado sheet ≠ estado BD:", inconsist.length);
