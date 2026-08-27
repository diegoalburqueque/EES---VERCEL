// Inserta un lote puntual de casos de MAESTRO_RM en `casos` + `documentos_caso`,
// bajando el analysis.json REAL de Drive por caso, y asignándolos a calificadores.
//
//   node scripts/insertar-ids-rm.mjs           (inserta de verdad)
//   node scripts/insertar-ids-rm.mjs --dry     (solo muestra qué haría, no toca la BD)
//
// Idempotente: ON CONFLICT (id_tramite) DO NOTHING. Transacción por caso.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { google } from "googleapis";

const SPREADSHEET_ID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const DRY = process.argv.includes("--dry");

// ── Reparto: 6 casos por calificador ────────────────────────────────────────
const ASIGNACION = {
  "carolina.calificadora@grupoees.cl": ["32669141", "33444284", "32773812", "33454915", "33433197", "33436393"],
  "pablo.campos@grupoees.cl":          ["33469184", "33474882", "33470259", "33479973", "32971229", "33463767"],
  "cecilia.uribe@grupoees.cl":         ["32697746", "33047848", "32922083", "33320122", "33464530", "33471800"],
};
const ID_A_CORREO = new Map();
for (const [correo, ids] of Object.entries(ASIGNACION)) for (const id of ids) ID_A_CORREO.set(id, correo);
const TODOS_IDS = [...ID_A_CORREO.keys()];

// ── Conexión ───────────────────────────────────────────────────────────────
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const conn = env.split("\n").find((l) => l.startsWith("DATABASE_URL")).split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// ── Helpers ────────────────────────────────────────────────────────────────
const s = (v) => (v === undefined || v === null || v === "" ? null : String(v));
const REP_PRESENTE_OK = new Set(["SI", "NO", "NO_APLICA", "NO_VERIFICABLE"]);
const CHK_ITEM_OK = new Set(["CUMPLE", "NO_CUMPLE", "NO_VERIFICABLE"]);
const CHK_GENERAL_OK = new Set(["APTO", "REQUIERE_REVISION", "NO_APTO"]);

function pct(v) {
  if (!v) return null;
  const m = String(v).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}
