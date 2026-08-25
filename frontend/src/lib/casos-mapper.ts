import "server-only";
import type { Caso, ChecklistItem, Decision, Direccion, ReevaluacionFinal } from "@/data/casos";
import type { AnalisisQA } from "@/data/analisis";
import { aFechaISO } from "@/lib/fechas";
import { resolverComparativaIdis } from "@/lib/comparativa-idis";

export interface FilaCaso {
  id: string;
  id_tramite: string;
  region: Caso["region"];
  rut: string;
  nombre_completo: string;
  analysis_json: AnalisisQA | null;
  estado_checklist: Caso["estadoChecklist"];
  estado_caso: string;
  calificador_asignado_id: string | null;
  calificador_nombre: string | null;
  // `pg` devuelve los timestamptz como Date, no como string.
  fecha_asignacion: Date | string | null;
  no_apto_mensaje: string | null;
  json_resultado_url: string | null;
  requiere_representante: boolean | null;
  representante_presente: string | null;
  ident_edad_texto: string | null;
  ident_sexo: string | null;
  ident_direccion_notificacion: string | null;
  ident_comuna: string | null;
  ident_zona_vivienda: string | null;
  calif_diagnostico_principal: string | null;
  calif_origen_principal_discapacidad: string | null;
  calif_diagnosticos_secundarios: string | null;
  calif_origenes_secundarios: string | null;
  calif_porcentaje_discapacidad_texto: string | null;
  porcentaje_propuesto_ia: string | null;
  prop_accion_sugerida: string | null;
  prop_grado_propuesto: string | null;
  prop_origen_principal_propuesto: string | null;
  prop_movilidad_reducida_propuesta: string | null;
  prop_fundamento_breve: string | null;
  cerofilas_zona_vivienda: string | null;
  cerofilas_institucion_calificadora: string | null;
  cerofilas_nombre_institucion: string | null;
  cerofilas_diagnostico_principal: string | null;
  cerofilas_origen_principal_discapacidad: string | null;
  cerofilas_diagnosticos_secundarios: string | null;
  cerofilas_porcentaje_discapacidad_texto: string | null;
  cerofilas_movilidad_reducida: string | null;
  cerofilas_antecedentes_sociales_relevantes: string | null;
  cerofilas_observaciones_calificacion: string | null;
  checklist_cedula_resultado: string | null;
  checklist_cedula_observacion: string | null;
  checklist_ibf_resultado: string | null;
  checklist_ibf_observacion: string | null;
  checklist_isra_resultado: string | null;
  checklist_isra_observacion: string | null;
  checklist_ivadec_resultado: string | null;
  checklist_ivadec_observacion: string | null;
  cal_porcentaje_final: string | null;
  cal_modificado: boolean | null;
  cal_fecha: Date | string | null;

  // Comparación IVADEC vs Motor (tabla comparativa del panel "Propuesta del motor")
  porcentaje_ivadec_documento: string | null; // % que trae el documento IVADEC físico, distinto de porcentaje_propuesto_ia
  valid_idis_tabla: string | null;
  valid_grado_tabla: string | null;
  calif_idis: string | null;
  calif_grado_discapacidad: string | null;

  // "Ya lo subí" — independiente de la resolución
  subido_cerofilas: boolean;
  subido_cerofilas_en: Date | string | null;

  // Resolución estructurada (calificaciones_finales, Revisión 10)
  cal_decision: Decision | null;
  cal_idis_final: string | null;
  cal_grado_final: string | null;
  cal_direccion: Direccion | null;
  cal_mr_final: boolean | null;
  cal_reev_final: ReevaluacionFinal | null;
  cal_motivo_codigo: string | null;
  cal_causa_codigo: string | null;
  cal_explicacion: string | null;
}

/** Columnas que necesitan mapearFila / construirAnalisisSintetico. Compartidas entre el
 *  listado (/api/casos) y el detalle (/api/casos/[id]). */
