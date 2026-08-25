import "server-only";
import type { Direccion, ReevaluacionFinal } from "@/data/casos";

const VALORES_REEV: ReevaluacionFinal[] = ["NO", "EN_3_ANOS", "EN_5_ANOS", "EN_6_ANOS", "EN_10_ANOS"];

/**
 * Dirección resultante: compara el % final del calificador contra el IVADEC ORIGINAL
 * (`casos.porcentaje_ivadec_documento`), nunca contra la propuesta del motor — regla
 * explícita de la tarea de Cristóbal (sección 10.3), fácil de confundir.
 * Null si no hay IVADEC original con qué comparar (caso viene de MAESTRO_RM sin ese dato).
 */
export function calcularDireccion(porcentajeFinal: number, porcentajeIvadecDocumento: number | null): Direccion | null {
  if (porcentajeIvadecDocumento === null) return null;
  if (porcentajeFinal === porcentajeIvadecDocumento) return "SE_MANTIENE";
  return porcentajeFinal > porcentajeIvadecDocumento ? "SE_AUMENTA" : "SE_DISMINUYE";
}

export function esReevValida(valor: unknown): valor is ReevaluacionFinal {
  return typeof valor === "string" && (VALORES_REEV as string[]).includes(valor);
}
