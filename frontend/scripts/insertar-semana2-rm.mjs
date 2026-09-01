// Inserción masiva del lote "SEMANA 2": ~982 casos de RM en `casos` +
// `documentos_caso` + `historial_estados_caso`, cada uno asignado a su calificador.
//
//   node scripts/insertar-semana2-rm.mjs --dry            muestra qué haría, NO toca la BD
//   node scripts/insertar-semana2-rm.mjs --limit 20       solo los primeros 20 (prueba)
//   node scripts/insertar-semana2-rm.mjs                  inserta todo
//
// ── FUENTES (por qué son 4 hojas) ──────────────────────────────────────────
// MAESTRO_RM se quedó SIN FILAS (tope 986). El bot analizó los ~57 casos que
// sobraron, pero no pudo escribir el resultado en esa hoja. Así que:
//   - IDs a insertar        → pestaña "SEMANA 2" (col B)
//   - calificador           → lista del chat (scratchpad) → SEMANA 2 col C
//                             → TRAZABILIDAD_ASIGNACIONES → MAESTRO_CALIFICACION
//   - datos del caso        → MAESTRO_RM (LINK_ANALISIS_JSON + doc links)
//                             fallback: analysis.json desde la carpeta Drive
//                             (SEMANA 2 col F → 02_ANALISIS_IA/analysis.json)
//                             + doc links desde MAESTRO_CALIFICACION
//
// Idempotente: ON CONFLICT (id_tramite) DO NOTHING. Transacción por caso.
// Al final imprime la lista de los que SÍ y los que NO se pudieron insertar.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { google } from "googleapis";

const SID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const DRY = process.argv.includes("--dry");
const LIMIT = (() => { const i = process.argv.indexOf("--limit"); return i !== -1 ? parseInt(process.argv[i + 1], 10) : null; })();
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LISTA_CHAT = "C:/Users/albur/AppData/Local/Temp/claude/C--Users-albur-Desktop/be201906-1fbc-417e-a705-2af4c85b0546/scratchpad/asignaciones-chat.txt";
const CONCURRENCIA = 8;

// ── nombre (como aparece en cualquier hoja) → correo del usuario en la BD ──
// ⚠️ "Carolina Fernandez": la BD tiene DOS. Se usa carolina.fernandez@ ("Carolina
//    Fernandez Pizarro"); carolina.calificadora@ es cuenta de prueba (mismo patrón
//    que macarena.calificadora@ vs macarena.rodriguez@). CONFIRMAR si hay dudas.
const NOMBRE_A_CORREO = {
  "Carla Flores Riveo": "carla.flores@grupoees.cl",
  "Carla Flores Riveros": "carla.flores@grupoees.cl",
  "Carla Herrera": "carla.herrera@grupoees.cl",
  "Carolina Fernandez": "carolina.fernandez@grupoees.cl",
  "Carolina Fernández": "carolina.fernandez@grupoees.cl",
  "Catalina Caro": "catalina.caro@grupoees.cl",
  "Cecilia Uribe Correa": "cecilia.uribe@grupoees.cl",
  "Flavia Durán Gutierrez": "flavia.duran@grupoees.cl",
  "Francisca Barrueto Cabañas": "francisca.barrueto@grupoees.cl",
  "Francisca Guzmán Pizarro": "francisca.guzman@grupoees.cl",
  "Guisella Cifuentes Martínez": "guisella.cifuentes@grupoees.cl",
  "Ignacio Castro Mellado": "jose.castro@grupoees.cl",
  "José Ignacio Castro Mellado": "jose.castro@grupoees.cl",
  "Juan Arriagada Chaparro": "juan.arriagada@grupoees.cl",
  "Karen Zurita Osses": "karen.zurita@grupoees.cl",
  "Leonardo Marilao": "leonardo.marilao@grupoees.cl",
  "Macarena Rodríguez Ortega": "macarena.rodriguez@grupoees.cl",
  "Macarena Rodriguez Ortega": "macarena.rodriguez@grupoees.cl",
  "María Constanza Quinteros": "maria.constanza@grupoees.cl",
  "María Saldías Lara": "maria.saldias@grupoees.cl",
  "Maria Vargas": "maria.vargas@grupoees.cl",
  "Melissa Cortés Torrejon": "melissa.cortes@grupoees.cl",
  "Mical Arriaza Piña": "mical.arriaza@grupoees.cl",
  "Nicole Lara": "nicole.lara@grupoees.cl",
  "Orlly González Colivoro": "orlly.gonzalez@grupoees.cl",
  "Pablo Campos": "pablo.campos@grupoees.cl",
  "Rodrigo Castilla Rubio": "rodrigo.castilla@grupoees.cl",
  "Tabata Ojeda Fontealba": "tabata.ojeda@grupoees.cl",
  "Yasna Rothen Sagredo": "yasna.rothen@grupoees.cl",
};