export const SELECT_CASO = `
    c.id, c.id_tramite, c.region, c.rut, c.nombre_completo, c.analysis_json, c.estado_checklist,
    c.calificador_asignado_id, c.fecha_asignacion, c.no_apto_mensaje, c.json_resultado_url,
    c.requiere_representante, c.representante_presente,
    c.ident_edad_texto, c.ident_sexo, c.ident_direccion_notificacion, c.ident_comuna, c.ident_zona_vivienda,
    c.calif_diagnostico_principal, c.calif_origen_principal_discapacidad, c.calif_diagnosticos_secundarios,
    c.calif_origenes_secundarios, c.calif_porcentaje_discapacidad_texto,
    c.porcentaje_propuesto_ia, c.prop_accion_sugerida, c.prop_grado_propuesto,
    c.prop_origen_principal_propuesto, c.prop_movilidad_reducida_propuesta, c.prop_fundamento_breve,
    c.cerofilas_zona_vivienda, c.cerofilas_institucion_calificadora, c.cerofilas_nombre_institucion,
    c.cerofilas_diagnostico_principal, c.cerofilas_origen_principal_discapacidad,
    c.cerofilas_diagnosticos_secundarios, c.cerofilas_porcentaje_discapacidad_texto,
    c.cerofilas_movilidad_reducida, c.cerofilas_antecedentes_sociales_relevantes,
    c.cerofilas_observaciones_calificacion,
    c.checklist_cedula_resultado, c.checklist_cedula_observacion,
    c.checklist_ibf_resultado, c.checklist_ibf_observacion,
    c.checklist_isra_resultado, c.checklist_isra_observacion,
    c.checklist_ivadec_resultado, c.checklist_ivadec_observacion,
    (u.nombre || ' ' || u.apellido) AS calificador_nombre,
    ec.nombre AS estado_caso,
    cf.porcentaje_final AS cal_porcentaje_final,
    cf.modificado_por_calificador AS cal_modificado,
    cf.fecha_calificacion AS cal_fecha,

    c.porcentaje_ivadec_documento, c.valid_idis_tabla, c.valid_grado_tabla,
    c.calif_idis, c.calif_grado_discapacidad,
    c.subido_cerofilas, c.subido_cerofilas_en,

    cf.decision AS cal_decision,
    cf.idis_final AS cal_idis_final,
    cf.grado_final AS cal_grado_final,
    cf.direccion AS cal_direccion,
    cf.mr_final AS cal_mr_final,
    cf.reev_final AS cal_reev_final,
    cf.motivo_codigo AS cal_motivo_codigo,
    cf.causa_codigo AS cal_causa_codigo,
    cf.explicacion AS cal_explicacion
`;

export const SELECT_BASE = `
  SELECT ${SELECT_CASO}
  FROM casos c
  LEFT JOIN calificaciones_finales cf ON cf.caso_id = c.id
  LEFT JOIN usuarios u ON u.id = c.calificador_asignado_id
  JOIN estados_caso ec ON ec.id = c.estado_caso_id
`;

/**
 * Ficha sintética: se arma al vuelo con las columnas planas de `casos` cuando el caso NO
 * tiene el analysis.json real del bot (ej. los 500 casos poblados desde MAESTRO_RM, que solo
 * traen datos resumen, no el detalle IBF/ISRA/IVADEC por documento). No se guarda en la base
 * — es una transformación de la API, el `analysis_json` crudo del CSV sigue intacto para
 * trazabilidad. Los bloques para los que MAESTRO_RM no trae detalle (identidad completa,
 * validación IVADEC-CIF, antecedentes/IBF/IVADEC por documento, fechas) quedan vacíos: el
 * calificador los ve en blanco en vez de con datos inventados.
 */
