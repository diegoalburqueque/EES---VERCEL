// Relee el analysis.json real de cada caso de la hoja "SEMANA 2" (desde su carpeta de Drive,
// columna F) y reescribe la columna E "Estado" con el veredicto real de
// checklist_admisibilidad_rm.resultado_general.
//
// El problema: 749 de 989 filas quedaron en "NO ENCONTRADO" porque el proceso que llenó la hoja
// no encontró el JSON, pero el archivo SÍ existe en Drive: <carpeta_caso>/02_ANALISIS_IA/analysis.json
//
//   node scripts/actualizar-estados-semana2.mjs --dry            solo reporta, no escribe
//   node scripts/actualizar-estados-semana2.mjs                  reescribe SOLO las filas "NO ENCONTRADO"
//   node scripts/actualizar-estados-semana2.mjs --all            revisa y reescribe TODAS las filas
//   node scripts/actualizar-estados-semana2.mjs --dry --all
//
// No toca ninguna otra columna ni la base de datos.

import path from "node:path";
import { google } from "googleapis";

const SID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const HOJA = "SEMANA 2";
const COL_ID = 1;       // B
const COL_ESTADO = 4;   // E
const COL_CARPETA = 5;  // F
const DRY = process.argv.includes("--dry");
const TODAS = process.argv.includes("--all");
const CONCURRENCIA = 8;

const ETIQUETA = {
  APTO: "✅ Apto",
  REQUIERE_REVISION: "⚠️ Requiere revisión",
  NO_APTO: "🔴 No apto",
};

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), "service-account.json"),
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const DRIVE_ARGS = { supportsAllDrives: true, includeItemsFromAllDrives: true };

function idDeLink(link) {
  if (!link) return null;
  const m =
    link.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
    link.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function conReintento(fn, intentos = 5) {
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (e) {
      const code = e?.code || e?.response?.status;
      if (i === intentos - 1 || ![429, 500, 502, 503].includes(Number(code))) throw e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i + Math.random() * 300));
    }
  }
}

async function listar(q) {
  const r = await conReintento(() =>
    drive.files.list({ q, fields: "files(id,name,mimeType)", pageSize: 100, ...DRIVE_ARGS }),
  );
  return r.data.files ?? [];
}

// Devuelve { estado, detalle } para una fila.
async function resolverEstado(carpetaLink) {
  const carpetaId = idDeLink(carpetaLink);
  if (!carpetaId) return { estado: null, detalle: "sin link en columna F" };

  // hijos de la carpeta del caso
  let hijos;
  try {
    hijos = await listar(`'${carpetaId}' in parents and trashed=false`);
  } catch (e) {
    return { estado: null, detalle: `carpeta inaccesible (${e.code || e.message})` };
  }

  const analisis = hijos.find((f) => /02[_ ]?ANALISIS[_ ]?IA/i.test(f.name) && f.mimeType.includes("folder"));
  let jsonFile = null;

  if (analisis) {
    const dentro = await listar(`'${analisis.id}' in parents and trashed=false`);
    jsonFile = dentro.find((f) => /^analysis\.json$/i.test(f.name));
  }
  // fallback: buscar analysis.json en cualquier subcarpeta directa
  if (!jsonFile) {
    for (const h of hijos.filter((f) => f.mimeType.includes("folder"))) {
      const dentro = await listar(`'${h.id}' in parents and trashed=false`);
      const j = dentro.find((f) => /^analysis\.json$/i.test(f.name));
      if (j) { jsonFile = j; break; }
    }
  }
  if (!jsonFile) return { estado: null, detalle: "no hay analysis.json en la carpeta" };

  const r = await conReintento(() =>
    drive.files.get({ fileId: jsonFile.id, alt: "media", ...DRIVE_ARGS }, { responseType: "text" }),
  );
  let j;
  try {
    j = JSON.parse(typeof r.data === "string" ? r.data : JSON.stringify(r.data));
  } catch {
    return { estado: null, detalle: "analysis.json ilegible" };
  }
  const rg = j?.checklist_admisibilidad_rm?.resultado_general;
  if (!ETIQUETA[rg]) return { estado: null, detalle: `resultado_general = ${rg ?? "(ausente)"}` };
  return { estado: rg, detalle: ETIQUETA[rg] };
}

// ── pool de concurrencia ──
async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
        if ((idx + 1) % 50 === 0) console.log(`  ... ${idx + 1}/${items.length}`);
      }
    }),
  );
  return out;
}

// ── main ──
const v = (await sheets.spreadsheets.values.get({ spreadsheetId: SID, range: HOJA })).data.values ?? [];
const filas = v.slice(1).map((r, i) => ({
  filaSheet: i + 2, // 1-index + header
  id: (r[COL_ID] || "").trim(),
  estadoActual: (r[COL_ESTADO] || "").trim(),
  carpeta: (r[COL_CARPETA] || "").trim(),
}));

let objetivo = TODAS ? filas : filas.filter((f) => /NO ENCONTRADO/i.test(f.estadoActual) || !f.estadoActual);
const LIM = (() => { const i = process.argv.indexOf("--limit"); return i !== -1 ? parseInt(process.argv[i + 1], 10) : null; })();
if (LIM) objetivo = objetivo.slice(0, LIM);
console.log(`SEMANA 2: ${filas.length} filas · a revisar en esta corrida: ${objetivo.length}${DRY ? "  [DRY]" : ""}\n`);

const resultados = await mapPool(objetivo, CONCURRENCIA, async (f) => {
  const { estado, detalle } = await resolverEstado(f.carpeta).catch((e) => ({ estado: null, detalle: `error: ${e.message}` }));
  return { ...f, estado, detalle, etiqueta: estado ? ETIQUETA[estado] : null };
});

const resueltos = resultados.filter((r) => r.etiqueta);
const cambios = resueltos.filter((r) => r.etiqueta !== r.estadoActual);
const sinResolver = resultados.filter((r) => !r.etiqueta);

const dist = {};
for (const r of resueltos) dist[r.etiqueta] = (dist[r.etiqueta] || 0) + 1;
console.log("\nVeredicto real leído del analysis.json:");
console.table(dist);
console.log(`Filas que cambiarían: ${cambios.length}  ·  ya correctas: ${resueltos.length - cambios.length}  ·  sin resolver: ${sinResolver.length}`);

if (sinResolver.length) {
  console.log("\nSin resolver (motivo):");
  const m = {};
  for (const r of sinResolver) m[r.detalle] = (m[r.detalle] || 0) + 1;
  console.table(m);
  console.log("IDs sin resolver:", sinResolver.map((r) => r.id).join(", "));
}

if (DRY) {
  console.log("\n[DRY] Ejemplos de cambios:");
  for (const c of cambios.slice(0, 20)) console.log(`  fila ${c.filaSheet} (ID ${c.id}): "${c.estadoActual}" -> "${c.etiqueta}"`);
  console.log(`\n[DRY] Total a escribir: ${cambios.length}. Corre sin --dry para aplicar.`);
} else if (cambios.length) {
  const data = cambios.map((c) => ({ range: `${HOJA}!E${c.filaSheet}`, values: [[c.etiqueta]] }));
  for (let i = 0; i < data.length; i += 400) {
    await conReintento(() =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SID,
        requestBody: { valueInputOption: "RAW", data: data.slice(i, i + 400) },
      }),
    );
    console.log(`  escritas ${Math.min(i + 400, data.length)}/${data.length}`);
  }
  console.log(`\nListo. ${cambios.length} celdas actualizadas en ${HOJA}!E.`);
} else {
  console.log("\nNada que escribir.");
}
