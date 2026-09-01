import type { Caso } from "@/data/casos";
import { CAUSAS_NO_EVALUABLE } from "@/data/resolucion-catalogos";
import { formatearFecha } from "@/lib/fechas";

/**
 * Exportación a CSV (Excel) de las vistas de admin. Todo sale de lo que `/api/casos` ya
 * devuelve (`caso.analisis` = analysis_json del bot, `caso.resolucion` = calificaciones_finales).
 * No hay endpoint nuevo. El CSV va con `;` y BOM UTF-8 para que Excel en español lo abra bien.
 */

function celda(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function aCsv(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return "";
  const cols = Object.keys(filas[0]);
  const lineas = [cols.join(";"), ...filas.map((f) => cols.map((c) => celda(f[c])).join(";"))];
  return "﻿" + lineas.join("\r\n");
}

export function descargarCsv(nombreArchivo: string, filas: Record<string, unknown>[]): void {
  const blob = new Blob([aCsv(filas)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const causaTexto = (codigo: string | null): string =>
  CAUSAS_NO_EVALUABLE.find((c) => c.codigo === codigo)?.texto ?? codigo ?? "";

/* ── DEVUELTOS (el calificador declaró el caso no evaluable) ──────────────── */

export function filaDevuelto(c: Caso): Record<string, unknown> {
  const a = c.analisis;
  const r = c.resolucion;
  return {
    "ID Trámite": c.idTramite,
    Región: c.region,
    RUT: c.rut,
    Nombre: c.nombreCompleto,
    "Devuelto por": r?.calificadorNombre ?? c.calificadorNombre ?? "",
    Profesión: r?.calificadorProfesion ?? "",
    "Fecha devolución": formatearFecha(c.fechaCalificacion),
    "Causa (código)": r?.causaCodigo ?? "",
    "Causa": causaTexto(r?.causaCodigo ?? null),
    "Detalle del calificador": r?.explicacion ?? "",
    "Diagnóstico principal (propuesta)": a?.datos_calificacion?.diagnostico_principal ?? "",
    "% propuesto": c.propuesta.porcentajeIvadecIA ?? "",
    "Verificación de identidad": a?.verificacion_identidad?.resultado ?? "",
    "Resultado checklist del bot": a?.checklist_admisibilidad_rm?.resultado_general ?? c.estadoChecklist,
  };
}

/* ── NO APTO (el bot declaró el caso no apto en el checklist) ─────────────── */

const OBS = (o?: { resultado?: string; observacion?: string }) =>
  o ? `${o.resultado ?? ""}${o.observacion ? ` — ${o.observacion}` : ""}` : "";

export function filaNoApto(c: Caso): Record<string, unknown> {
  const a = c.analisis;
  const chk = a?.checklist_admisibilidad_rm;
  const vid = a?.verificacion_identidad;
  const qa = (a?.observaciones_qa ?? []).map((o) => `${o.codigo}: ${o.categoria}`).join(" | ");
  return {
    "ID Trámite": c.idTramite,
    Región: c.region,
    RUT: c.rut,
    Nombre: c.nombreCompleto,
    "Calificador asignado": c.calificadorNombre ?? "Sin asignar",
    "Resultado general": chk?.resultado_general ?? "NO_APTO",
    "Cédula": OBS(chk?.cedula),
    "IBF": OBS(chk?.ibf),
    "ISRA": OBS(chk?.isra),
    "IVADEC": OBS(chk?.ivadec),
    "Requiere representante": chk?.requiere_representante ? "Sí" : "No",
    "Representante presente": chk?.representante_presente ?? "",
    "Verificación de identidad": vid?.resultado ?? "",
    "Resumen identidad": vid?.resumen ?? "",
    "Observaciones QA": qa,
    "Diagnóstico principal (propuesta)": a?.datos_calificacion?.diagnostico_principal ?? "",
  };
}

/* ── motivos legibles para mostrar inline en la tabla (sin abrir el caso) ── */

export function motivosNoApto(c: Caso): { etiqueta: string; texto: string }[] {
  const chk = c.analisis?.checklist_admisibilidad_rm;
  const vid = c.analisis?.verificacion_identidad;
  const out: { etiqueta: string; texto: string }[] = [];
  for (const [nom, o] of [
    ["Cédula", chk?.cedula],
    ["IBF", chk?.ibf],
    ["ISRA", chk?.isra],
    ["IVADEC", chk?.ivadec],
  ] as const) {
    if (o && o.resultado !== "CUMPLE") out.push({ etiqueta: nom, texto: `${o.resultado}${o.observacion ? ` — ${o.observacion}` : ""}` });
  }
  if (vid && vid.resultado && vid.resultado !== "COINCIDENCIA TOTAL" && vid.resultado !== "COINCIDENCIA_TOTAL") {
    out.push({ etiqueta: "Identidad", texto: `${vid.resultado}${vid.resumen ? ` — ${vid.resumen}` : ""}` });
  }
  return out;
}

export function detalleDevuelto(c: Caso): { causa: string; codigo: string; detalle: string; por: string; fecha: string } {
  const r = c.resolucion;
  return {
    causa: causaTexto(r?.causaCodigo ?? null),
    codigo: r?.causaCodigo ?? "",
    detalle: r?.explicacion ?? "",
    por: r?.calificadorNombre ?? c.calificadorNombre ?? "",
    fecha: formatearFecha(c.fechaCalificacion),
  };
}
