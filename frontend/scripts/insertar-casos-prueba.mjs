// Casos FICTICIOS para el calificador de prueba (RUT 11111111-1): sirven para ver la plataforma
// y la pantalla "copiar y pegar en el portal" sin tocar casos reales.
//
//   node scripts/insertar-casos-prueba.mjs --dry       muestra qué insertaría, NO escribe
//   node scripts/insertar-casos-prueba.mjs             inserta (idempotente: ON CONFLICT DO NOTHING)
//   node scripts/insertar-casos-prueba.mjs --borrar    elimina esos casos y todo lo que cuelga de ellos
//
// Marca: id_tramite 90000001..90000003 y nombres "PRUEBA ...". Ningún dato es de una persona real.
// Aviso: viven en la base de producción, así que el panel del ADMIN los cuenta como casos.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const DRY = process.argv.includes("--dry");
const BORRAR = process.argv.includes("--borrar");
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUT_CALIFICADOR = "11111111-1";
const IDS = ["90000001", "90000002", "90000003"];

const dv = (cuerpo) => {
  let suma = 0, f = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * f; f = f === 7 ? 2 : f + 1; }
  const r = 11 - (suma % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
};
const rutDe = (cuerpo) => `${cuerpo}-${dv(cuerpo)}`;

/** Arma un analysis.json completo (forma AnalisisQA) a partir de los datos del caso ficticio. */
function armar(c) {
  const nombreCompleto = `${c.nombre} ${c.apellidos}`;
  const origSecArray = c.secundarios === "Ninguno" ? [] : c.secundarios.split(", ");
  const obsCalif = `Informe biomédico funcional: ${c.ibfPor}\n\n- Diagnósticos:\n${c.diagnostico}\n\n- Información relevante:\n${c.resumenIbf}`;
  return {
    metadata_informe: { tipo_informe: "ficha_qa_calificacion", id_tramite: c.id, nombre_completo_usuario: nombreCompleto, estado_analisis: "COMPLETO", requiere_revision_humana: c.checklist === "REQUIERE_REVISION" },
    verificacion_identidad: { resultado: "COINCIDE", resumen: "Datos de identidad coherentes entre los documentos (caso ficticio).", diferencias_menores_toleradas: [] },
    datos_identificacion: { nombre: c.nombre, apellidos: c.apellidos, fecha_nacimiento: c.fnac, edad: c.edad, sexo: c.sexo, direccion_notificacion: c.direccion, comuna: c.comuna, zona_vivienda: "Urbana", institucion_calificadora: "Oficina de Discapacidad (ficticia)", red_apoyo: c.redApoyo },
    datos_calificacion: { diagnostico_principal: c.diagnostico, origen_principal_discapacidad: c.origen, diagnosticos_secundarios: c.diagSecundarios, origenes_secundarios: c.secundarios, porcentaje_discapacidad: `${c.porcentaje} %`, grado_discapacidad: c.grado, idis: c.idis, movilidad_reducida: c.mr, antecedentes_sociales_relevantes: c.antecedentes, observaciones_datos_relevantes_calificacion: obsCalif },
    validacion_ivadec_cif: { porcentaje_consta: true, porcentaje_existe_en_tabla: true, idis_tabla: c.idis, grado_tabla: c.grado, coincide_con_expediente: true, observacion_breve: "El porcentaje del IVADEC coincide con la tabla IVADEC-CIF." },
    observaciones_qa: [],
    nota_codigos_no_aplican: "No aplica.",
    propuesta_calificacion_fundada: { accion_sugerida: c.accion, porcentaje_propuesto: `${c.porcentaje} %`, grado_propuesto: c.grado, origen_principal_propuesto: c.origen, origenes_secundarios_propuestos: c.secundarios === "Ninguno" ? "Sin Orígenes Secundarios" : c.secundarios, movilidad_reducida_propuesta: c.mr, reevaluacion_propuesta: c.reev, fundamento_breve: c.fundamento },
    propuesta_formato_cliente: {
      antecedentes_sociales: { isra_completado_por: c.israPor, nivel_educativo: c.educacion, trabajo_ocupacion: c.trabajo, situacion_familiar: c.familia, grado_limitacion: c.limitacion, situacion_especial: c.especial },
      datos_relevantes_calificacion: { ibf_completado_por: c.ibfPor, diagnosticos: c.diagnostico, resumen_informacion_relevante_ibf: c.resumenIbf, descripcion_estado_funcional: c.estadoFuncional, medicamentos: c.medicamentos, ayudas_tecnicas: c.ayudas },
      informes_examenes_complementarios: { items: c.complementarios, resumen_concordancia: c.complementarios.length ? "Los informes complementarios son concordantes con el IBF." : "Sin informes complementarios." },
      ivadec: { ivadec_calificador: "Evaluador ficticio (Kinesiólogo/a)", aplicado_a: nombreCompleto, porcentaje_obtenido: `${c.porcentaje} %`, origenes_considerados: c.origen },
      observaciones_ivadec: ["Observación de ejemplo 1 del IVADEC (ficticia).", "Observación de ejemplo 2 del IVADEC (ficticia)."],
      propuesta: { texto_sugerencia: c.fundamento, movilidad_reducida: c.mr, reevaluacion: c.reev, glosa_tipo: "NINGUNA", glosa_texto: c.glosa },
    },
    fechas_documentos: { cedula: "01-03-2026", ibf: "10-06-2026", isra: "12-06-2026", ivadec_cif: "24-06-2026", propuesta_ece: "No aplica", complementarios: c.complementarios.length ? "02-08-2025" : "No aplica" },
    checklist_admisibilidad_rm: {
      cedula: { resultado: "CUMPLE", observacion: "Cédula vigente y legible." },
      ibf: c.ibfChk,
      isra: c.israChk,
      ivadec: { resultado: "CUMPLE", observacion: "IVADEC vigente, con evaluador idóneo." },
      requiere_representante: c.menor,
      representante_presente: c.menor ? "SI" : "NO_APLICA",
      resultado_general: c.checklist,
    },
    carga_cerofilas: { zona_vivienda: "Urbana", institucion_calificadora: "Oficina de Discapacidad (ficticia)", nombre_institucion: "Oficina de Discapacidad (ficticia)", diagnostico_principal: c.diagnostico, origen_principal_discapacidad: c.origen, diagnosticos_secundarios: c.diagSecundarios, origenes_secundarios: origSecArray, porcentaje_de_discapacidad: `${c.porcentaje} %`, movilidad_reducida: c.mr, antecedentes_sociales_relevantes: c.antecedentes, observaciones_calificacion: obsCalif, apto_para_revision: c.checklist !== "NO_APTO", alertas_carga: [] },
    nombre_archivo_sugerido: `PRUEBA_${c.id}`,
  };
}

