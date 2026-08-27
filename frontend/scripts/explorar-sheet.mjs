// Explora si el service account puede leer el Google Sheet MAESTRO_RM.
//   node scripts/explorar-sheet.mjs

import { google } from "googleapis";
import fs from "node:fs";
import path from "node:path";

const SPREADSHEET_ID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const RUTA_CRED = path.resolve(process.cwd(), "service-account.json");

if (!fs.existsSync(RUTA_CRED)) {
  console.error("No existe service-account.json en", process.cwd());
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: RUTA_CRED,
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
});

const cred = JSON.parse(fs.readFileSync(RUTA_CRED, "utf8"));
console.log("Service account:", cred.client_email);

try {
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({
    fileId: SPREADSHEET_ID,
    fields: "name,mimeType,owners(emailAddress)",
    supportsAllDrives: true,
  });
  console.log("Archivo:", meta.data.name, "|", meta.data.mimeType);
} catch (e) {
  console.log("drive.files.get FALLÓ:", e.message);
}

try {
  const sheets = google.sheets({ version: "v4", auth });
  const info = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets(properties(title,sheetId,gridProperties(rowCount,columnCount)))",
  });
  console.log("\nPestañas:");
  for (const s of info.data.sheets ?? []) {
    const p = s.properties;
    console.log(`  ${p.title} (gid ${p.sheetId}) — ${p.gridProperties.rowCount}x${p.gridProperties.columnCount}`);
  }

  const cab = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "MAESTRO_RM!1:2",
  });
  console.log("\nMAESTRO_RM — encabezado (", (cab.data.values?.[0] ?? []).length, "columnas):");
  console.log((cab.data.values?.[0] ?? []).join(" | "));
} catch (e) {
  console.log("\nsheets API FALLÓ:", e.message);
}
