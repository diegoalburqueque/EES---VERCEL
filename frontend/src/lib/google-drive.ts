import "server-only";
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

/**
 * Lee el analysis.json real de un caso desde Google Drive (el archivo al que apunta
 * `casos.json_resultado_url`, columna LINK_ANALISIS_JSON del sheet MAESTRO_RM).
 *
 * Credencial: la misma que usa el bot `compin-calificacion-motor` para escribir en Drive —
 * es lo único que se reutiliza de él, nada más, y acá solo se usa para LEER.
 *
 * Dos formas de dársela, en este orden de prioridad:
 *   1. Variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON — el contenido completo de
 *      service-account.json como un solo string. Es la que se usa en Vercel: un archivo
 *      gitignorado (`service-account.json`) nunca llega al deploy porque Vercel construye
 *      desde el repo de git, no desde el disco local — por eso en producción esto fallaba
 *      en silencio y siempre caía a la ficha sintética.
 *   2. Archivo `service-account.json` en la raíz de este proyecto — solo para desarrollo
 *      local, donde sí existe en disco (copiado a mano del bot).
 */

let clienteDrive: ReturnType<typeof google.drive> | null = null;

function obtenerClienteDrive() {
  if (clienteDrive) return clienteDrive;

  const credencialEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

  if (credencialEnv) {
    const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(credencialEnv), scopes });
    clienteDrive = google.drive({ version: "v3", auth });
    return clienteDrive;
  }

  const rutaCredencial = path.resolve(process.cwd(), "service-account.json");
  if (!fs.existsSync(rutaCredencial)) {
    throw new Error(
      `No hay credencial de Drive: falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON, y tampoco existe ${rutaCredencial} en disco.`
    );
  }
  const auth = new google.auth.GoogleAuth({ keyFile: rutaCredencial, scopes });
  clienteDrive = google.drive({ version: "v3", auth });
  return clienteDrive;
}

/** Extrae el fileId de un link de Drive tipo .../file/d/{ID}/view?... */
function idDesdeLinkDrive(link: string): string | null {
  const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Descarga y parsea el analysis.json real de un caso desde Drive.
 * Devuelve `null` si el link no es válido o el archivo no se pudo leer/parsear —
 * el llamador decide qué hacer (típicamente: seguir con la ficha sintética existente).
 */
export async function leerAnalysisJsonDesdeDrive(linkDrive: string): Promise<unknown | null> {
  const fileId = idDesdeLinkDrive(linkDrive);
  if (!fileId) return null;

  try {
    const drive = obtenerClienteDrive();
    const respuesta = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    const texto = typeof respuesta.data === "string" ? respuesta.data : JSON.stringify(respuesta.data);
    return JSON.parse(texto);
  } catch (err) {
    console.error(`No se pudo leer el analysis.json de Drive (fileId=${fileId}):`, err);
    return null;
  }
}
