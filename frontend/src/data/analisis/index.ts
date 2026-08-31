/**
 * Forma del análisis QA completo que devuelve el bot (analysis.json) y que se guarda tal
 * cual en `casos.analysis_json` de Supabase. El API (`/api/casos/route.ts`) lee esa columna
 * directamente — este archivo solo define el tipo, ya no guarda datos de casos.
 */

export interface ObservacionQA {
  codigo: string;
  categoria: string;
  justificacion: string;
}

export interface DiferenciaMenor {
  documento: string;
  campo: string;
  valor_documento_a: string;
  valor_documento_b: string;
  justificacion: string;
}

export interface ExamenComplementario {
  documento: string;
  fecha: string;
  hallazgo: string;
  relacion_ibf: string;
}

export interface ItemChecklist {
  resultado: string;
  observacion: string;
}

/* ── Bloques de detalle que agregó el bot (JSON ampliado) ─────────────────────
 * Todos opcionales: la ficha sintética (casos sin analysis.json real) no los trae,
 * y el motor puede omitir alguno. El componente <ObservacionesAnalisis> los muestra solo
 * si vienen. Se leen directo de `casos.analysis_json` — no hay columnas planas. */

export interface DiagnosticoAnalizado {
  id: string;
  texto_literal: string;
  codigo_visible: string;
  fuente_tipo: string;
  fuente_documento: string;
  estado_clinico: string;
  legibilidad: string;
  impacto_funcional_documentado: string;
  origen_documental: string;
  origen_esperado_guia: string;
  coherencia_origen: string;
  diagnostico_normalizado_propuesta: string;
  normalizacion_estado: string;
  faltantes_normalizacion: string[];
  candidato_certificable: string;
  es_principal_sugerido: boolean;
  motivo_principal_sugerido: string;
}

export interface EvaluacionGuiaClinica {
  diagnostico_id: string;
  familia_guia: string;
  resultado: string;
  profesionales_requeridos: string[];
  soporte_profesional_encontrado: string[];
  informacion_requerida: string[];
  informacion_encontrada: string[];
  informacion_faltante: string[];
  elementos_rescatar_encontrados: string[];
  origen_guia: string;
  observacion: string;
}

export interface ActividadCoherencia {
  codigo: string;
  actividad: string;
  a: number | null;
  b: number | null;
  c: number | null;
}

export interface FuentesDurasCalificacion {
  ibf?: {
    causas_discapacidad_marcadas?: string[];
    diagnosticos_transcritos?: {
      codigo: string;
      texto: string;
      legibilidad: string;
      es_principal_explicito: boolean;
    }[];
    requiere_ayuda_tecnica?: string;
    usa_ayuda_tecnica?: string;
    ayuda_tecnica_texto?: string;
  };
  ivadec?: {
    edad_anos?: number;
    edad_meses_adicionales?: number;
    grupo_etario?: string;
    origen_principal?: string;
    otros_origenes?: string[];
    porcentaje_discapacidad?: string;
    idis?: string;
    grado_discapacidad?: string;
    actividades_coherencia?: ActividadCoherencia[];
  };
  isra?: {
    convivientes?: {
      nombre: string;
      edad: string;
      relacion: string;
      actividad_principal: string;
    }[];
  };
}

export interface FuentesDurasAdmisibilidad {
  cedula?: Record<string, string>;
  ibf?: Record<string, string>;
  isra?: Record<string, string>;
  ivadec?: Record<string, string>;
  representante?: Record<string, string>;
}

export interface ReglaDeterministica {
  resultado: string;
  traza: string;
  motivo: string;
  origenes_ignorados?: string[];
}