const casos = [
  {
    id: IDS[0], rutCuerpo: "11000001", nombre: "PRUEBA Uno", apellidos: "Ficticio Alfa", fnac: "20-06-2016", edad: "10 años", sexo: "Femenino", menor: true,
    direccion: "Calle Imaginaria 123, depto. 4", comuna: "Comuna de Prueba", redApoyo: "Madre y abuela (ficticias)",
    diagnostico: "F84.0 Trastorno del espectro autista (ejemplo)", diagSecundarios: "No consta en el expediente", origen: "Mental Psíquico", secundarios: "Ninguno",
    porcentaje: "32.1", grado: "MODERADO", idis: "1.5", mr: "No", reev: "NO_DETERMINADO", accion: "MANTENER",
    fundamento: "El porcentaje del IVADEC es coherente con el cuadro descrito en el IBF (ejemplo).", glosa: "No aplica",
    ibfPor: "Psicólogo/a ficticio/a", israPor: "Asistente social ficticio/a", educacion: "Educación básica en curso", trabajo: "No aplica (menor de edad)",
    familia: "Vive con madre y abuela en vivienda arrendada.", limitacion: "Requiere apoyo permanente en actividades escolares y de autocuidado.", especial: "Sin situaciones especiales declaradas.",
    resumenIbf: "Cuadro estable, con apoyo escolar y terapia ocupacional semanal (texto de ejemplo).", estadoFuncional: "Necesita supervisión para actividades cotidianas.",
    medicamentos: "No consume medicamentos.", ayudas: "No utiliza ayudas técnicas.", complementarios: [], checklist: "APTO",
    ibfChk: { resultado: "CUMPLE", observacion: "IBF vigente, firmado por profesional idóneo." }, israChk: { resultado: "CUMPLE", observacion: "ISRA completo y vigente." },
  },
  {
    id: IDS[1], rutCuerpo: "11000002", nombre: "PRUEBA Dos", apellidos: "Ficticio Beta", fnac: "05-03-1979", edad: "47 años", sexo: "Masculino", menor: false,
    direccion: "Avenida Falsa 4567", comuna: "Comuna de Prueba", redApoyo: "Cónyuge e hijos (ficticios)",
    diagnostico: "M54.5 Dolor lumbar crónico (ejemplo)", diagSecundarios: "I10 Hipertensión arterial (ejemplo)", origen: "Físico", secundarios: "Mental Psíquico",
    porcentaje: "50", grado: "SEVERO", idis: "2.0", mr: "Sí", reev: "5 AÑOS", accion: "AJUSTAR",
    fundamento: "Se sugiere ajustar el porcentaje por limitación de la marcha documentada en el IBF (ejemplo).", glosa: "Se solicita reevaluación en 5 años (ejemplo).",
    ibfPor: "Médico/a ficticio/a", israPor: "Asistente social ficticio/a", educacion: "Media completa", trabajo: "Cesante hace 2 años",
    familia: "Vive con cónyuge y dos hijos.", limitacion: "Dificultad para trasladarse y mantener bipedestación prolongada.", especial: "Sin situaciones especiales declaradas.",
    resumenIbf: "Dolor crónico con limitación de la marcha; seguimiento en policlínico (texto de ejemplo).", estadoFuncional: "Camina con bastón; requiere ayuda para subir escaleras.",
    medicamentos: "Analgésicos y antihipertensivo (ejemplo).", ayudas: "Bastón.",
    complementarios: [{ documento: "Resonancia lumbar (ejemplo)", fecha: "02/08/2025", hallazgo: "Hallazgos degenerativos (texto de ejemplo).", relacion_ibf: "Concordante" }],
    checklist: "REQUIERE_REVISION",
    ibfChk: { resultado: "NO_VERIFICABLE", observacion: "No se puede verificar la firma del profesional en el IBF (caso de ejemplo para la pestaña Falta Información)." },
    israChk: { resultado: "CUMPLE", observacion: "ISRA completo y vigente." },
  },
  {
    id: IDS[2], rutCuerpo: "11000003", nombre: "PRUEBA Tres", apellidos: "Ficticio Gamma", fnac: "11-09-2011", edad: "15 años", sexo: "Masculino", menor: true,
    direccion: "Pasaje Inexistente 89", comuna: "Comuna de Prueba", redApoyo: "Padre y hermana (ficticios)",
    diagnostico: "H90.3 Hipoacusia neurosensorial bilateral (ejemplo)", diagSecundarios: "No consta en el expediente", origen: "Sensorial Auditivo", secundarios: "Ninguno",
    porcentaje: "21", grado: "LEVE", idis: "1.1", mr: "No", reev: "NO", accion: "MANTENER",
    fundamento: "El porcentaje corresponde al grado leve descrito en el IVADEC (ejemplo).", glosa: "No aplica",
    ibfPor: "Fonoaudiólogo/a ficticio/a", israPor: "Asistente social ficticio/a", educacion: "Educación media en curso", trabajo: "No aplica (menor de edad)",
    familia: "Vive con padre y hermana.", limitacion: "Dificultad para comprender conversaciones en ambientes ruidosos.", especial: "Sin situaciones especiales declaradas.",
    resumenIbf: "Hipoacusia estable con uso de audífonos (texto de ejemplo).", estadoFuncional: "Se comunica con apoyo de audífonos.",
    medicamentos: "No consume medicamentos.", ayudas: "Audífonos bilaterales.", complementarios: [], checklist: "APTO",
    ibfChk: { resultado: "CUMPLE", observacion: "IBF vigente, firmado por profesional idóneo." }, israChk: { resultado: "CUMPLE", observacion: "ISRA completo y vigente." },
  },
];