const norm = (x) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
const MAPA_NORM = new Map(Object.entries(NOMBRE_A_CORREO).map(([k, v]) => [norm(k), v]));

// ── Conexión ───────────────────────────────────────────────────────────────
const conn = readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });
const DA = { supportsAllDrives: true, includeItemsFromAllDrives: true };
const val = async (r) => (await sheets.spreadsheets.values.get({ spreadsheetId: SID, range: r })).data.values ?? [];

async function conReintento(fn, n = 5) {
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) {
      const c = Number(e?.code || e?.response?.status);
      if (i === n - 1 || ![429, 500, 502, 503].includes(c)) throw e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** i + Math.random() * 250));
    }
  }
}
function idDeLink(link) {
  if (!link) return null;
  const m = String(link).match(/\/folders\/([a-zA-Z0-9_-]+)/) || String(link).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(link).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
async function bajarJsonPorFileId(fileId) {
  const r = await conReintento(() => drive.files.get({ fileId, alt: "media", ...DA }, { responseType: "text" }));
  return JSON.parse(typeof r.data === "string" ? r.data : JSON.stringify(r.data));
}
async function analysisDesdeCarpeta(carpetaLink) {
  const carpetaId = idDeLink(carpetaLink);
  if (!carpetaId) return null;
  const hijos = (await conReintento(() => drive.files.list({ q: `'${carpetaId}' in parents and trashed=false`, fields: "files(id,name,mimeType)", pageSize: 100, ...DA }))).data.files ?? [];
  const ana = hijos.find((f) => /02[_ ]?ANALISIS[_ ]?IA/i.test(f.name) && f.mimeType.includes("folder"));
  const buscarEn = async (fid) => {
    const d = (await conReintento(() => drive.files.list({ q: `'${fid}' in parents and trashed=false`, fields: "files(id,name)", pageSize: 100, ...DA }))).data.files ?? [];
    return d.find((f) => /^analysis\.json$/i.test(f.name));
  };
  let js = ana ? await buscarEn(ana.id) : null;
  if (!js) for (const h of hijos.filter((f) => f.mimeType.includes("folder"))) { js = await buscarEn(h.id); if (js) break; }
  if (!js) return null;
  return { fileId: js.id, j: await bajarJsonPorFileId(js.id) };
}

// ── helpers de mapeo (idénticos a insertar-hoja5-rm.mjs) ───────────────────
const s = (v) => (v === undefined || v === null || v === "" ? null : String(v));
const REP_OK = new Set(["SI", "NO", "NO_APLICA", "NO_VERIFICABLE"]);
const CHK_ITEM_OK = new Set(["CUMPLE", "NO_CUMPLE", "NO_VERIFICABLE"]);
const CHK_GEN_OK = new Set(["APTO", "REQUIERE_REVISION", "NO_APTO"]);
function pct(v) { if (!v) return null; const m = String(v).replace(",", ".").match(/-?\d+(\.\d+)?/); if (!m) return null; const n = parseFloat(m[0]); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null; }
function entero(v) { if (!v) return null; const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10); return Number.isFinite(n) ? n : null; }
function fechaISO(v) { if (!v) return null; const m = String(v).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); if (!m) return null; const [, d, mo, y] = m; return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`; }

function mapear(j, col) {
  const ident = j.datos_identificacion ?? {}, calif = j.datos_calificacion ?? {}, valid = j.validacion_ivadec_cif ?? {};
  const prop = j.propuesta_calificacion_fundada ?? {}, cli = j.propuesta_formato_cliente ?? {};
  const soc = cli.antecedentes_sociales ?? {}, ibf = cli.datos_relevantes_calificacion ?? {}, comp = cli.informes_examenes_complementarios ?? {};
  const iv = cli.ivadec ?? {}, pc = cli.propuesta ?? {}, chk = j.checklist_admisibilidad_rm ?? {}, fd = j.fechas_documentos ?? {};
  const cf = j.carga_cerofilas ?? {}, meta = j.metadata_informe ?? {}, vid = j.verificacion_identidad ?? {};
  const ec = j.edad_calculada ?? {}, pi = j.profesional_ivadec ?? {}, ibfDuro = j.fuentes_duras_calificacion?.ibf ?? {};
  const noConsta = (v) => (!v || /^no consta/i.test(String(v)) ? null : String(v));
  const edad = entero(ident.edad);
  const esMenor = ec.anios != null ? ec.anios < 18 : edad !== null ? edad < 18 : false;
  const chkItem = (o) => (CHK_ITEM_OK.has((o?.resultado || "").toUpperCase()) ? o.resultado.toUpperCase() : null);
  const repPresente = REP_OK.has((chk.representante_presente || "").toUpperCase()) ? chk.representante_presente.toUpperCase() : "NO_APLICA";

  return {
    region: s(col("REGION_ID")) ?? "RM",
    id_tramite: s(col("ID_TRAMITE")) ?? s(meta.id_tramite),
    id_etapa: s(col("ID_ETAPA")),
    rut: s(col("RUT")) ?? s(j.fuentes_duras_admisibilidad?.cedula?.rut_usuario),
    nombre_completo: s(col("NOMBRE_COMPLETO")) ?? s(meta.nombre_completo_usuario),
    fecha_nacimiento: noConsta(ec.fecha_nacimiento_usada) ?? fechaISO(ident.fecha_nacimiento),
    es_menor_de_edad: esMenor,
    edad_calc_texto: noConsta(ec.texto),
    edad_calc_total_meses: typeof ec.total_meses === "number" ? ec.total_meses : null,
    edad_calc_fecha_referencia: noConsta(ec.fecha_referencia),
    edad_calc_fuente_fecha_nac: noConsta(ec.fuente_fecha_nacimiento),
    edad_calc_advertencia: noConsta(ec.advertencia),
    ivadec_prof_nombre: noConsta(pi.nombre_completo),
    ivadec_prof_run: noConsta(pi.run),
    ivadec_prof_run_dv_valido: typeof pi.run_dv_valido === "boolean" ? pi.run_dv_valido : null,
    ivadec_prof_profesion: noConsta(pi.profesion),
    ivadec_prof_advertencia: noConsta(pi.advertencia),
    ibf_descripcion_estado_funcional_literal: noConsta(ibfDuro.descripcion_estado_funcional_ibf),
    requiere_representante: chk.requiere_representante === true,
    representante_presente: repPresente,
    estado_checklist: CHK_GEN_OK.has(chk.resultado_general) ? chk.resultado_general : null,
    tiene_error_bot: false,
    meta_tipo_informe: s(meta.tipo_informe),
    meta_estado_analisis: s(meta.estado_analisis),
    meta_requiere_revision_humana: meta.requiere_revision_humana ?? null,
    identidad_resultado: s(vid.resultado),
    identidad_resumen: s(vid.resumen),
    ident_nombre: s(ident.nombre),
    ident_apellidos: s(ident.apellidos),
    ident_fecha_nacimiento_texto: s(ident.fecha_nacimiento),
    ident_edad_texto: s(ident.edad),
    ident_sexo: s(ident.sexo),
    ident_direccion_notificacion: s(ident.direccion_notificacion),
    ident_comuna: s(ident.comuna),
    ident_zona_vivienda: s(ident.zona_vivienda),
    ident_institucion_calificadora: s(ident.institucion_calificadora),
    ident_red_apoyo: s(ident.red_apoyo),
    calif_diagnostico_principal: s(calif.diagnostico_principal),
    calif_origen_principal_discapacidad: s(calif.origen_principal_discapacidad),
    calif_diagnosticos_secundarios: s(calif.diagnosticos_secundarios),
    calif_origenes_secundarios: s(calif.origenes_secundarios),
    calif_porcentaje_discapacidad_texto: s(calif.porcentaje_discapacidad),
    calif_grado_discapacidad: s(calif.grado_discapacidad),
    calif_idis: s(calif.idis),
    calif_movilidad_reducida_texto: s(calif.movilidad_reducida),
    calif_antecedentes_sociales_relevantes: s(calif.antecedentes_sociales_relevantes),
    calif_observaciones_datos_relevantes: s(calif.observaciones_datos_relevantes_calificacion),
    valid_porcentaje_consta: valid.porcentaje_consta ?? null,
    valid_porcentaje_existe_en_tabla: valid.porcentaje_existe_en_tabla ?? null,
    valid_idis_tabla: s(valid.idis_tabla),
    valid_grado_tabla: s(valid.grado_tabla),
    valid_coincide_con_expediente: valid.coincide_con_expediente ?? null,
    valid_observacion_breve: s(valid.observacion_breve),
    qa_observaciones: JSON.stringify(j.observaciones_qa ?? []),
    qa_nota_codigos_no_aplican: s(j.nota_codigos_no_aplican),
    prop_accion_sugerida: s(prop.accion_sugerida),
    prop_porcentaje_propuesto_texto: s(prop.porcentaje_propuesto),
    prop_grado_propuesto: s(prop.grado_propuesto),
    prop_origen_principal_propuesto: s(prop.origen_principal_propuesto),
    prop_origenes_secundarios_propuestos: s(prop.origenes_secundarios_propuestos),
    prop_movilidad_reducida_propuesta: s(prop.movilidad_reducida_propuesta),
    prop_reevaluacion_propuesta: s(prop.reevaluacion_propuesta),
    prop_fundamento_breve: s(prop.fundamento_breve),
    porcentaje_propuesto_ia: pct(prop.porcentaje_propuesto) ?? pct(calif.porcentaje_discapacidad),
    cliente_isra_completado_por: s(soc.isra_completado_por),
    cliente_nivel_educativo: s(soc.nivel_educativo),
    cliente_trabajo_ocupacion: s(soc.trabajo_ocupacion),
    cliente_situacion_familiar: s(soc.situacion_familiar),
    cliente_grado_limitacion: s(soc.grado_limitacion),
    cliente_situacion_especial: s(soc.situacion_especial),
    cliente_ibf_completado_por: s(ibf.ibf_completado_por),
    cliente_diagnosticos: s(ibf.diagnosticos),
    cliente_resumen_ibf: s(ibf.resumen_informacion_relevante_ibf),
    cliente_descripcion_estado_funcional: s(ibf.descripcion_estado_funcional),
    cliente_medicamentos: s(ibf.medicamentos),
    cliente_ayudas_tecnicas: s(ibf.ayudas_tecnicas),
    cliente_informes_complementarios: JSON.stringify(comp.items ?? []),
    cliente_resumen_concordancia: s(comp.resumen_concordancia),
    cliente_ivadec_calificador: s(iv.ivadec_calificador),
    cliente_ivadec_aplicado_a: s(iv.aplicado_a),
    cliente_ivadec_porcentaje_obtenido_texto: s(iv.porcentaje_obtenido),
    cliente_ivadec_origenes_considerados: s(iv.origenes_considerados),
    porcentaje_ivadec_documento: pct(iv.porcentaje_obtenido),
    cliente_observaciones_ivadec: Array.isArray(cli.observaciones_ivadec) ? cli.observaciones_ivadec : null,
    cliente_propuesta_texto_sugerencia: s(pc.texto_sugerencia),
    cliente_propuesta_movilidad_reducida: s(pc.movilidad_reducida),
    cliente_propuesta_reevaluacion: s(pc.reevaluacion),
    cliente_propuesta_glosa_tipo: s(pc.glosa_tipo),
    cliente_propuesta_glosa_texto: s(pc.glosa_texto),
    fecha_doc_cedula: s(fd.cedula),
    fecha_doc_ibf: s(fd.ibf),
    fecha_doc_isra: s(fd.isra),
    fecha_doc_ivadec_cif: s(fd.ivadec_cif),
    fecha_doc_propuesta_ece: s(fd.propuesta_ece),
    fecha_doc_complementarios: s(fd.complementarios),
    checklist_cedula_resultado: chkItem(chk.cedula),
    checklist_cedula_observacion: s(chk.cedula?.observacion),
    checklist_ibf_resultado: chkItem(chk.ibf),
    checklist_ibf_observacion: s(chk.ibf?.observacion),
    checklist_isra_resultado: chkItem(chk.isra),
    checklist_isra_observacion: s(chk.isra?.observacion),
    checklist_ivadec_resultado: chkItem(chk.ivadec),
    checklist_ivadec_observacion: s(chk.ivadec?.observacion),
    cerofilas_zona_vivienda: s(cf.zona_vivienda),
    cerofilas_institucion_calificadora: s(cf.institucion_calificadora),
    cerofilas_nombre_institucion: s(cf.nombre_institucion),
    cerofilas_diagnostico_principal: s(cf.diagnostico_principal),
    cerofilas_origen_principal_discapacidad: s(cf.origen_principal_discapacidad),
    cerofilas_diagnosticos_secundarios: s(cf.diagnosticos_secundarios),
    cerofilas_origenes_secundarios: Array.isArray(cf.origenes_secundarios) ? cf.origenes_secundarios : null,
    cerofilas_porcentaje_discapacidad_texto: s(cf.porcentaje_de_discapacidad),
    cerofilas_movilidad_reducida: s(cf.movilidad_reducida),
    cerofilas_antecedentes_sociales_relevantes: s(cf.antecedentes_sociales_relevantes),
    cerofilas_observaciones_calificacion: s(cf.observaciones_calificacion),
    cerofilas_apto_para_revision: cf.apto_para_revision ?? null,
    cerofilas_alertas_carga: Array.isArray(cf.alertas_carga) ? cf.alertas_carga : null,
    word_nombre_archivo_sugerido: s(j.nombre_archivo_sugerido),
    word_url: s(col("LINK_FICHA")),
    json_resultado_url: s(col("LINK_ANALISIS_JSON")),
    tokens_entrada: entero(col("TOKENS_ENTRADA")),
    tokens_salida: entero(col("TOKENS_SALIDA")),
    costo_usd: (() => { const n = parseFloat(String(col("COSTO_USD") || "").replace(",", ".")); return Number.isFinite(n) ? n : null; })(),
    costo_clp: (() => { const n = parseFloat(String(col("COSTO_CLP") || "").replace(/[^\d.,-]/g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; })(),
    analysis_json: JSON.stringify(j),
  };
}

// ── pool de concurrencia ──────────────────────────────────────────────────
async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); if ((k + 1) % 50 === 0) console.log(`  ... resueltos ${k + 1}/${items.length}`); }
  }));
  return out;
}

// ══ MAIN ══════════════════════════════════════════════════════════════════
// Pool (no Client): el session pooler de Supabase corta conexiones largas. Con un
// pool cada checkout toma una conexión sana; una caída no mata el proceso.
const pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10000 });
pool.on("error", (e) => console.warn("  (pool) conexión idle cortada:", e.message));
const db = pool;
try {
  // 1. SEMANA 2
  const s2 = await val("SEMANA 2");
  const s2rows = s2.slice(1).filter((r) => /^\d{6,9}$/.test((r[1] || "").trim()));
  const idsS2 = [], s2Carpeta = new Map(), s2Calif = new Map();
  for (const r of s2rows) {
    const id = (r[1] || "").trim();
    if (s2Carpeta.has(id)) continue;
    idsS2.push(id);
    s2Carpeta.set(id, (r[5] || "").trim());
    s2Calif.set(id, (r[2] || "").trim());
  }

  // 2. lista del chat
  const chatCalif = new Map();
  for (const l of readFileSync(LISTA_CHAT, "utf8").split("\n").map((x) => x.trim()).filter(Boolean)) {
    const m = l.match(/^(\d{6,9})\s+(.+)$/);
    if (m && !chatCalif.has(m[1])) chatCalif.set(m[1], m[2].trim());
  }

  // 3. MAESTRO_RM
  const mrm = await val("MAESTRO_RM");
  const hMrm = mrm[0];
  const mrmObj = new Map();
  for (const f of mrm.slice(1)) {
    const id = (f[hMrm.indexOf("ID_TRAMITE")] || "").trim();
    if (id && !mrmObj.has(id)) mrmObj.set(id, Object.fromEntries(hMrm.map((h, i) => [h, (f[i] ?? "").trim()])));
  }

  // 4. MAESTRO_CALIFICACION (fallback doc links + calificador)
  const mc = await val("MAESTRO_CALIFICACION");
  const hMc = mc[0];
  const mcObj = new Map();
  for (const f of mc.slice(1)) {
    const id = (f[hMc.indexOf("ID_TRAMITE")] || "").trim();
    if (id && !mcObj.has(id)) mcObj.set(id, Object.fromEntries(hMc.map((h, i) => [h, (f[i] ?? "").trim()])));
  }

  // 5. TRAZABILIDAD_ASIGNACIONES (fallback calificador)
  const tz = await val("TRAZABILIDAD_ASIGNACIONES");
  const hTz = tz[0];
  const tzCalif = new Map();
  for (const f of tz.slice(1)) {
    const id = (f[hTz.indexOf("ID_TRAMITE")] || "").trim();
    if (!id) continue;
    const c = (f[hTz.indexOf("ASIGNADO_DESPUES")] || f[hTz.indexOf("CALIFICADOR_OBJETIVO")] || "").trim();
    if (c && c !== "Ninguno") tzCalif.set(id, c);
  }

  // 6. usuarios calificadores en la BD
  const correos = [...new Set(Object.values(NOMBRE_A_CORREO))];
  const { rows: cals } = await db.query("SELECT id, correo, nombre||' '||apellido AS nom FROM usuarios WHERE correo = ANY($1)", [correos]);
  const correoAId = new Map(cals.map((c) => [c.correo, c.id]));
  const faltan = correos.filter((c) => !correoAId.has(c));
  if (faltan.length) throw new Error(`Correos del mapa que NO están en la BD: ${faltan.join(", ")}`);
  const { rows: todosCals } = await db.query("SELECT u.id, u.correo, u.nombre||' '||u.apellido AS nom FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE r.nombre='CALIFICADOR'");
  const nomNormAId = new Map(todosCals.map((c) => [norm(c.nom), c.id]));

  const { rows: est } = await db.query("SELECT id FROM estados_caso WHERE nombre='BORRADOR'");
  const borradorId = est[0].id;

  function resolverCalificador(id) {
    const nombre = chatCalif.get(id) || s2Calif.get(id) || tzCalif.get(id) || (mcObj.get(id)?.CALIFICADOR) || "";
    if (!nombre) return { nombre: null, userId: null, motivo: "sin nombre en ninguna hoja" };
    const correo = NOMBRE_A_CORREO[nombre] || MAPA_NORM.get(norm(nombre));
    if (correo && correoAId.has(correo)) return { nombre, userId: correoAId.get(correo), correo };
    const porNombre = nomNormAId.get(norm(nombre));
    if (porNombre) return { nombre, userId: porNombre, correo: "(match por nombre en BD)" };
    return { nombre, userId: null, motivo: `nombre "${nombre}" no mapea a ningún usuario` };
  }

  // los que ya están en la BD se saltan ANTES de resolver (evita re-bajar 900+ JSON en un re-run)
  const { rows: yaBd } = await db.query("SELECT id_tramite FROM casos WHERE id_tramite = ANY($1)", [idsS2]);
  const yaBdSet = new Set(yaBd.map((r) => r.id_tramite));
  let objetivo = idsS2.filter((id) => !yaBdSet.has(id));
  if (LIMIT) objetivo = objetivo.slice(0, LIMIT);
  console.log(`SEMANA 2: ${idsS2.length} IDs · ya en la BD: ${yaBdSet.size} · a procesar: ${objetivo.length}${DRY ? "  [DRY]" : ""}\n`);

  // ── fase 1: resolver + bajar analysis.json (en paralelo, sin tocar la BD) ──
  const preparados = await mapPool(objetivo, CONCURRENCIA, async (id) => {
    const cal = resolverCalificador(id);
    if (!cal.userId) return { id, ok: false, motivo: `CALIFICADOR: ${cal.motivo}` };

    const mrmRow = mrmObj.get(id);
    const mcRow = mcObj.get(id);
    let j = null, fuenteJson = null, jsonUrl = null;
    try {
      if (mrmRow && mrmRow.LINK_ANALISIS_JSON) {
        j = await bajarJsonPorFileId(idDeLink(mrmRow.LINK_ANALISIS_JSON));
        fuenteJson = "MAESTRO_RM"; jsonUrl = mrmRow.LINK_ANALISIS_JSON;
      } else if (s2Carpeta.get(id)) {
        const r = await analysisDesdeCarpeta(s2Carpeta.get(id));
        if (r) { j = r.j; fuenteJson = "CARPETA_DRIVE"; jsonUrl = `https://drive.google.com/file/d/${r.fileId}/view`; }
      }
    } catch (e) {
      return { id, ok: false, motivo: `JSON: error al bajar (${e.message})`, calNombre: cal.nombre };
    }
    if (!j) return { id, ok: false, motivo: "JSON: no hay analysis.json (ni link en MAESTRO_RM ni carpeta en Drive)", calNombre: cal.nombre };
    if (!j.checklist_admisibilidad_rm) return { id, ok: false, motivo: "JSON: analysis.json sin checklist_admisibilidad_rm", calNombre: cal.nombre };

    // datos "fila" = MAESTRO_RM si existe, si no armado desde MAESTRO_CALIFICACION
    const datos = mrmRow ? { ...mrmRow } : {
      REGION_ID: mcRow?.REGION_ID || "RM",
      ID_TRAMITE: id,
      ID_ETAPA: mcRow?.ID_ETAPA || "",
      LINK_FICHA: mcRow?.LINK_CEROFILAS_TXT || "",
      LINK_CEDULA: mcRow?.LINK_CEDULA || "", LINK_IBF: mcRow?.LINK_IBF || "",
      LINK_ISRA: mcRow?.LINK_ISRA || "", LINK_IVADEC: mcRow?.LINK_IVADEC || "",
      LINK_COMPLEMENTARIO_1: mcRow?.LINK_COMPLEMENTARIO_1 || "",
      LINK_COMPLEMENTARIO_2: mcRow?.LINK_COMPLEMENTARIO_2 || "",
      LINK_COMPLEMENTARIO_3: mcRow?.LINK_COMPLEMENTARIO_3 || "",
    };
    datos.LINK_ANALISIS_JSON = jsonUrl;
    const col = (k) => (datos[k] != null ? String(datos[k]).trim() : "");

    const m = mapear(j, col);
    m.estado_caso_id = borradorId;
    m.calificador_asignado_id = cal.userId;
    const docs = [
      ["CEDULA", col("LINK_CEDULA")], ["IBF", col("LINK_IBF")], ["ISRA", col("LINK_ISRA")], ["IVADEC", col("LINK_IVADEC")],
      ["COMPLEMENTARIO", col("LINK_COMPLEMENTARIO_1")], ["COMPLEMENTARIO", col("LINK_COMPLEMENTARIO_2")], ["COMPLEMENTARIO", col("LINK_COMPLEMENTARIO_3")],
    ].filter(([, l]) => !!l);
    return { id, ok: true, m, docs, calNombre: cal.nombre, correo: cal.correo, fuenteJson, checklist: m.estado_checklist };
  });

  // ── fase 2: insertar (secuencial, transacción por caso) ──
  const insertados = [], yaExistian = [], fallidos = [];
  const porCal = {}, porFuente = {};
  let docsTotal = 0;

  for (const p of preparados) {
    if (!p.ok) { fallidos.push({ id: p.id, motivo: p.motivo }); continue; }
    porFuente[p.fuenteJson] = (porFuente[p.fuenteJson] || 0) + 1;

    if (DRY) {
      insertados.push({ id: p.id, calNombre: p.calNombre, fuenteJson: p.fuenteJson, checklist: p.checklist, docs: p.docs.length });
      porCal[p.calNombre] = (porCal[p.calNombre] || 0) + 1;
      docsTotal += p.docs.length;
      continue;
    }
    // transacción por caso, con reintento si el pooler cortó la conexión
    let hecho = false, ultimoErr = null;
    for (let intento = 0; intento < 3 && !hecho; intento++) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const cols = Object.keys(p.m);
        const vals = cols.map((c) => p.m[c]);
        const r = await client.query(
          `INSERT INTO casos (${cols.join(", ")}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(", ")}) ON CONFLICT (id_tramite) DO NOTHING RETURNING id`,
          vals,
        );
        if (r.rowCount === 0) { await client.query("ROLLBACK"); yaExistian.push(p.id); hecho = true; break; }
        const casoId = r.rows[0].id;
        await client.query("UPDATE casos SET fecha_asignacion = now() WHERE id = $1", [casoId]);
        for (const [tipo, link] of p.docs) {
          await client.query("INSERT INTO documentos_caso (caso_id, tipo, link_drive, descargado) VALUES ($1,$2,$3,true)", [casoId, tipo, link]);
          docsTotal++;
        }
        await client.query(
          `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
           VALUES ($1, NULL, NULL, $2, 'Alta lote SEMANA 2')`, [casoId, borradorId],
        );
        await client.query("COMMIT");
        insertados.push({ id: p.id, calNombre: p.calNombre });
        porCal[p.calNombre] = (porCal[p.calNombre] || 0) + 1;
        if (insertados.length % 25 === 0) console.log(`  ... ${insertados.length} insertados`);
        hecho = true;
      } catch (e) {
        ultimoErr = e;
        try { await client.query("ROLLBACK"); } catch {}
        const esConexion = /terminat|ECONNRESET|Connection|socket|ETIMEDOUT/i.test(e.message);
        if (esConexion && intento < 2) { console.warn(`  ↻ ${p.id}: conexión caída, reintento`); await new Promise((r) => setTimeout(r, 1500)); }
        else break;
      } finally {
        try { client.release(); } catch {}
      }
    }
    if (!hecho) fallidos.push({ id: p.id, motivo: `INSERT: ${ultimoErr?.message ?? "desconocido"}` });
  }

  // ── REPORTE ──
  console.log(`\n${"═".repeat(60)}`);
  console.log(`${DRY ? "[DRY] " : ""}Insertados: ${insertados.length}  ·  ya existían: ${yaExistian.length}  ·  fallidos: ${fallidos.length}  ·  documentos: ${docsTotal}`);
  console.log(`Fuente del analysis.json:`, porFuente);
  console.log("\nPor calificador:");
  console.table(Object.entries(porCal).sort().map(([k, v]) => ({ calificador: k, casos: v })));

  console.log(`\n${"─".repeat(60)}\nSÍ se insertaron (${insertados.length}):`);
  console.log(insertados.map((x) => x.id).join(", "));

  if (yaExistian.length) console.log(`\nYa estaban en la BD (${yaExistian.length}):\n${yaExistian.join(", ")}`);

  console.log(`\n${"─".repeat(60)}\nNO se pudieron insertar (${fallidos.length}):`);
  const porMotivo = {};
  for (const f of fallidos) { (porMotivo[f.motivo.split("(")[0].trim()] ??= []).push(f.id); }
  for (const [motivo, ids] of Object.entries(porMotivo)) console.log(`\n  ${motivo}  (${ids.length}):\n    ${ids.join(", ")}`);

  if (!DRY) {
    const { rows: tot } = await db.query("SELECT count(*)::int c FROM casos");
    console.log(`\nTotal casos en la BD ahora: ${tot[0].c}`);
  }
} finally {
  await db.end();
}