export function construirAnalisisSintetico(fila: FilaCaso): AnalisisQA {
  const itemChecklist = (resultado: string | null, observacion: string | null) => ({
    resultado: resultado ?? "",
    observacion: observacion ?? "",
  });

  return {
    metadata_informe: {
      tipo_informe: "",
      id_tramite: fila.id_tramite,
      nombre_completo_usuario: fila.nombre_completo,
      estado_analisis: "",
      requiere_revision_humana: fila.estado_checklist === "REQUIERE_REVISION",
    },
    verificacion_identidad: { resultado: "", resumen: "", diferencias_menores_toleradas: [] },
    datos_identificacion: {
      nombre: "",
      apellidos: "",
      fecha_nacimiento: "",
      edad: fila.ident_edad_texto ?? "",
      sexo: fila.ident_sexo ?? "",
      direccion_notificacion: fila.ident_direccion_notificacion ?? "",
      comuna: fila.ident_comuna ?? "",
      zona_vivienda: fila.ident_zona_vivienda ?? "",
      institucion_calificadora: fila.cerofilas_institucion_calificadora ?? "",
      red_apoyo: "",
    },
    datos_calificacion: {
      diagnostico_principal: fila.calif_diagnostico_principal ?? "",
      origen_principal_discapacidad: fila.calif_origen_principal_discapacidad ?? "",
      diagnosticos_secundarios: fila.calif_diagnosticos_secundarios ?? "",
      origenes_secundarios: fila.calif_origenes_secundarios ?? "",
      porcentaje_discapacidad: fila.calif_porcentaje_discapacidad_texto ?? "",
      grado_discapacidad: fila.prop_grado_propuesto ?? "",
      idis: "",
      movilidad_reducida: fila.prop_movilidad_reducida_propuesta ?? "",
      antecedentes_sociales_relevantes: fila.cerofilas_antecedentes_sociales_relevantes ?? "",
      observaciones_datos_relevantes_calificacion: fila.cerofilas_observaciones_calificacion ?? "",
    },
    validacion_ivadec_cif: {
      porcentaje_consta: false,
      porcentaje_existe_en_tabla: false,
      idis_tabla: "",
      grado_tabla: "",
      coincide_con_expediente: false,
      observacion_breve: "",
    },
    observaciones_qa: [],
    nota_codigos_no_aplican: "",
    propuesta_calificacion_fundada: {
      accion_sugerida: fila.prop_accion_sugerida ?? "",
      porcentaje_propuesto: fila.porcentaje_propuesto_ia ?? "",
      grado_propuesto: fila.prop_grado_propuesto ?? "",
      origen_principal_propuesto: fila.prop_origen_principal_propuesto ?? "",
      origenes_secundarios_propuestos: "",
      movilidad_reducida_propuesta: fila.prop_movilidad_reducida_propuesta ?? "",
      reevaluacion_propuesta: "",
      fundamento_breve: fila.prop_fundamento_breve ?? "",
    },
    propuesta_formato_cliente: {
      antecedentes_sociales: {
        isra_completado_por: "",
        nivel_educativo: "",
        trabajo_ocupacion: "",
        situacion_familiar: "",
        grado_limitacion: "",
        situacion_especial: "",
      },
      datos_relevantes_calificacion: {
        ibf_completado_por: "",
        diagnosticos: fila.calif_diagnostico_principal ?? "",
        resumen_informacion_relevante_ibf: "",
        descripcion_estado_funcional: "",
        medicamentos: "",
        ayudas_tecnicas: "",
      },
      informes_examenes_complementarios: { items: [], resumen_concordancia: "" },
      ivadec: {
        ivadec_calificador: "",
        aplicado_a: "",
        porcentaje_obtenido: "",
        origenes_considerados: "",
      },
      observaciones_ivadec: [],
      propuesta: {
        texto_sugerencia: fila.prop_fundamento_breve ?? "",
        movilidad_reducida: fila.cerofilas_movilidad_reducida ?? "",
        reevaluacion: "",
        glosa_tipo: "",
        glosa_texto: "",
      },
    },
    fechas_documentos: {
      cedula: "",
      ibf: "",
      isra: "",
      ivadec_cif: "",
      propuesta_ece: "",
      complementarios: "",
    },
    checklist_admisibilidad_rm: {
      cedula: itemChecklist(fila.checklist_cedula_resultado, fila.checklist_cedula_observacion),
      ibf: itemChecklist(fila.checklist_ibf_resultado, fila.checklist_ibf_observacion),
      isra: itemChecklist(fila.checklist_isra_resultado, fila.checklist_isra_observacion),
      ivadec: itemChecklist(fila.checklist_ivadec_resultado, fila.checklist_ivadec_observacion),
      requiere_representante: fila.requiere_representante ?? false,
      representante_presente: fila.representante_presente ?? "NO_APLICA",
      resultado_general: fila.estado_checklist ?? "",
    },
    carga_cerofilas: {
      zona_vivienda: fila.cerofilas_zona_vivienda ?? "",
      institucion_calificadora: fila.cerofilas_institucion_calificadora ?? "",
      nombre_institucion: fila.cerofilas_nombre_institucion ?? "",
      diagnostico_principal: fila.cerofilas_diagnostico_principal ?? "",
      origen_principal_discapacidad: fila.cerofilas_origen_principal_discapacidad ?? "",
      diagnosticos_secundarios: fila.cerofilas_diagnosticos_secundarios ?? "",
      origenes_secundarios: [],
      porcentaje_de_discapacidad: fila.cerofilas_porcentaje_discapacidad_texto ?? "",
      movilidad_reducida: fila.cerofilas_movilidad_reducida ?? "",
      antecedentes_sociales_relevantes: fila.cerofilas_antecedentes_sociales_relevantes ?? "",
      observaciones_calificacion: fila.cerofilas_observaciones_calificacion ?? "",
      apto_para_revision: fila.estado_checklist !== "NO_APTO",
      alertas_carga: [],
    },
    nombre_archivo_sugerido: "",
  };
}