// Mismo mapeo JSON → columnas que usa insertar-992-rm.mjs (recortado a lo que traen estos casos).
const s = (v) => (v === undefined || v === null || v === "" ? null : String(v));
const pct = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const fechaISO = (v) => { const m = String(v ?? "").match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null; };
function mapear(j, c) {
  const ident = j.datos_identificacion, calif = j.datos_calificacion, valid = j.validacion_ivadec_cif;
  const prop = j.propuesta_calificacion_fundada, cli = j.propuesta_formato_cliente;
  const soc = cli.antecedentes_sociales, ibf = cli.datos_relevantes_calificacion, comp = cli.informes_examenes_complementarios;
  const iv = cli.ivadec, pc = cli.propuesta, chk = j.checklist_admisibilidad_rm, fd = j.fechas_documentos, cf = j.carga_cerofilas;
  return {
    region: "RM", id_tramite: c.id, rut: rutDe(c.rutCuerpo), nombre_completo: j.metadata_informe.nombre_completo_usuario,
    fecha_nacimiento: fechaISO(ident.fecha_nacimiento), es_menor_de_edad: c.menor,
    requiere_representante: chk.requiere_representante, representante_presente: chk.representante_presente,
    estado_checklist: chk.resultado_general, tiene_error_bot: false,
    meta_tipo_informe: j.metadata_informe.tipo_informe, meta_estado_analisis: j.metadata_informe.estado_analisis, meta_requiere_revision_humana: j.metadata_informe.requiere_revision_humana,
    identidad_resultado: j.verificacion_identidad.resultado, identidad_resumen: j.verificacion_identidad.resumen,
    ident_nombre: ident.nombre, ident_apellidos: ident.apellidos, ident_fecha_nacimiento_texto: ident.fecha_nacimiento, ident_edad_texto: ident.edad, ident_sexo: ident.sexo,
    ident_direccion_notificacion: ident.direccion_notificacion, ident_comuna: ident.comuna, ident_zona_vivienda: ident.zona_vivienda, ident_institucion_calificadora: ident.institucion_calificadora, ident_red_apoyo: ident.red_apoyo,
    calif_diagnostico_principal: calif.diagnostico_principal, calif_origen_principal_discapacidad: calif.origen_principal_discapacidad, calif_diagnosticos_secundarios: calif.diagnosticos_secundarios,
    calif_origenes_secundarios: calif.origenes_secundarios, calif_porcentaje_discapacidad_texto: calif.porcentaje_discapacidad, calif_grado_discapacidad: calif.grado_discapacidad, calif_idis: calif.idis,
    calif_movilidad_reducida_texto: calif.movilidad_reducida, calif_antecedentes_sociales_relevantes: calif.antecedentes_sociales_relevantes, calif_observaciones_datos_relevantes: calif.observaciones_datos_relevantes_calificacion,
    valid_porcentaje_consta: valid.porcentaje_consta, valid_porcentaje_existe_en_tabla: valid.porcentaje_existe_en_tabla, valid_idis_tabla: valid.idis_tabla, valid_grado_tabla: valid.grado_tabla,
    valid_coincide_con_expediente: valid.coincide_con_expediente, valid_observacion_breve: valid.observacion_breve,
    qa_observaciones: JSON.stringify(j.observaciones_qa), qa_nota_codigos_no_aplican: j.nota_codigos_no_aplican,
    prop_accion_sugerida: prop.accion_sugerida, prop_porcentaje_propuesto_texto: prop.porcentaje_propuesto, prop_grado_propuesto: prop.grado_propuesto,
    prop_origen_principal_propuesto: prop.origen_principal_propuesto, prop_origenes_secundarios_propuestos: prop.origenes_secundarios_propuestos,
    prop_movilidad_reducida_propuesta: prop.movilidad_reducida_propuesta, prop_reevaluacion_propuesta: prop.reevaluacion_propuesta, prop_fundamento_breve: prop.fundamento_breve,
    porcentaje_propuesto_ia: pct(prop.porcentaje_propuesto),
    cliente_isra_completado_por: soc.isra_completado_por, cliente_nivel_educativo: soc.nivel_educativo, cliente_trabajo_ocupacion: soc.trabajo_ocupacion,
    cliente_situacion_familiar: soc.situacion_familiar, cliente_grado_limitacion: soc.grado_limitacion, cliente_situacion_especial: soc.situacion_especial,
    cliente_ibf_completado_por: ibf.ibf_completado_por, cliente_diagnosticos: ibf.diagnosticos, cliente_resumen_ibf: ibf.resumen_informacion_relevante_ibf,
    cliente_descripcion_estado_funcional: ibf.descripcion_estado_funcional, cliente_medicamentos: ibf.medicamentos, cliente_ayudas_tecnicas: ibf.ayudas_tecnicas,
    cliente_informes_complementarios: JSON.stringify(comp.items), cliente_resumen_concordancia: comp.resumen_concordancia,
    cliente_ivadec_calificador: iv.ivadec_calificador, cliente_ivadec_aplicado_a: iv.aplicado_a, cliente_ivadec_porcentaje_obtenido_texto: iv.porcentaje_obtenido,
    cliente_ivadec_origenes_considerados: iv.origenes_considerados, porcentaje_ivadec_documento: pct(iv.porcentaje_obtenido),
    cliente_observaciones_ivadec: cli.observaciones_ivadec,
    cliente_propuesta_texto_sugerencia: pc.texto_sugerencia, cliente_propuesta_movilidad_reducida: pc.movilidad_reducida, cliente_propuesta_reevaluacion: pc.reevaluacion,
    cliente_propuesta_glosa_tipo: pc.glosa_tipo, cliente_propuesta_glosa_texto: pc.glosa_texto,
    fecha_doc_cedula: fd.cedula, fecha_doc_ibf: fd.ibf, fecha_doc_isra: fd.isra, fecha_doc_ivadec_cif: fd.ivadec_cif, fecha_doc_propuesta_ece: fd.propuesta_ece, fecha_doc_complementarios: fd.complementarios,
    checklist_cedula_resultado: chk.cedula.resultado, checklist_cedula_observacion: chk.cedula.observacion, checklist_ibf_resultado: chk.ibf.resultado, checklist_ibf_observacion: chk.ibf.observacion,
    checklist_isra_resultado: chk.isra.resultado, checklist_isra_observacion: chk.isra.observacion, checklist_ivadec_resultado: chk.ivadec.resultado, checklist_ivadec_observacion: chk.ivadec.observacion,
    cerofilas_zona_vivienda: cf.zona_vivienda, cerofilas_institucion_calificadora: cf.institucion_calificadora, cerofilas_nombre_institucion: cf.nombre_institucion,
    cerofilas_diagnostico_principal: cf.diagnostico_principal, cerofilas_origen_principal_discapacidad: cf.origen_principal_discapacidad, cerofilas_diagnosticos_secundarios: cf.diagnosticos_secundarios,
    cerofilas_origenes_secundarios: cf.origenes_secundarios, cerofilas_porcentaje_discapacidad_texto: cf.porcentaje_de_discapacidad, cerofilas_movilidad_reducida: cf.movilidad_reducida,
    cerofilas_antecedentes_sociales_relevantes: cf.antecedentes_sociales_relevantes, cerofilas_observaciones_calificacion: cf.observaciones_calificacion,
    cerofilas_apto_para_revision: cf.apto_para_revision, cerofilas_alertas_carga: cf.alertas_carga,
    word_nombre_archivo_sugerido: j.nombre_archivo_sugerido,
    analysis_json: JSON.stringify(j),
  };
}

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
const pool = new pg.Pool({ connectionString: env, ssl: { rejectUnauthorized: false }, max: 1 });
const cli = await pool.connect();

