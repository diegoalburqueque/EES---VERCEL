// Inserta los primeros N casos de MAESTRO_RM (exportado como CSV desde Sheets) en la tabla `casos`.
//
// Fuente: CSV exportado de la hoja MAESTRO_RM (columnas resumen del bot: ID_TRAMITE, IA_*, CARGA_*,
// CHECKLIST_RM_*, etc.) — NO es el analysis.json completo por caso (eso vive en Drive, link en
// LINK_ANALISIS_JSON). Por eso este script solo llena las columnas de `casos` que tienen un
// equivalente directo y razonable en MAESTRO_RM; el resto queda NULL. La fila cruda completa
// (con los nombres de columna originales del sheet) se guarda igual en `analysis_json`, marcada
// con _fuente para dejar claro que no es el JSON real del bot.
//
// Casos con error del bot (ESTADO_IA = ERROR o LAST_ERROR_CODE con valor): se insertan igual,
// con estado_checklist = NULL, tiene_error_bot = true, y una fila en casos_errores con el detalle.
//
// Uso:
//   node scripts/insertar-maestro-rm.mjs "<ruta al csv>" [cantidad=500]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const linea = env.split("\n").find((l) => l.startsWith("DATABASE_URL"));
const conn = linea.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const rutaCsv = process.argv[2];
const cantidad = Number(process.argv[3] ?? 500);

if (!rutaCsv) {
  console.error("Uso: node scripts/insertar-maestro-rm.mjs \"<ruta al csv>\" [cantidad=500]");
  process.exit(1);
}

// ── Parser CSV mínimo (soporta comillas, comas y saltos de línea dentro de campos) ──
function parseCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\r") {
      // ignorar, \n cierra la fila
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

const texto = readFileSync(rutaCsv, "utf8");
const filas = parseCsv(texto).filter((f) => f.length > 1 || f[0] !== "");
const header = filas[0];
const datos = filas.slice(1, 1 + cantidad);

const idx = (nombreCol) => header.indexOf(nombreCol);
const col = (fila, nombreCol) => {
  const i = idx(nombreCol);
  if (i === -1) return "";
  return (fila[i] ?? "").trim();
};

// ── Helpers de mapeo ──
const vacioANull = (v) => (v === "" || v === undefined ? null : v);

const ESTADOS_CHECKLIST_VALIDOS = new Set(["APTO", "REQUIERE_REVISION", "NO_APTO"]);
const RESULTADOS_ITEM_VALIDOS = new Set(["CUMPLE", "NO_CUMPLE", "NO_VERIFICABLE"]);
const REPRESENTANTE_PRESENTE_VALIDOS = new Set(["SI", "NO", "NO_APLICA", "NO_VERIFICABLE"]);

function checklistItem(v) {
  const val = (v || "").trim().toUpperCase();
  return RESULTADOS_ITEM_VALIDOS.has(val) ? val : null;
}

function siNoABoolean(v) {
  const val = (v || "").trim().toUpperCase();
  if (val === "SI") return true;
  if (val === "NO") return false;
  return null;
}

function numeroDesdeTexto(v) {
  if (!v) return null;
  const limpio = v.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
}