function construirChecklist(fila: FilaCaso, analisis: AnalisisQA | null): ChecklistItem[] {
  // Las columnas `checklist_*` de la base todavía están vacías (el bot aún no las escribe),
  // así que caemos al checklist del análisis QA cuando la fila no trae nada.
  const desdeBd: [string, string | null, string | null][] = [
    ["Cédula", fila.checklist_cedula_resultado, fila.checklist_cedula_observacion],
    ["IBF", fila.checklist_ibf_resultado, fila.checklist_ibf_observacion],
    ["ISRA", fila.checklist_isra_resultado, fila.checklist_isra_observacion],
    ["IVADEC", fila.checklist_ivadec_resultado, fila.checklist_ivadec_observacion],
  ];

  const checklistAnalisis = analisis?.checklist_admisibilidad_rm;
  const items: [string, string | null, string | null][] = desdeBd.some(([, r]) => r !== null)
    ? desdeBd
    : checklistAnalisis
      ? [
          ["Cédula", checklistAnalisis.cedula.resultado, checklistAnalisis.cedula.observacion],
          ["IBF", checklistAnalisis.ibf.resultado, checklistAnalisis.ibf.observacion],
          ["ISRA", checklistAnalisis.isra.resultado, checklistAnalisis.isra.observacion],
          ["IVADEC", checklistAnalisis.ivadec.resultado, checklistAnalisis.ivadec.observacion],
        ]
      : [];

  return items
    .filter(([, resultado]) => resultado !== null)
    .map(([item, resultado, evidencia]) => ({
      item,
      cumple: resultado === "CUMPLE",
      evidencia: evidencia ?? "",
    }));
}

export function mapearFila(fila: FilaCaso): Caso {
  // Prioridad: (1) analysis.json real del bot, si ya trae el checklist completo; (2) ficha
  // sintética armada desde las columnas planas de `casos`, para los casos poblados desde
  // MAESTRO_RM que no tienen ese JSON pero sí tienen estado_checklist; (3) sin análisis (casos
  // con error de bot, tiene_error_bot=true) — el frontend cae al resumen simple.
  const analisis = fila.analysis_json?.checklist_admisibilidad_rm
    ? fila.analysis_json
    : fila.estado_checklist
      ? construirAnalisisSintetico(fila)
      : null;

  // analysis_json real (o la ficha sintética) manda sobre las columnas planas — evita el bug
  // de "0%"/"No disponible" cuando el bot no llegó a parsear esas columnas.
  const comparativa = resolverComparativaIdis(analisis, fila);

  return {
    analisis,
    id: fila.id,
    idTramite: fila.id_tramite,
    region: fila.region,
    rut: fila.rut,
    nombreCompleto: fila.nombre_completo,
    estadoChecklist: fila.estado_checklist,
    estadoCaso: fila.estado_caso,
    // Desde la Revisión 10 un caso NO_EVALUABLE también tiene fila en calificaciones_finales
    // pero sin porcentaje_final — "calificado" se define por la existencia de una decisión,
    // no por el porcentaje.
    estadoCalificacion: fila.cal_decision !== null ? "CALIFICADO" : "PENDIENTE",
    calificadorAsignadoId: fila.calificador_asignado_id,
    calificadorNombre: fila.calificador_nombre,
    fechaAsignacion: aFechaISO(fila.fecha_asignacion),
    fechaCalificacion: fila.cal_fecha ? aFechaISO(fila.cal_fecha) : null,
    porcentajeIvadecDocumento: comparativa.porcentajeIvadecDocumento,
    idisIvadec: comparativa.idisIvadec,
    gradoIvadec: comparativa.gradoIvadec,
    idisMotor: comparativa.idisMotor,
    gradoMotor: comparativa.gradoMotor,
    subidoCerofilas: fila.subido_cerofilas,
    subidoCerofilasEn: fila.subido_cerofilas_en ? aFechaISO(fila.subido_cerofilas_en) : null,
    resolucion:
      fila.cal_decision === null
        ? null
        : {
            decision: fila.cal_decision,
            idisFinal: fila.cal_idis_final,
            gradoFinal: fila.cal_grado_final,
            direccion: fila.cal_direccion,
            mrFinal: fila.cal_mr_final,
            reevFinal: fila.cal_reev_final,
            motivoCodigo: fila.cal_motivo_codigo,
            causaCodigo: fila.cal_causa_codigo,
            explicacion: fila.cal_explicacion,
          },
    propuesta: {
      diagnosticoPrincipal: fila.calif_diagnostico_principal ?? "",
      diagnosticoSecundario: fila.calif_diagnosticos_secundarios,
      porcentajeIvadecIA: comparativa.porcentajeMotor,
      porcentajeFinal: fila.cal_porcentaje_final ? Number(fila.cal_porcentaje_final) : null,
      fundamento: fila.prop_fundamento_breve ?? "",
      modificadoPorCalificador: fila.cal_modificado ?? false,
      checklist: construirChecklist(fila, analisis),
      documentos: [], // documentos_caso: se llena en el paso de descarga del bot, aparte de este mock rápido
    },
  };
}
