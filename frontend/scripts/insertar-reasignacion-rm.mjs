// Segundo lote / reasignación: inserta en `casos` + `documentos_caso` + historial
// los IDs de MAESTRO_RM que YA tienen analysis.json, asignándolos a 3 calificadores.
//
//   node scripts/insertar-reasignacion-rm.mjs --dry   (muestra qué haría, no toca la BD)
//   node scripts/insertar-reasignacion-rm.mjs         (inserta de verdad)
//
// Idempotente: ON CONFLICT (id_tramite) DO NOTHING. Transacción por caso.
// Los IDs que aún no están en MAESTRO_RM o cuyo bot falló se SALTAN y se listan al final
// (no es tarea de este script procesarlos en el bot).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { google } from "googleapis";

const SPREADSHEET_ID = "13xzr6FICnBZH_pdX585n6fV51ZULR_Y5p7ot7HWvcN8";
const DRY = process.argv.includes("--dry");

// ── Reparto solicitado (la planilla de reasignación) ───────────────────────
const ASIGNACION = {
  "cecilia.uribe@grupoees.cl": [
    "33448789", "32732357", "33461392", "33471371", "33174701", "33463976",
    "33457585", "33434696", "33640189", "32494047", "33482683", "33468488",
  ],
  "pablo.campos@grupoees.cl": [
    "33469411", "33479142", "33058132", "33483472", "33474985", "33340496",
    "33477507", "33472101", "33486859", "33484093", "33491034", "33488187",
  ],
  "carolina.calificadora@grupoees.cl": [
    "33650972", "33217547", "33464897", "33461904", "33801410", "33785405",
    "33762047", "33468101", "33517496", "33594893", "33483519", "33483727",
    "33483852", "33484242",
  ],
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

  // Bloques nuevos del bot (Revisión 12): edad calculada, profesional IVADEC, estado funcional literal.
  const ec = j.edad_calculada ?? {};
  const pi = j.profesional_ivadec ?? {};
  const ibfDuro = j.fuentes_duras_calificacion?.ibf ?? {};
  const noConsta = (v) => (!v || /^no consta/i.test(String(v)) ? null : String(v));
  const esMenor = ec.anios != null ? ec.anios < 18 : edad !== null ? edad < 18 : false;

  return {
    region: s(col(fila, "REGION_ID")) ?? "RM",
    id_tramite: s(col(fila, "ID_TRAMITE")) ?? s(meta.id_tramite),
    id_etapa: s(col(fila, "ID_ETAPA")),
    rut: s(col(fila, "RUT")) ?? s(j.fuentes_duras_admisibilidad?.cedula?.rut_usuario),
    nombre_completo: s(col(fila, "NOMBRE_COMPLETO")) ?? s(meta.nombre_completo_usuario),
    // Prioridad: fecha de nacimiento canónica de edad_calculada (ISO); si no, la de la ficha.
    fecha_nacimiento: noConsta(ec.fecha_nacimiento_usada) ?? fechaISO(ident.fecha_nacimiento),
    es_menor_de_edad: esMenor,

    // edad_calculada
    edad_calc_texto: noConsta(ec.texto),
    edad_calc_total_meses: typeof ec.total_meses === "number" ? ec.total_meses : null,
    edad_calc_fecha_referencia: noConsta(ec.fecha_referencia),
    edad_calc_fuente_fecha_nac: noConsta(ec.fuente_fecha_nacimiento),
    edad_calc_advertencia: noConsta(ec.advertencia),

    // profesional_ivadec
    ivadec_prof_nombre: noConsta(pi.nombre_completo),
    ivadec_prof_run: noConsta(pi.run),
    ivadec_prof_run_dv_valido: typeof pi.run_dv_valido === "boolean" ? pi.run_dv_valido : null,
    ivadec_prof_profesion: noConsta(pi.profesion),
    ivadec_prof_advertencia: noConsta(pi.advertencia),

    // fuentes_duras_calificacion.ibf.descripcion_estado_funcional_ibf (transcripción literal)
    ibf_descripcion_estado_funcional_literal: noConsta(ibfDuro.descripcion_estado_funcional_ibf),
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

  let insertados = 0, saltados = 0, docsTotal = 0;
  const noEnSheet = [], sinJson = [];
  const porCal = {};

  for (const id of TODOS_IDS) {
    const correo = ID_A_CORREO.get(id);
    const fila = porId.get(id);
    if (!fila) { noEnSheet.push(id); continue; }
    if (!col(fila, "LINK_ANALISIS_JSON")) { sinJson.push(`${id} (${col(fila, "LAST_ERROR_CODE") || col(fila, "ESTADO_IA") || "sin JSON"})`); continue; }

    try {
      const j = await bajarJson(col(fila, "LINK_ANALISIS_JSON"));
      if (!j || !j.checklist_admisibilidad_rm) {
        sinJson.push(`${id} (analysis.json sin checklist)`);
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
         ON CONFLICT (id_tramite) DO NOTHING RETURNING id`,
        valores
      );
      if (r.rowCount === 0) {
        await cliente.query("ROLLBACK");
        console.log(`↷ ${id}: ya existía, saltado`);
        saltados++;
        continue;
      }
      const casoId = r.rows[0].id;

      await cliente.query("UPDATE casos SET fecha_asignacion = now() WHERE id = $1", [casoId]);

      for (const [tipo, link] of docs) {
        await cliente.query(
          "INSERT INTO documentos_caso (caso_id, tipo, link_drive, descargado) VALUES ($1,$2,$3,true)",
          [casoId, tipo, link]
        );
        docsTotal++;
      }

      await cliente.query(
        `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
         VALUES ($1, NULL, NULL, $2, 'Alta desde MAESTRO_RM + reasignación 2do lote')`,
        [casoId, borradorId]
      );

      await cliente.query("COMMIT");
      insertados++;
      porCal[correo] = (porCal[correo] ?? 0) + 1;
      console.log(`✓ ${id} → ${correo} | ${m.estado_checklist} | ${docs.length} docs`);
    } catch (e) {
      try { await cliente.query("ROLLBACK"); } catch {}
      console.error(`❌ ${id}: ${e.message}`);
    }
  }

  console.log(`\n${DRY ? "[DRY] " : ""}Insertados: ${insertados} | Saltados (ya existían): ${saltados} | Documentos: ${docsTotal}`);
  console.log("Por calificador:", porCal);
  if (sinJson.length) console.log(`\n⏭  Con fila en MAESTRO_RM pero SIN analysis.json (bot falló, no se insertan): ${sinJson.length}\n   ${sinJson.join("\n   ")}`);
  if (noEnSheet.length) console.log(`\n⏭  Todavía NO están en MAESTRO_RM (no se insertan): ${noEnSheet.length}\n   ${noEnSheet.join(", ")}`);

  if (!DRY) {
    const chk = await cliente.query(
      `SELECT COALESCE(estado_checklist::text,'(null)') AS estado_checklist, count(*)::int
       FROM casos GROUP BY estado_checklist ORDER BY estado_checklist`
    );
    console.log("\ncasos por estado_checklist (total en BD):");
    console.table(chk.rows);
  }
} finally {
  await cliente.end();
}
