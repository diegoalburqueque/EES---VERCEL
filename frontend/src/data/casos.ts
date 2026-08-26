import type { AnalisisQA } from "./analisis";

export type EstadoChecklist = "APTO" | "REQUIERE_REVISION" | "NO_APTO";
export type EstadoCalificacion = "PENDIENTE" | "CALIFICADO";

export interface ChecklistItem {
  item: string;
  cumple: boolean;
  evidencia: string;
}

export interface DocumentoCaso {
  tipo: string;
  link: string;
}

export interface PropuestaCalificacion {
  diagnosticoPrincipal: string;
  diagnosticoSecundario: string | null;
  /** null cuando el motor no llegó a calcular una propuesta para este caso (ej. la IA omitió
   *  el bloque "propuesta" — ver observaciones_qa código 8) — no confundir con 0%, que sería
   *  un valor real. */
  porcentajeIvadecIA: number | null;
  porcentajeFinal: number | null; // null hasta que el calificador ratifica o modifica
  fundamento: string;
  modificadoPorCalificador: boolean;
  checklist: ChecklistItem[];
  documentos: DocumentoCaso[];
}

export type Decision = "ACEPTA" | "MODIFICA" | "NO_EVALUABLE";
export type Direccion = "SE_MANTIENE" | "SE_AUMENTA" | "SE_DISMINUYE";
export type ReevaluacionFinal = "NO" | "EN_3_ANOS" | "EN_5_ANOS" | "EN_6_ANOS" | "EN_10_ANOS";

/**
 * Resolución estructurada del calificador (Revisión 10 de la BD, tarea ATM de Cristóbal).
 * Vive en `calificaciones_finales`. Null hasta que el calificador ratifica, modifica, o
 * declara el caso no evaluable — `analysis_json` nunca se toca por esto.
 */
export interface ResolucionCalificador {
  decision: Decision;
  idisFinal: string | null;
  gradoFinal: string | null;
  direccion: Direccion | null;
  mrFinal: boolean | null;
  reevFinal: ReevaluacionFinal | null;
  motivoCodigo: string | null; // solo si decision = MODIFICA
  causaCodigo: string | null; // solo si decision = NO_EVALUABLE
  explicacion: string | null; // fundamento (MODIFICA) o detalle (NO_EVALUABLE)
  /** Firma: quién resolvió (`calificaciones_finales.calificador_id`) y su profesión
   *  (`profesiones.etiqueta`, ej. "Kinesiología"). Se muestra al pie de la vista de CeroFilas
   *  y del histórico, y se incluye en el texto que se copia a CeroFilas. */
  calificadorNombre: string | null;
  calificadorProfesion: string | null;
}

export interface Caso {
  id: string;
  idTramite: string;
  region: "RM" | "OHIGGINS" | "BIOBIO" | "ANTOFAGASTA";
  rut: string;
  nombreCompleto: string;
  estadoChecklist: EstadoChecklist;
  estadoCalificacion: EstadoCalificacion;
  /** Estado del flujo en la tabla `estados_caso`: BORRADOR, EN_REVISION, FINALIZADO, etc. */
  estadoCaso: string;
  calificadorAsignadoId: string | null;
  calificadorNombre?: string | null; // solo lo llena el endpoint de admin
  fechaAsignacion: string;
  fechaCalificacion: string | null;
  propuesta: PropuestaCalificacion;
  /**
   * % que trae el documento IVADEC físico (casos.porcentaje_ivadec_documento) — el original
   * contra el que se calcula `resolucion.direccion`, distinto de `propuesta.porcentajeIvadecIA`
   * (que pese al nombre histórico es el % que PROPONE el motor, no el del documento).
   */
  porcentajeIvadecDocumento: number | null;
  /** IDIS/grado según la tabla IVADEC-CIF (validacion_ivadec_cif), para la fila "Según IVADEC-CIF"
   *  de la tabla comparativa. */
  idisIvadec: string | null;
  gradoIvadec: string | null;
  /** IDIS/grado de la propuesta sugerida (datos_calificacion.idis / grado_discapacidad), para
   *  la fila "Propuesta de calificación sugerida" de la tabla comparativa. */
  idisMotor: string | null;
  gradoMotor: string | null;
  /** Qué implica la propuesta sugerida respecto del IVADEC-CIF original: aumentar / mantener /
   *  disminuir el porcentaje (`porcentaje sugerido` vs `porcentaje_ivadec_documento`). null si
   *  falta alguno de los dos. Se muestra al calificador antes de resolver, como orientación —
   *  distinto de `resolucion.direccion`, que es la dirección de SU decisión final. */
  direccionSugerida: Direccion | null;
  resolucion: ResolucionCalificador | null;
  /** Botón "Ya lo subí" — independiente de la resolución, el calificador lo marca cuando ya
   *  subió el caso a CeroFilas por su cuenta. Puramente informativo para el admin. */
  subidoCerofilas: boolean;
  subidoCerofilasEn: string | null;
  /**
   * Ficha QA completa del bot, leída directo de `casos.analysis_json` en Supabase.
   * Es null si el bot todavía no generó el análisis para ese ID de trámite (falló en la IA).
   */
  analisis: AnalisisQA | null;
  /**
   * Snapshot de la ficha editada por el calificador (`casos.ficha_editada`, jsonb) — solo los
   * campos que tocó, por id. Es la fuente de verdad en el histórico, donde `localStorage` del
   * navegador puede no tener nada. null si el calificador nunca guardó una edición.
   */
  fichaEditada: Record<string, string> | null;
}