try {
  const { rows: usr } = await cli.query(
    `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.rut = $1 AND r.nombre = 'CALIFICADOR'`, [RUT_CALIFICADOR]);
  if (!usr.length) throw new Error(`No existe el calificador de prueba ${RUT_CALIFICADOR}.`);
  const calificadorId = usr[0].id;

  if (BORRAR) {
    await cli.query("BEGIN");
    const { rows } = await cli.query("SELECT id FROM casos WHERE id_tramite = ANY($1)", [IDS]);
    const ids = rows.map((r) => r.id);
    const { rows: tablas } = await cli.query(
      "SELECT table_name FROM information_schema.columns WHERE column_name = 'caso_id' AND table_schema = 'public'");
    for (const { table_name } of tablas) {
      const r = await cli.query(`DELETE FROM ${table_name} WHERE caso_id = ANY($1)`, [ids]);
      if (r.rowCount) console.log(`  ${table_name}: ${r.rowCount} filas`);
    }
    const r = await cli.query("DELETE FROM casos WHERE id = ANY($1)", [ids]);
    await cli.query("COMMIT");
    console.log(`Eliminados ${r.rowCount} casos de prueba.`);
  } else {
    const { rows: est } = await cli.query("SELECT id FROM estados_caso WHERE nombre = 'BORRADOR'");
    const borradorId = est[0].id;
    let nuevos = 0;
    for (const c of casos) {
      const j = armar(c);
      const m = mapear(j, c);
      m.estado_caso_id = borradorId;
      m.calificador_asignado_id = calificadorId;
      console.log(`${c.id} · ${m.nombre_completo} · ${m.estado_checklist} · ${j.datos_calificacion.porcentaje_discapacidad}`);
      if (DRY) continue;
      await cli.query("BEGIN");
      const cols = Object.keys(m);
      const r = await cli.query(
        `INSERT INTO casos (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) ON CONFLICT (id_tramite) DO NOTHING RETURNING id`,
        cols.map((k) => m[k]));
      if (!r.rowCount) { await cli.query("ROLLBACK"); console.log("   ya existía, se omite"); continue; }
      const casoId = r.rows[0].id;
      await cli.query("UPDATE casos SET fecha_asignacion = now() WHERE id = $1", [casoId]);
      const docs = [["CEDULA", "cedula"], ["IBF", "ibf"], ["ISRA", "isra"], ["IVADEC", "ivadec"], ...(c.complementarios.length ? [["COMPLEMENTARIO", "complementario"]] : [])];
      for (const [tipo, nombre] of docs) {
        await cli.query("INSERT INTO documentos_caso (caso_id, tipo, link_drive, descargado) VALUES ($1,$2,$3,true)",
          [casoId, tipo, `https://example.invalid/prueba/${c.id}/${nombre}.pdf`]);
      }
      await cli.query(
        `INSERT INTO historial_estados_caso (caso_id, usuario_id, estado_anterior_id, estado_nuevo_id, motivo)
         VALUES ($1, NULL, NULL, $2, 'Caso FICTICIO de prueba (scripts/insertar-casos-prueba.mjs)')`, [casoId, borradorId]);
      await cli.query("COMMIT");
      nuevos++;
    }
    console.log(DRY ? "\n--dry: no se escribió nada." : `\nInsertados ${nuevos} casos para el calificador ${RUT_CALIFICADOR}.`);
  }
} catch (e) {
  try { await cli.query("ROLLBACK"); } catch { /* sin transacción abierta */ }
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  cli.release();
  await pool.end();
}
