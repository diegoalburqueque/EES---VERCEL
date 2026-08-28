// Agregación de métricas de productividad (Revisión 13). Funciones puras: reciben las
// filas crudas (una por caso resuelto) y devuelven los totales. Sin acceso a BD acá — se
// puede testear con node:test. El volumen es bajo (decenas/cientos de casos), así que se
// agrega en memoria, mismo criterio que el dashboard del admin.

export interface FilaCasoResuelto {
  casoId: string;
  calificadorId: string | null;
  calificadorNombre: string | null;
  fechaCalificacion: string; // ISO
  revisionSegundosActivos: number;
  revisionNumSesiones: number;
  segundosAperturaCierre: number | null; // fecha_calificacion - fecha_asignacion
  modificado: boolean;
  bloqueadoQa: boolean; // estado_checklist=REQUIERE_REVISION o meta_estado_analisis=OBSERVADO
  versionMotor: string;
}

export interface ResumenMetricas {
  casosCerrados: number;
  tiempoActivoTotalSeg: number;
  tiempoActivoMedioMin: number;
  tiempoActivoMedianaMin: number;
  casosPorHora: number; // casos ÷ (tiempo activo total en horas)
  aperturaCierreMedioHoras: number | null;
  numSesionesMedio: number;
  casosModificados: number;
  pctModificados: number;
  casosBloqueadosQa: number;
  pctBloqueadosQa: number;
}

function mediana(nums: number[]): number {
  if (!nums.length) return 0;
  const orden = [...nums].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
}

function media(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function resumir(filas: FilaCasoResuelto[]): ResumenMetricas {
  const n = filas.length;
  const activos = filas.map((f) => f.revisionSegundosActivos ?? 0);
  const tiempoActivoTotalSeg = activos.reduce((a, b) => a + b, 0);
  const conActivo = activos.filter((s) => s > 0);
  const aperturas = filas
    .map((f) => f.segundosAperturaCierre)
    .filter((s): s is number => typeof s === "number" && s >= 0);
  const modificados = filas.filter((f) => f.modificado).length;
  const bloqueados = filas.filter((f) => f.bloqueadoQa).length;

  return {
    casosCerrados: n,
    tiempoActivoTotalSeg,
    tiempoActivoMedioMin: +(media(conActivo) / 60).toFixed(1),
    tiempoActivoMedianaMin: +(mediana(conActivo) / 60).toFixed(1),
    casosPorHora: tiempoActivoTotalSeg > 0 ? +(n / (tiempoActivoTotalSeg / 3600)).toFixed(2) : 0,
    aperturaCierreMedioHoras: aperturas.length ? +(media(aperturas) / 3600).toFixed(1) : null,
    numSesionesMedio: +media(filas.map((f) => f.revisionNumSesiones ?? 0)).toFixed(1),
    casosModificados: modificados,
    pctModificados: n ? Math.round((modificados / n) * 100) : 0,
    casosBloqueadosQa: bloqueados,
    pctBloqueadosQa: n ? Math.round((bloqueados / n) * 100) : 0,
  };
}

export interface GrupoMetricas extends ResumenMetricas {
  clave: string;
  etiqueta: string;
}

export function agruparPor(
  filas: FilaCasoResuelto[],
  clave: (f: FilaCasoResuelto) => { id: string; etiqueta: string } | null,
): GrupoMetricas[] {
  const grupos = new Map<string, { etiqueta: string; filas: FilaCasoResuelto[] }>();
  for (const fila of filas) {
    const k = clave(fila);
    if (!k) continue;
    const entrada = grupos.get(k.id) ?? { etiqueta: k.etiqueta, filas: [] };
    entrada.filas.push(fila);
    grupos.set(k.id, entrada);
  }
  return [...grupos.entries()]
    .map(([id, { etiqueta, filas: fs }]) => ({ clave: id, etiqueta, ...resumir(fs) }))
    .sort((a, b) => b.casosCerrados - a.casosCerrados);
}
