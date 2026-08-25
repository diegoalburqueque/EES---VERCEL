import type { ReevaluacionFinal } from "./casos";

/**
 * ⚠️ PENDIENTE — catálogos placeholder para el flujo de resolución del calificador.
 *
 * Cristóbal todavía no entregó:
 *   1. Los 41 valores oficiales de la tabla IDIS (% -> IDIS -> grado).
 *   2. El catálogo real de motivos de modificación.
 *   3. El catálogo real de causas de "no se puede evaluar".
 *
 * Lo de abajo es un set mínimo para que el flujo compile y se pueda probar de punta a
 * punta — NO son los valores reales. No usar en producción sin reemplazar por los que
 * mande Cristóbal (o los que se extraigan de rules/manuales/3.- GUÍA CLÍNICA...).
 */

export interface ValorIdis {
  porcentaje: number;
  idis: string;
  grado: string;
}

export const TABLA_IDIS: ValorIdis[] = [
  { porcentaje: 5, idis: "0.1", grado: "LEVE" },
  { porcentaje: 33.3, idis: "1.0", grado: "MODERADO" },
  { porcentaje: 50, idis: "2.0", grado: "SEVERO" },
  { porcentaje: 52.5, idis: "2.1", grado: "SEVERO" },
  { porcentaje: 55, idis: "2.2", grado: "SEVERO" },
  { porcentaje: 60, idis: "2.4", grado: "SEVERO" },
  { porcentaje: 65, idis: "2.6", grado: "SEVERO" },
  { porcentaje: 70, idis: "2.8", grado: "SEVERO" },
  { porcentaje: 75, idis: "3.0", grado: "MUY_SEVERO" },
  { porcentaje: 100, idis: "4.0", grado: "MUY_SEVERO" },
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
