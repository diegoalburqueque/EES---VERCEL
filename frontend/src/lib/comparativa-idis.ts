import "server-only";
import type { AnalisisQA } from "@/data/analisis";

/** El instrumento usa coma decimal ("32,1"), pero el JSON del bot a veces trae punto y a
 *  veces el símbolo "%" pegado. Mismo criterio que ya usa leerPorcentajeFinal en FichaEditable. */
export function parsearPorcentaje(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpio = texto.replace("%", "").replace(",", ".").trim();
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
}

export interface ComparativaIdis {
  idisIvadec: string | null;
  gradoIvadec: string | null;
  porcentajeIvadecDocumento: number | null;
  idisMotor: string | null;
  gradoMotor: string | null;
  porcentajeMotor: number | null;
}

export interface ColumnasPlanasComparativa {
  porcentaje_propuesto_ia: string | null;
  porcentaje_ivadec_documento: string | null;
  valid_idis_tabla: string | null;
  valid_grado_tabla: string | null;
  calif_idis: string | null;
  calif_grado_discapacidad: string | null;
  calif_porcentaje_discapacidad_texto: string | null;
}

/**
 * Resuelve la comparación IVADEC vs Motor con la misma prioridad que ya usa el resto del
 * sistema para todo lo demás (ver `construirAnalisisSintetico`): `analysis_json` (real o
 * ficha sintética) es la fuente de verdad; las columnas planas de `casos` son solo respaldo
 * para cuando no hay análisis en absoluto (`tiene_error_bot`).
 *
 * Antes de esto, `casos-mapper.ts` y el endpoint de Ratificar leían las columnas planas
 * directo, sin revisar `analysis_json` — si el bot no llegó a parsear esas columnas (pasa
 * seguido con los casos de MAESTRO_RM), la tabla comparativa mostraba "No disponible"/"0%"
 * aunque el JSON sí tuviera el dato real, y Ratificar podía guardar `porcentaje_final = NULL`
 * por el mismo motivo.
 */
export function resolverComparativaIdis(
  analisis: AnalisisQA | null,
  fallback: ColumnasPlanasComparativa
): ComparativaIdis {
  return {
    idisIvadec: analisis?.validacion_ivadec_cif.idis_tabla || fallback.valid_idis_tabla,
    gradoIvadec: analisis?.validacion_ivadec_cif.grado_tabla || fallback.valid_grado_tabla,
    porcentajeIvadecDocumento:
      parsearPorcentaje(analisis?.propuesta_formato_cliente.ivadec.porcentaje_obtenido) ??
      (fallback.porcentaje_ivadec_documento ? Number(fallback.porcentaje_ivadec_documento) : null),
    idisMotor: analisis?.datos_calificacion.idis || fallback.calif_idis,
    gradoMotor: analisis?.datos_calificacion.grado_discapacidad || fallback.calif_grado_discapacidad,
    // `propuesta_calificacion_fundada.porcentaje_propuesto` es la "acción recomendada" — cuando
    // el motor marca accion_sugerida=OBSERVAR (caso incierto, requiere revisión humana), la deja
    // vacía a propósito, aunque ya haya calculado el % en `datos_calificacion` — por eso ese
    // campo es el segundo lugar donde buscar antes de rendirse a las columnas planas.
    porcentajeMotor:
      parsearPorcentaje(analisis?.propuesta_calificacion_fundada.porcentaje_propuesto) ??
      parsearPorcentaje(analisis?.datos_calificacion.porcentaje_discapacidad) ??
      (fallback.porcentaje_propuesto_ia ? Number(fallback.porcentaje_propuesto_ia) : null) ??
      parsearPorcentaje(fallback.calif_porcentaje_discapacidad_texto),
  };
}
