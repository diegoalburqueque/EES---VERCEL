import type { ReevaluacionFinal } from "./casos";

/**
 * Catálogos del flujo de resolución del calificador.
 *
 * TABLA_IDIS: los 41 valores oficiales IVADEC-CIF (% -> IDIS -> grado), copiados de
 * `IVADEC_CIF_BY_PERCENT` en compin-calificacion-motor/src/services/rules/rm-hard-rules.ts.
 * Si el bot cambia esa tabla, actualizar esta también. Corregido el 14/10/2026: antes tenía
 * 10 valores de ejemplo (incluido 33,3 %, que no existe en IVADEC).
 *
 * ⚠️ PENDIENTE — MOTIVOS_MODIFICACION y CAUSAS_NO_EVALUABLE siguen siendo placeholder:
 * Cristóbal todavía no entregó los catálogos reales.
 */

export interface ValorIdis {
  porcentaje: number;
  idis: string;
  grado: string;
}

export const TABLA_IDIS: ValorIdis[] = [
  { porcentaje: 0, idis: "0.0", grado: "SIN DISCAPACIDAD" },
  { porcentaje: 1.3, idis: "0.1", grado: "SIN DISCAPACIDAD" },
  { porcentaje: 4, idis: "0.2", grado: "SIN DISCAPACIDAD" },
  { porcentaje: 5.7, idis: "0.3", grado: "LEVE" },
  { porcentaje: 7.6, idis: "0.4", grado: "LEVE" },
  { porcentaje: 9.5, idis: "0.5", grado: "LEVE" },
  { porcentaje: 11.5, idis: "0.6", grado: "LEVE" },
  { porcentaje: 13.4, idis: "0.7", grado: "LEVE" },
  { porcentaje: 15.3, idis: "0.8", grado: "LEVE" },
  { porcentaje: 17.2, idis: "0.9", grado: "LEVE" },
  { porcentaje: 19.1, idis: "1.0", grado: "LEVE" },
  { porcentaje: 21, idis: "1.1", grado: "LEVE" },
  { porcentaje: 22.9, idis: "1.2", grado: "LEVE" },
  { porcentaje: 24.8, idis: "1.3", grado: "LEVE" },
  { porcentaje: 28.6, idis: "1.4", grado: "MODERADO" },
  { porcentaje: 32.1, idis: "1.5", grado: "MODERADO" },
  { porcentaje: 35.7, idis: "1.6", grado: "MODERADO" },
  { porcentaje: 39.3, idis: "1.7", grado: "MODERADO" },
  { porcentaje: 42.9, idis: "1.8", grado: "MODERADO" },
  { porcentaje: 46.4, idis: "1.9", grado: "MODERADO" },
  { porcentaje: 50, idis: "2.0", grado: "SEVERO" },
  { porcentaje: 52.5, idis: "2.1", grado: "SEVERO" },
  { porcentaje: 55, idis: "2.2", grado: "SEVERO" },
  { porcentaje: 57.5, idis: "2.3", grado: "SEVERO" },
  { porcentaje: 60, idis: "2.4", grado: "SEVERO" },
  { porcentaje: 62.5, idis: "2.5", grado: "SEVERO" },
  { porcentaje: 65, idis: "2.6", grado: "SEVERO" },
  { porcentaje: 67.5, idis: "2.7", grado: "SEVERO" },
  { porcentaje: 70, idis: "2.8", grado: "SEVERO" },
  { porcentaje: 72.5, idis: "2.9", grado: "SEVERO" },
  { porcentaje: 75, idis: "3.0", grado: "SEVERO" },
  { porcentaje: 77.5, idis: "3.1", grado: "SEVERO" },
  { porcentaje: 80, idis: "3.2", grado: "SEVERO" },
  { porcentaje: 82.5, idis: "3.3", grado: "SEVERO" },
  { porcentaje: 85, idis: "3.4", grado: "SEVERO" },
  { porcentaje: 87.5, idis: "3.5", grado: "PROFUNDO" },
  { porcentaje: 90, idis: "3.6", grado: "PROFUNDO" },
  { porcentaje: 92.5, idis: "3.7", grado: "PROFUNDO" },
  { porcentaje: 95, idis: "3.8", grado: "PROFUNDO" },
  { porcentaje: 96.3, idis: "3.9", grado: "PROFUNDO" },
  { porcentaje: 100, idis: "4.0", grado: "PROFUNDO" },
];

export function buscarValorIdis(porcentaje: number): ValorIdis | undefined {
  return TABLA_IDIS.find((v) => v.porcentaje === porcentaje);
}

export interface OpcionCatalogo {
  codigo: string;
  texto: string;
  familia?: string; // agrupa las causas de "no evaluable" en <optgroup>
}

export const MOTIVOS_MODIFICACION: OpcionCatalogo[] = [
  { codigo: "MOT-01", texto: "El diagnóstico principal está mal calificado" },
  { codigo: "MOT-02", texto: "El origen de la discapacidad no corresponde" },
  { codigo: "MOT-03", texto: "Los antecedentes sociales cambian el resultado" },
  { codigo: "MOT-04", texto: "La movilidad reducida quedó mal resuelta" },
  { codigo: "MOT-05", texto: "Otro motivo, ver fundamento" },
];

export const CAUSAS_NO_EVALUABLE: OpcionCatalogo[] = [
  { codigo: "DOC-01", texto: "Falta un documento obligatorio", familia: "Documentación" },
  { codigo: "DOC-02", texto: "Un documento está ilegible o incompleto", familia: "Documentación" },
  { codigo: "ID-01", texto: "La identidad no se pudo verificar", familia: "Identidad" },
  { codigo: "OTR-01", texto: "Otro motivo, ver detalle", familia: "Otros" },
];

export const OPCIONES_REEV: { valor: ReevaluacionFinal; etiqueta: string }[] = [
  { valor: "NO", etiqueta: "NO" },
  { valor: "EN_3_ANOS", etiqueta: "EN 3 AÑOS" },
  { valor: "EN_5_ANOS", etiqueta: "EN 5 AÑOS" },
  { valor: "EN_6_ANOS", etiqueta: "EN 6 AÑOS" },
  { valor: "EN_10_ANOS", etiqueta: "EN 10 AÑOS" },
];