function entero(v) {
  if (!v) return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
function fechaISO(v) {
  // "25-12-2011" (DD-MM-YYYY) -> "2011-12-25"; devuelve null si no parsea
  if (!v) return null;
  const m = String(v).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function fileIdDeLink(link) {
  if (!link) return null;
  const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
async function bajarJson(link) {
  const id = fileIdDeLink(link);
  if (!id) return null;
  const r = await drive.files.get({ fileId: id, alt: "media" }, { responseType: "text" });
  const txt = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
  return JSON.parse(txt);
}

// ── Mapea analysis.json + fila de MAESTRO_RM -> columnas de `casos` ─────────
function mapear(j, fila, col) {
  const ident = j.datos_identificacion ?? {};
  const calif = j.datos_calificacion ?? {};
  const valid = j.validacion_ivadec_cif ?? {};
  const prop = j.propuesta_calificacion_fundada ?? {};
  const cli = j.propuesta_formato_cliente ?? {};
  const soc = cli.antecedentes_sociales ?? {};
  const ibf = cli.datos_relevantes_calificacion ?? {};
  const comp = cli.informes_examenes_complementarios ?? {};
  const iv = cli.ivadec ?? {};
  const pc = cli.propuesta ?? {};
  const chk = j.checklist_admisibilidad_rm ?? {};
  const fd = j.fechas_documentos ?? {};
  const cf = j.carga_cerofilas ?? {};
  const meta = j.metadata_informe ?? {};
  const vid = j.verificacion_identidad ?? {};

  const estadoChecklist = CHK_GENERAL_OK.has(chk.resultado_general) ? chk.resultado_general : null;
  const repPresente = REP_PRESENTE_OK.has((chk.representante_presente || "").toUpperCase())
    ? chk.representante_presente.toUpperCase() : "NO_APLICA";
  const edad = entero(ident.edad);
  const chkItem = (o) => (CHK_ITEM_OK.has((o?.resultado || "").toUpperCase()) ? o.resultado.toUpperCase() : null);

  return {
    region: s(col(fila, "REGION_ID")) ?? "RM",
    id_tramite: s(col(fila, "ID_TRAMITE")) ?? s(meta.id_tramite),
    id_etapa: s(col(fila, "ID_ETAPA")),
    rut: s(col(fila, "RUT")) ?? s(j.fuentes_duras_admisibilidad?.cedula?.rut_usuario),
    nombre_completo: s(col(fila, "NOMBRE_COMPLETO")) ?? s(meta.nombre_completo_usuario),
    fecha_nacimiento: fechaISO(ident.fecha_nacimiento),
    es_menor_de_edad: edad !== null ? edad < 18 : false,
    requiere_representante: chk.requiere_representante === true,
    representante_presente: repPresente,
    estado_checklist: estadoChecklist,
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
    word_url: s(col(fila, "LINK_FICHA")),
    json_resultado_url: s(col(fila, "LINK_ANALISIS_JSON")),

    tokens_entrada: entero(col(fila, "TOKENS_ENTRADA")),
    tokens_salida: entero(col(fila, "TOKENS_SALIDA")),
    costo_usd: pct(col(fila, "COSTO_USD")) === null ? null : parseFloat(String(col(fila, "COSTO_USD")).replace(",", ".")) || null,
    costo_clp: (() => { const n = parseFloat(String(col(fila, "COSTO_CLP") || "").replace(/[^\d.,-]/g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; })(),

    analysis_json: JSON.stringify(j),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
const cliente = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await cliente.connect();

try {
  const { rows: estados } = await cliente.query("SELECT id FROM estados_caso WHERE nombre='BORRADOR'");
  const borradorId = estados[0].id;

  const { rows: cals } = await cliente.query(
    "SELECT id, correo FROM usuarios WHERE correo = ANY($1)",
    [Object.keys(ASIGNACION)]
  );
  const correoAId = new Map(cals.map((c) => [c.correo, c.id]));
  for (const correo of Object.keys(ASIGNACION)) {
    if (!correoAId.has(correo)) throw new Error(`Falta el calificador ${correo} en la BD`);
  }

  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "MAESTRO_RM" });
  const filasSheet = res.data.values ?? [];
  const header = filasSheet[0];
  const col = (fila, nombre) => { const i = header.indexOf(nombre); return i === -1 ? "" : (fila[i] ?? "").trim(); };
  const porId = new Map();
  for (const f of filasSheet.slice(1)) {
    const id = (f[header.indexOf("ID_TRAMITE")] ?? "").trim();
    if (id) porId.set(id, f);
  }

  let insertados = 0, saltados = 0, fallidos = 0, docsTotal = 0;
  const porCal = {};

  for (const id of TODOS_IDS) {
    const correo = ID_A_CORREO.get(id);
    const fila = porId.get(id);
    if (!fila) { console.error(`❌ ${id}: no está en MAESTRO_RM`); fallidos++; continue; }

    try {
      const j = await bajarJson(col(fila, "LINK_ANALISIS_JSON"));
      if (!j || !j.checklist_admisibilidad_rm) {
        console.error(`❌ ${id}: analysis.json sin checklist_admisibilidad_rm`);
        fallidos++;
        continue;
      }
      const m = mapear(j, fila, col);
      m.estado_caso_id = borradorId;
      m.calificador_asignado_id = correoAId.get(correo);

      const docs = [
        ["CEDULA", col(fila, "LINK_CEDULA")],
        ["IBF", col(fila, "LINK_IBF")],
        ["ISRA", col(fila, "LINK_ISRA")],
        ["IVADEC", col(fila, "LINK_IVADEC")],
        ["COMPLEMENTARIO", col(fila, "LINK_COMPLEMENTARIO_1")],
        ["COMPLEMENTARIO", col(fila, "LINK_COMPLEMENTARIO_2")],
        ["COMPLEMENTARIO", col(fila, "LINK_COMPLEMENTARIO_3")],
      ].filter(([, l]) => !!l);

      if (DRY) {
        console.log(`· ${id} → ${correo} | checklist=${m.estado_checklist} | %IA=${m.porcentaje_propuesto_ia} | %IVADEC=${m.porcentaje_ivadec_documento} | docs=${docs.length}`);
        insertados++;
        porCal[correo] = (porCal[correo] ?? 0) + 1;
        continue;
      }

      await cliente.query("BEGIN");
      const columnas = Object.keys(m);
      const valores = columnas.map((c) => m[c]);
      const ph = valores.map((_, i) => `$${i + 1}`).join(", ");
      const r = await cliente.query(
        `INSERT INTO casos (${columnas.join(", ")}) VALUES (${ph})
         ON CONFLICT (id_tramite) DO NOTHING RETURNING id, calificador_asignado_id`,
        valores
      );
      if (r.rowCount === 0) {
        await cliente.query("ROLLBACK");
        console.log(`↷ ${id}: ya existía, saltado`);
        saltados++;
        continue;
      }
      const casoId = r.rows[0].id;

      // fecha_asignacion (el INSERT ya puso calificador_asignado_id)
      await cliente.query("UPDATE casos SET fecha_asignacion = now() WHERE id = $1", [casoId]);

      for (const [tipo, link] of docs) {
        await cliente.query(
          "INSERT INTO documentos_caso (caso_id, tipo, link_drive, descargado) VALUES ($1,$2,$3,true)",
          [casoId, tipo, link]
        );
        docsTotal++;
      }

      // Historial de creación (estado_anterior_id NULL = alta)
      await cliente.query(
        `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
         VALUES ($1, NULL, NULL, $2, 'Alta desde MAESTRO_RM + asignación')`,
        [casoId, borradorId]
      );

      await cliente.query("COMMIT");
      insertados++;
      porCal[correo] = (porCal[correo] ?? 0) + 1;
      console.log(`✓ ${id} → ${correo} | ${m.estado_checklist} | ${docs.length} docs`);
    } catch (e) {
      try { await cliente.query("ROLLBACK"); } catch {}
      console.error(`❌ ${id}: ${e.message}`);
      fallidos++;
    }
  }

  console.log(`\n${DRY ? "[DRY] " : ""}Insertados: ${insertados} | Saltados (duplicado): ${saltados} | Fallidos: ${fallidos} | Documentos: ${docsTotal}`);
  console.log("Por calificador:", porCal);

  if (!DRY) {
    const chk = await cliente.query(
      `SELECT COALESCE(estado_checklist::text,'(null)') AS estado_checklist, count(*)::int
       FROM casos GROUP BY estado_checklist ORDER BY estado_checklist`
    );
    console.log("\ncasos por estado_checklist:");
    console.table(chk.rows);
  }
} finally {
  await cliente.end();
}
