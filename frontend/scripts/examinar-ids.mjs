// Read-only: examina en MAESTRO_RM los IDs que hay que insertar. No toca la BD.
//   node scripts/examinar-ids.mjs

import { google } from "googleapis";
import fs from "node:fs";
import path from "node:path";

const SPREADSHEET_ID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";

const IDS = `
33444284 32669141 32773812 33454915 33650972 33217547 33433197 33464897
33436393 33461904 33801410 32971229 33463767 33464530 33471800 33785405
33762047 33474882 33468101 33469184 33470259 33479973 33517496 33047848
33594893 33483519 32922083 33483727 33483852 33484242 32697746 33320122
`.trim().split(/\s+/);

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: "MAESTRO_RM",
});
const filas = res.data.values ?? [];
const header = filas[0];
const idx = (c) => header.indexOf(c);
const cols = [
  "ID_TRAMITE", "REGION_ID", "NOMBRE_COMPLETO", "RUT", "ESTADO_GENERAL", "ESTADO_IA",
  "ESTADO_QA", "ERROR_COUNT", "LAST_ERROR_CODE", "CHECKLIST_RM_RESULTADO",
  "IA_PORCENTAJE_PROPUESTO", "IA_ACCION_SUGERIDA", "REQUIERE_REVISION",
  "PROFESIONAL_ASIGNADO", "LINK_ANALISIS_JSON", "LINK_FICHA",
  "LINK_CEDULA", "LINK_IBF", "LINK_ISRA", "LINK_IVADEC",
  "LINK_COMPLEMENTARIO_1", "LINK_COMPLEMENTARIO_2", "LINK_COMPLEMENTARIO_3",
];

const porId = new Map();
for (const f of filas.slice(1)) {
  const id = (f[idx("ID_TRAMITE")] ?? "").trim();
  if (id) porId.set(id, f);
}

const encontrados = [];
const faltantes = [];
const resumen = [];

for (const id of IDS) {
  const f = porId.get(id);
  if (!f) { faltantes.push(id); continue; }
  encontrados.push(id);
  const g = (c) => (f[idx(c)] ?? "").trim();
  const docs = ["LINK_CEDULA", "LINK_IBF", "LINK_ISRA", "LINK_IVADEC"].filter((c) => g(c)).length;
  const comp = ["LINK_COMPLEMENTARIO_1", "LINK_COMPLEMENTARIO_2", "LINK_COMPLEMENTARIO_3"].filter((c) => g(c)).length;
  resumen.push({
    ID: id,
    REGION: g("REGION_ID"),
    NOMBRE: g("NOMBRE_COMPLETO").slice(0, 22),
    ESTADO_IA: g("ESTADO_IA"),
    ESTADO_QA: g("ESTADO_QA"),
    ERR: g("ERROR_COUNT") || "0",
    ERR_CODE: g("LAST_ERROR_CODE"),
    CHECKLIST: g("CHECKLIST_RM_RESULTADO"),
    "IA_%": g("IA_PORCENTAJE_PROPUESTO"),
    ACCION: g("IA_ACCION_SUGERIDA").slice(0, 12),
    REV: g("REQUIERE_REVISION"),
    JSON: g("LINK_ANALISIS_JSON") ? "sí" : "—",
    FICHA: g("LINK_FICHA") ? "sí" : "—",
    "DOCS(4)": docs,
    COMP: comp,
    ASIGNADO: g("PROFESIONAL_ASIGNADO").slice(0, 16),
  });
}

console.log(`\nIDs pedidos: ${IDS.length} | encontrados: ${encontrados.length} | faltantes: ${faltantes.length}`);
if (faltantes.length) console.log("FALTANTES en MAESTRO_RM:", faltantes.join(", "));
console.table(resumen);

// Chequeo de duplicados en el sheet (mismo ID_TRAMITE 2+ veces)
const conteo = {};
for (const f of filas.slice(1)) {
  const id = (f[idx("ID_TRAMITE")] ?? "").trim();
  if (IDS.includes(id)) conteo[id] = (conteo[id] ?? 0) + 1;
}
const dups = Object.entries(conteo).filter(([, n]) => n > 1);
if (dups.length) console.log("\n⚠️ IDs duplicados en MAESTRO_RM:", dups.map(([id, n]) => `${id}×${n}`).join(", "));
