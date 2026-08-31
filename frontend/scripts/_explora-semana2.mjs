// Read-only: inspecciona la hoja "SEMANA 2" y resuelve qué hay en la columna F (link Drive).
//   node scripts/_explora-semana2.mjs
import { google } from "googleapis";
import path from "node:path";

const SID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const info = await sheets.spreadsheets.get({ spreadsheetId: SID, fields: "sheets(properties(title,gridProperties(rowCount,columnCount)))" });
console.log("Pestañas:", info.data.sheets.map((s) => `${s.properties.title} (${s.properties.gridProperties.rowCount}x${s.properties.gridProperties.columnCount})`).join("  ·  "));

const v = (await sheets.spreadsheets.values.get({ spreadsheetId: SID, range: "SEMANA 2" })).data.values ?? [];
const header = v[0] ?? [];
console.log(`\nSEMANA 2: ${v.length - 1} filas de datos`);
console.log("Encabezado (col : nombre):");
header.forEach((h, i) => console.log(`  ${String.fromCharCode(65 + i)}[${i}] : ${h}`));

const rows = v.slice(1);
// distribución de la columna de estado (busca columnas que parezcan estado)
const idxEstado = header.findIndex((h) => /estado/i.test(h));
if (idxEstado !== -1) {
  const dist = {};
  for (const r of rows) { const e = (r[idxEstado] || "(vacío)").trim(); dist[e] = (dist[e] || 0) + 1; }
  console.log(`\nDistribución de "${header[idxEstado]}" (col ${String.fromCharCode(65 + idxEstado)}):`);
  console.table(dist);
}

console.log("\nPrimeras 3 filas completas:");
for (const r of rows.slice(0, 3)) header.forEach((h, i) => console.log(`  ${h} = ${r[i] ?? ""}`));

// ── Resolver la columna F ──
const F = 5;
console.log(`\nColumna F = "${header[F]}". Ejemplos:`);
for (const r of rows.slice(0, 3)) console.log("  ", r[F]);

function fileId(link) {
  if (!link) return null;
  const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/) || link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

const idEj = fileId(rows.find((r) => r[F])?.[F]);
console.log("\nfileId del primer link F:", idEj);
if (idEj) {
  const meta = await drive.files.get({ fileId: idEj, fields: "id,name,mimeType,parents", supportsAllDrives: true });
  console.log("meta:", meta.data);
  if (meta.data.mimeType === "application/vnd.google-apps.folder") {
    const kids = await drive.files.list({
      q: `'${idEj}' in parents and trashed=false`,
      fields: "files(id,name,mimeType)", supportsAllDrives: true, includeItemsFromAllDrives: true,
    });
    console.log("hijos de esa carpeta:", kids.data.files);
    const ana = kids.data.files.find((f) => /02_ANALISIS_IA/i.test(f.name));
    if (ana) {
      const sub = await drive.files.list({
        q: `'${ana.id}' in parents and trashed=false`,
        fields: "files(id,name,mimeType)", supportsAllDrives: true, includeItemsFromAllDrives: true,
      });
      console.log("dentro de 02_ANALISIS_IA:", sub.data.files);
      const js = sub.data.files.find((f) => /analysis\.json/i.test(f.name));
      if (js) {
        const r = await drive.files.get({ fileId: js.id, alt: "media" }, { responseType: "text" });
        const j = JSON.parse(typeof r.data === "string" ? r.data : JSON.stringify(r.data));
        console.log("\nanalysis.json → checklist_admisibilidad_rm.resultado_general =", j.checklist_admisibilidad_rm?.resultado_general);
        console.log("carga_cerofilas.apto_para_revision =", j.carga_cerofilas?.apto_para_revision);
        console.log("metadata_informe.estado_analisis =", j.metadata_informe?.estado_analisis);
      }
    }
  }
}