export interface AnalisisQA {
  metadata_informe: {
    tipo_informe: string;
    id_tramite: string;
    nombre_completo_usuario: string;
    estado_analisis: string;
    requiere_revision_humana: boolean;
  };
  verificacion_identidad: {
    resultado: string;
    resumen: string;
    diferencias_menores_toleradas: DiferenciaMenor[];
  };
  datos_identificacion: {
    nombre: string;
    apellidos: string;
    fecha_nacimiento: string;
    edad: string;
    sexo: string;
    direccion_notificacion: string;
    comuna: string;
    zona_vivienda: string;
    institucion_calificadora: string;
    red_apoyo: string;
  };
  datos_calificacion: {
    diagnostico_principal: string;
    origen_principal_discapacidad: string;
    diagnosticos_secundarios: string;
    origenes_secundarios: string;
    porcentaje_discapacidad: string;
    grado_discapacidad: string;
    idis: string;
    movilidad_reducida: string;
    antecedentes_sociales_relevantes: string;
    observaciones_datos_relevantes_calificacion: string;
  };
  validacion_ivadec_cif: {
    porcentaje_consta: boolean;
    porcentaje_existe_en_tabla: boolean;
    idis_tabla: string;
    grado_tabla: string;
    coincide_con_expediente: boolean;
    observacion_breve: string;
  };
  observaciones_qa: ObservacionQA[];
  nota_codigos_no_aplican: string;
  propuesta_calificacion_fundada: {
    accion_sugerida: string;
    porcentaje_propuesto: string;
    grado_propuesto: string;
    origen_principal_propuesto: string;
    origenes_secundarios_propuestos: string;
    movilidad_reducida_propuesta: string;
    reevaluacion_propuesta: string;
    fundamento_breve: string;
  };
  propuesta_formato_cliente: {
    antecedentes_sociales: {
      isra_completado_por: string;
      nivel_educativo: string;
      trabajo_ocupacion: string;
      situacion_familiar: string;
      grado_limitacion: string;
      situacion_especial: string;
    };
    datos_relevantes_calificacion: {
      ibf_completado_por: string;
      diagnosticos: string;
      resumen_informacion_relevante_ibf: string;
      descripcion_estado_funcional: string;
      medicamentos: string;
      ayudas_tecnicas: string;
    };
    informes_examenes_complementarios: {
      items: ExamenComplementario[];
      resumen_concordancia: string;
    };
    ivadec: {
      ivadec_calificador: string;
      aplicado_a: string;
      porcentaje_obtenido: string;
      origenes_considerados: string;
    };
    observaciones_ivadec: string[];
    propuesta: {
      texto_sugerencia: string;
      movilidad_reducida: string;
      reevaluacion: string;
      glosa_tipo: string;
      glosa_texto: string;
    };
  };
  fechas_documentos: {
    cedula: string;
    ibf: string;
    isra: string;
    ivadec_cif: string;
    propuesta_ece: string;
    complementarios: string;
  };
  checklist_admisibilidad_rm: {
    cedula: ItemChecklist;
    ibf: ItemChecklist;
    isra: ItemChecklist;
    ivadec: ItemChecklist;
    requiere_representante: boolean;
    representante_presente: string;
    resultado_general: string;
  };
  carga_cerofilas: {
    zona_vivienda: string;
    institucion_calificadora: string;
    nombre_institucion: string;
    diagnostico_principal: string;
    origen_principal_discapacidad: string;
    diagnosticos_secundarios: string;
    origenes_secundarios: string[];
    porcentaje_de_discapacidad: string;
    movilidad_reducida: string;
    antecedentes_sociales_relevantes: string;
    observaciones_calificacion: string;
    apto_para_revision: boolean;
    alertas_carga: string[];
  };
  nombre_archivo_sugerido: string;

  // Bloques de detalle del JSON ampliado — opcionales, ver <ObservacionesAnalisis>.
  analisis_diagnosticos?: DiagnosticoAnalizado[];
  evaluacion_guia_clinica?: EvaluacionGuiaClinica[];
  fuentes_duras_calificacion?: FuentesDurasCalificacion;
  fuentes_duras_admisibilidad?: FuentesDurasAdmisibilidad;
  reglas_deterministicas?: Record<string, ReglaDeterministica>;
}