function enteroDesdeTexto(v) {
  if (!v) return null;
  const n = parseInt(v.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

// ── Mapea una fila del CSV a las columnas de `casos` ──
function mapearFila(fila) {
  const g = (nombre) => vacioANull(col(fila, nombre));

  const edadTexto = g("EDAD");
  const edad = enteroDesdeTexto(edadTexto);

  const estadoIa = (g("ESTADO_IA") || "").toUpperCase();
  const lastErrorCode = g("LAST_ERROR_CODE");
  const tieneError = estadoIa === "ERROR" || !!lastErrorCode;

  const checklistResultado = (g("CHECKLIST_RM_RESULTADO") || "").toUpperCase();
  const estadoChecklist = !tieneError && ESTADOS_CHECKLIST_VALIDOS.has(checklistResultado)
    ? checklistResultado
    : null;

  const representantePresenteRaw = (g("CHECKLIST_RM_REPRESENTANTE_PRESENTE") || "").toUpperCase();
  const representantePresente = REPRESENTANTE_PRESENTE_VALIDOS.has(representantePresenteRaw)
    ? representantePresenteRaw
    : "NO_APLICA";

  // Snapshot crudo de la fila del sheet — no es el analysis.json real del bot.
  const rawRow = {};
  header.forEach((h, i) => {
    if (fila[i]) rawRow[h] = fila[i];
  });

  return {
    region: g("REGION_ID"),
    id_tramite: g("ID_TRAMITE"),
    id_etapa: g("ID_ETAPA"),
    rut: g("RUT"),
    nombre_completo: g("NOMBRE_COMPLETO"),
    es_menor_de_edad: edad !== null ? edad < 18 : false,
    requiere_representante: siNoABoolean(g("CHECKLIST_RM_REQUIERE_REPRESENTANTE")) ?? false,
    representante_presente: representantePresente,
    estado_checklist: estadoChecklist,
    tiene_error_bot: tieneError,

    meta_requiere_revision_humana: siNoABoolean(g("REQUIERE_REVISION")),

    identidad_diferencias_menores_toleradas: null,

    ident_edad_texto: edadTexto,
    ident_sexo: g("SEXO"),
    ident_direccion_notificacion: g("DIRECCION_NOTIFICACION"),
    ident_comuna: g("COMUNA"),
    ident_zona_vivienda: g("CARGA_ZONA_VIVIENDA") ?? g("IA_ZONA_VIVIENDA"),

    calif_diagnostico_principal: g("IA_DIAGNOSTICO_PRINCIPAL"),
    calif_origen_principal_discapacidad: g("IA_ORIGEN_PRINCIPAL"),
    calif_diagnosticos_secundarios: g("IA_DIAGNOSTICOS_SECUNDARIOS"),
    calif_origenes_secundarios: g("IA_ORIGENES_SECUNDARIOS"),
    calif_porcentaje_discapacidad_texto: g("IA_PORCENTAJE_DISCAPACIDAD"),

    prop_accion_sugerida: g("IA_ACCION_SUGERIDA"),
    prop_porcentaje_propuesto_texto: g("IA_PORCENTAJE_PROPUESTO"),
    prop_grado_propuesto: g("IA_GRADO_PROPUESTO"),
    prop_origen_principal_propuesto: g("IA_ORIGEN_PRINCIPAL_PROPUESTO"),
    prop_movilidad_reducida_propuesta: g("IA_MOVILIDAD_REDUCIDA_PROPUESTA"),
    porcentaje_propuesto_ia: numeroDesdeTexto(g("IA_PORCENTAJE_PROPUESTO")),

    checklist_cedula_resultado: checklistItem(g("CHECKLIST_RM_CEDULA")),
    checklist_ibf_resultado: checklistItem(g("CHECKLIST_RM_IBF")),
    checklist_isra_resultado: checklistItem(g("CHECKLIST_RM_ISRA")),
    checklist_ivadec_resultado: checklistItem(g("CHECKLIST_RM_IVADEC")),

    cerofilas_zona_vivienda: g("CARGA_ZONA_VIVIENDA"),
    cerofilas_institucion_calificadora: g("CARGA_INSTITUCION_CALIFICADORA"),
    cerofilas_nombre_institucion: g("CARGA_NOMBRE_INSTITUCION"),
    cerofilas_diagnostico_principal: g("CARGA_DIAGNOSTICO_PRINCIPAL"),
    cerofilas_origen_principal_discapacidad: g("CARGA_ORIGEN_PRINCIPAL"),
    cerofilas_diagnosticos_secundarios: g("CARGA_DIAGNOSTICOS_SECUNDARIOS"),
    cerofilas_porcentaje_discapacidad_texto: g("CARGA_PORCENTAJE_DISCAPACIDAD"),
    cerofilas_movilidad_reducida: g("CARGA_MOVILIDAD_REDUCIDA"),
    cerofilas_antecedentes_sociales_relevantes: g("CARGA_ANTECEDENTES_SOCIALES"),
    cerofilas_observaciones_calificacion: g("CARGA_OBSERVACIONES_CALIFICACION"),

    word_url: g("LINK_FICHA"),
    json_resultado_url: g("LINK_ANALISIS_JSON"),

    tokens_entrada: enteroDesdeTexto(g("TOKENS_ENTRADA")),
    tokens_salida: enteroDesdeTexto(g("TOKENS_SALIDA")),
    costo_usd: numeroDesdeTexto(g("COSTO_USD")),
    costo_clp: numeroDesdeTexto(g("COSTO_CLP")),

    analysis_json: { _fuente: "MAESTRO_RM (poblado inicial, no es el analysis.json real del bot)", ...rawRow },

    _error: tieneError
      ? {
          paso: g("NODE_ULTIMO") || "DESCONOCIDO",
          codigo_error: lastErrorCode || "ERROR_DESCONOCIDO",
          mensaje_error: g("LAST_ERROR_MESSAGE"),
          run_id: g("RUN_ID_ULTIMO"),
          case_run_id: g("CASE_RUN_ID_ULTIMO"),
          worker_id: g("BOT_ULTIMO"),
          document_set_hash: g("DOCUMENT_SET_HASH"),
          fecha_error: g("LAST_ERROR_AT") || g("ULTIMA_ACTUALIZACION") || new Date().toISOString(),
        }
      : null,

    documentos: [
      ["CEDULA", g("LINK_CEDULA")],
      ["IBF", g("LINK_IBF")],
      ["ISRA", g("LINK_ISRA")],
      ["IVADEC", g("LINK_IVADEC")],
      ["COMPLEMENTARIO", g("LINK_COMPLEMENTARIO_1")],
      ["COMPLEMENTARIO", g("LINK_COMPLEMENTARIO_2")],
      ["COMPLEMENTARIO", g("LINK_COMPLEMENTARIO_3")],
    ].filter(([, link]) => !!link),
  };
}

function mensajeErrorAJson(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return { mensaje: texto };
  }
}

const columnasInsert = [
  "region", "id_tramite", "id_etapa", "rut", "nombre_completo", "es_menor_de_edad",
  "requiere_representante", "representante_presente", "estado_checklist", "estado_caso_id",
  "tiene_error_bot", "meta_requiere_revision_humana",
  "ident_edad_texto", "ident_sexo", "ident_direccion_notificacion", "ident_comuna", "ident_zona_vivienda",
  "calif_diagnostico_principal", "calif_origen_principal_discapacidad", "calif_diagnosticos_secundarios",
  "calif_origenes_secundarios", "calif_porcentaje_discapacidad_texto",
  "prop_accion_sugerida", "prop_porcentaje_propuesto_texto", "prop_grado_propuesto",
  "prop_origen_principal_propuesto", "prop_movilidad_reducida_propuesta", "porcentaje_propuesto_ia",
  "checklist_cedula_resultado", "checklist_ibf_resultado", "checklist_isra_resultado", "checklist_ivadec_resultado",
  "cerofilas_zona_vivienda", "cerofilas_institucion_calificadora", "cerofilas_nombre_institucion",
  "cerofilas_diagnostico_principal", "cerofilas_origen_principal_discapacidad",
  "cerofilas_diagnosticos_secundarios", "cerofilas_porcentaje_discapacidad_texto",
  "cerofilas_movilidad_reducida", "cerofilas_antecedentes_sociales_relevantes",
  "cerofilas_observaciones_calificacion",
  "word_url", "json_resultado_url",
  "tokens_entrada", "tokens_salida", "costo_usd", "costo_clp",
  "analysis_json",
];

const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();

try {
  const { rows: estadoBorrador } = await cliente.query(
    "SELECT id FROM estados_caso WHERE nombre = 'BORRADOR'"
  );
  if (estadoBorrador.length === 0) throw new Error("No existe estados_caso 'BORRADOR' — corre seed.sql primero.");
  const estadoBorradorId = estadoBorrador[0].id;

  let insertados = 0;
  let conError = 0;
  let saltados = 0;

  for (const fila of datos) {
    const m = mapearFila(fila);
    if (!m.id_tramite) { saltados++; continue; }

    const valores = columnasInsert.map((c) => {
      if (c === "estado_caso_id") return estadoBorradorId;
      if (c === "analysis_json") return JSON.stringify(m.analysis_json);
      return m[c];
    });

    const placeholders = valores.map((_, i) => `$${i + 1}`).join(", ");

    try {
      const r = await cliente.query(
        `INSERT INTO casos (${columnasInsert.join(", ")}) VALUES (${placeholders})
         ON CONFLICT (id_tramite) DO NOTHING
         RETURNING id`,
        valores
      );

      if (r.rowCount === 0) { saltados++; continue; }
      const casoId = r.rows[0].id;
      insertados++;

      if (m._error) {
        conError++;
        await cliente.query(
          `INSERT INTO casos_errores
             (caso_id, paso, codigo_error, mensaje_error, run_id, case_run_id, worker_id, document_set_hash, fecha_error)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            casoId,
            m._error.paso,
            m._error.codigo_error,
            JSON.stringify(mensajeErrorAJson(m._error.mensaje_error)),
            m._error.run_id,
            m._error.case_run_id,
            m._error.worker_id,
            m._error.document_set_hash,
            m._error.fecha_error,
          ]
        );
      }

      for (const [tipo, link] of m.documentos) {
        await cliente.query(
          `INSERT INTO documentos_caso (caso_id, tipo, link_drive, descargado) VALUES ($1, $2, $3, true)`,
          [casoId, tipo, link]
        );
      }
    } catch (err) {
      console.error(`Error insertando ${m.id_tramite}:`, err.message);
      saltados++;
    }
  }

  console.log(`Listo. Insertados: ${insertados} | Con error de bot: ${conError} | Saltados (duplicado/sin id_tramite/error SQL): ${saltados}`);
} finally {
  await cliente.end();
}
