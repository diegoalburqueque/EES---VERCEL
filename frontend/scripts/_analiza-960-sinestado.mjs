// Solo lectura: estado real (checklist del analysis.json en Drive) de los IDs sin fila en MAESTRO_RM.
import { readFileSync } from "node:fs";
import { google } from "googleapis";
const A = JSON.parse(readFileSync(process.env.IN, "utf8")).filter((x) => x.estadoSheet === "SIN_ESTADO");
const NO_PROC = new Set(["33085354","33793160","33668936","33641979","33700211","34020622","33705037","33674564","33438247"]);
const auth = new google.auth.GoogleAuth({ keyFile: "service-account.json", scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
const drive = google.drive({ version: "v3", auth });
const DA = { supportsAllDrives: true, includeItemsFromAllDrives: true };
const ls = async (q) => (await drive.files.list({ q, fields: "files(id,name,mimeType)", pageSize: 100, ...DA })).data.files ?? [];
const res = [];
for (const x of A) {
  let estado = "SIN_CARPETA_DRIVE";
  const carp = (await ls(`name = '${x.id}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`))[0];
  if (carp) {
    estado = "SIN_ANALYSIS_JSON";
    const hijos = await ls(`'${carp.id}' in parents and trashed=false`);
    for (const h of hijos.filter((f) => f.mimeType.includes("folder"))) {
      const js = (await ls(`'${h.id}' in parents and trashed=false`)).find((f) => /^analysis\.json$/i.test(f.name));
      if (js) { const r = await drive.files.get({ fileId: js.id, alt: "media", ...DA }, { responseType: "text" });
        const j = JSON.parse(typeof r.data === "string" ? r.data : JSON.stringify(r.data));
        estado = j.checklist_admisibilidad_rm?.resultado_general || "JSON_SIN_CHECKLIST"; break; }
    }
  }
  res.push({ ...x, estado, noProc: NO_PROC.has(x.id) });
}
const g = {};
for (const r of res) (g[r.cal] ??= []).push(`${r.id}=${r.estado}${r.noProc ? "(etapa)" : ""}`);
for (const [k, v] of Object.entries(g)) console.log(`${k} (${v.length}):\n  ${v.join(", ")}`);
const t = res.reduce((a, r) => ((a[r.estado] = (a[r.estado] || 0) + 1), a), {});
console.log("\nTOTAL:", JSON.stringify(t), "| de los 9 no procesados por etapa:", res.filter((r) => r.noProc).length);
