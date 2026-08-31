"use client";

import type {
  AnalisisQA,
  DiagnosticoAnalizado,
  EvaluacionGuiaClinica,
} from "@/data/analisis";

/**
 * "OBSERVACIONES DEL ANÁLISIS" — bloques del `analysis.json` ampliado que la ficha no usa,
 * organizados para que el calificador los lea de una pasada: análisis por diagnóstico, brechas
 * según guía clínica, actividades IVADEC-CIF y alertas de la documentación.
 *
 * Todas las secciones van siempre visibles (no se pliegan). Cada una se muestra solo si el
 * dato viene; si no hay ninguno, el componente no renderiza nada.
 */

/* ── helpers de presentación ─────────────────────────────────────────────── */

const VERDE = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
const AMBAR = "bg-amber-50 text-amber-800 ring-amber-600/20";
const ROJO = "bg-red-50 text-red-700 ring-red-600/20";
const GRIS = "bg-zinc-100 text-zinc-600 ring-zinc-500/20";

const COLOR_POR_VALOR: Record<string, string> = {
  COHERENTE: VERDE,
  CONFIRMADO: VERDE,
  COMPLETA: VERDE,
  LEGIBLE: VERDE,
  SI: VERDE,
  COMPLETO: VERDE,
  CUMPLE: VERDE,
  REQUIERE_REVISION: AMBAR,
  INCOMPLETA: AMBAR,
  PARCIAL: AMBAR,
  NO_DETERMINADO: AMBAR,
  ANTECEDENTE: AMBAR,
  MENOR_REQUIERE_REVISION: AMBAR,
  NO_VERIFICABLE: AMBAR,
  NO: ROJO,
  NO_APTO: ROJO,
  NO_CUMPLE: ROJO,
  DIVERGENTE: ROJO,
};

function colorDe(valor: string): string {
  return COLOR_POR_VALOR[valor.toUpperCase().replace(/\s+/g, "_")] ?? GRIS;
}

function Chip({ children, tono }: { children: string; tono?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
        tono ?? colorDe(children)
      }`}
    >
      {children.replace(/_/g, " ")}
    </span>
  );
}

/** Lista con viñetas compacta; nada si el array viene vacío. */
function Lista({ items, tono }: { items?: string[]; tono?: "ok" | "falta" | "neutro" }) {
  if (!items || items.length === 0) return null;
  const punto =
    tono === "ok" ? "text-emerald-600" : tono === "falta" ? "text-amber-600" : "text-zinc-400";
  return (
    <ul className="mt-1 flex flex-col gap-1">
      {items.map((t, i) => (
        <li key={i} className="flex gap-1.5 text-sm text-zinc-700">
          <span className={`mt-[3px] text-[10px] ${punto}`}>●</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Sección siempre visible (no se pliega). */
function Panel({
  titulo,
  cuenta,
  children,
}: {
  titulo: string;
  cuenta?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--atm-linea)] px-5 py-4 first:border-t-0">
      <h3 className="mb-3 flex items-baseline gap-1.5 border-l-4 border-[var(--atm-azul2)] pl-2 text-[13px] font-bold uppercase tracking-wide text-[var(--atm-azul)]">
        {titulo}
        {cuenta !== undefined && <span className="font-normal text-zinc-400">({cuenta})</span>}
      </h3>
      {children}
    </section>
  );
}

/* ── A. Alertas y estado ─────────────────────────────────────────────────── */

function PanelAlertas({ analisis }: { analisis: AnalisisQA }) {
  const meta = analisis.metadata_informe;
  const cerofilas = analisis.carga_cerofilas;
  const validacion = analisis.validacion_ivadec_cif;
  const mrF4 = analisis.reglas_deterministicas?.mr_f4;
  const alertas = cerofilas?.alertas_carga ?? [];

  const noCoincideIvadec =
    validacion && validacion.porcentaje_consta && validacion.coincide_con_expediente === false;

  const hayAlgo =
    !!meta?.estado_analisis ||
    meta?.requiere_revision_humana ||
    alertas.length > 0 ||
    noCoincideIvadec ||
    !!mrF4;

  if (!hayAlgo) return null;

  const estadoTexto: Record<string, string> = {
    OK: "Análisis sin observaciones",
    OBSERVADO: "Análisis observado",
    ERROR: "Análisis con error",
  };

  return (
    <Panel titulo="Alertas y estado del análisis">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {meta?.estado_analisis && (
            <Chip tono={meta.estado_analisis === "OK" ? VERDE : AMBAR}>
              {estadoTexto[meta.estado_analisis] ?? meta.estado_analisis}
            </Chip>
          )}
          {analisis.checklist_admisibilidad_rm?.resultado_general && (
            <Chip>{`Admisibilidad: ${analisis.checklist_admisibilidad_rm.resultado_general}`}</Chip>
          )}
          <Chip tono={cerofilas?.apto_para_revision ? VERDE : ROJO}>
            {cerofilas?.apto_para_revision ? "Apto para revisión" : "No apto para revisión"}
          </Chip>
          {meta?.requiere_revision_humana && <Chip tono={AMBAR}>Requiere revisión humana</Chip>}
        </div>

        {alertas.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Alertas de carga ({alertas.length})
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {alertas.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-900">
                  <span className="mt-[3px] text-[10px] text-amber-500">▲</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {noCoincideIvadec && (
          <div className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              IDIS / grado no coinciden con la tabla IVADEC-CIF
            </p>
            <p className="mt-0.5 text-sm text-red-900">{validacion.observacion_breve}</p>
          </div>
        )}

        {mrF4 && (
          <div className="rounded-lg border border-[var(--atm-linea)] bg-zinc-50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Movilidad reducida (regla F-4)
              </p>
              <Chip>{mrF4.resultado}</Chip>
            </div>
            <p className="mt-0.5 text-sm text-zinc-700">{mrF4.traza}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ── B. Diagnósticos analizados ──────────────────────────────────────────── */

function TarjetaDiagnostico({ dx }: { dx: DiagnosticoAnalizado }) {
  return (
    <div className="rounded-lg border border-[var(--atm-linea)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--atm-linea)] bg-zinc-50 px-3 py-2">
        <span className="text-sm font-semibold text-zinc-900">
          {dx.texto_literal}
          {dx.codigo_visible && !/no consta/i.test(dx.codigo_visible) && (
            <span className="ml-1.5 font-normal text-zinc-500">{dx.codigo_visible}</span>
          )}
        </span>
        {dx.es_principal_sugerido && <Chip tono="bg-[var(--atm-azul)] text-white ring-[var(--atm-azul)]">Principal sugerido</Chip>}
        {dx.estado_clinico && <Chip>{dx.estado_clinico}</Chip>}
        {dx.candidato_certificable && <Chip>{`Certificable: ${dx.candidato_certificable}`}</Chip>}
      </div>
      <div className="flex flex-col gap-2 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-500">Origen —</span>
          <span className="text-zinc-800">doc: {dx.origen_documental || "—"}</span>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-800">guía: {dx.origen_esperado_guia || "—"}</span>
          {dx.coherencia_origen && <Chip>{dx.coherencia_origen}</Chip>}
          {dx.fuente_tipo && <span className="text-zinc-500">· fuente: {dx.fuente_tipo}</span>}
          {dx.legibilidad && <Chip>{dx.legibilidad}</Chip>}
        </div>

        {dx.impacto_funcional_documentado && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
              Impacto funcional documentado
            </p>
            <p className="mt-0.5 text-sm text-zinc-700">{dx.impacto_funcional_documentado}</p>
          </div>
        )}

        {dx.faltantes_normalizacion?.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
                Falta para normalizar
              </p>
              {dx.normalizacion_estado && <Chip>{dx.normalizacion_estado}</Chip>}
            </div>
            <Lista items={dx.faltantes_normalizacion} tono="falta" />
          </div>
        )}

        {dx.motivo_principal_sugerido && (
          <p className="text-sm italic text-zinc-500">{dx.motivo_principal_sugerido}</p>
        )}
      </div>
    </div>
  );
}

function PanelDiagnosticos({ items }: { items: DiagnosticoAnalizado[] }) {
  return (
    <Panel titulo="Diagnósticos analizados" cuenta={items.length}>
      <div className="flex flex-col gap-3">
        {items.map((dx) => (
          <TarjetaDiagnostico key={dx.id} dx={dx} />
        ))}
      </div>
    </Panel>
  );
}

/* ── C. Brechas según guía clínica ──────────────────────────────────────── */

function TarjetaGuia({ g }: { g: EvaluacionGuiaClinica }) {
  return (
    <div className="rounded-lg border border-[var(--atm-linea)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--atm-linea)] bg-zinc-50 px-3 py-2">
        <span className="text-sm font-semibold text-zinc-900">{g.familia_guia}</span>
        {g.resultado && <Chip>{g.resultado}</Chip>}
        {g.origen_guia && <span className="text-xs text-zinc-500">origen: {g.origen_guia}</span>}
      </div>
      <div className="grid gap-3 px-3 py-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Encontrado en el expediente
          </p>
          <Lista items={g.informacion_encontrada} tono="ok" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Falta para certificar
          </p>
          <Lista items={g.informacion_faltante} tono="falta" />
        </div>
        {(g.profesionales_requeridos?.length > 0 ||
          g.soporte_profesional_encontrado?.length > 0) && (
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
              Profesionales — requeridos vs. presentes
            </p>
            <p className="mt-0.5 text-sm text-zinc-700">
              {(g.profesionales_requeridos ?? []).join(", ") || "—"}
              <span className="text-zinc-400"> → </span>
              {(g.soporte_profesional_encontrado ?? []).join(", ") || "ninguno"}
            </p>
          </div>
        )}
        {g.elementos_rescatar_encontrados?.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
              Elementos a rescatar
            </p>
            <Lista items={g.elementos_rescatar_encontrados} />
          </div>
        )}
        {g.observacion && (
          <p className="text-sm italic text-zinc-500 sm:col-span-2">{g.observacion}</p>
        )}
      </div>
    </div>
  );
}

function PanelGuia({ items }: { items: EvaluacionGuiaClinica[] }) {
  return (
    <Panel titulo="Brechas según guía clínica" cuenta={items.length}>
      <div className="flex flex-col gap-3">
        {items.map((g, i) => (
          <TarjetaGuia key={g.diagnostico_id || i} g={g} />
        ))}
      </div>
    </Panel>
  );
}

/* ── D. Actividades IVADEC-CIF (tabla A/B/C) — el resto del detalle IVADEC va
 *      plegado en el panel "Análisis de esta sección" del bloque IVADEC de la ficha. */

function PanelIvadec({ analisis }: { analisis: AnalisisQA }) {
  const act = analisis.fuentes_duras_calificacion?.ivadec?.actividades_coherencia ?? [];
  if (act.length === 0) return null;

  return (
    <Panel titulo="Actividades IVADEC-CIF (coherencia A / B / C)" cuenta={act.length}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-[var(--atm-linea)] bg-[var(--atm-th)] px-2 py-1.5 text-left font-medium text-white">
                  Código
                </th>
                <th className="border border-[var(--atm-linea)] bg-[var(--atm-th)] px-2 py-1.5 text-left font-medium text-white">
                  Actividad
                </th>
                <th className="border border-[var(--atm-linea)] bg-[var(--atm-th)] px-2 py-1.5 text-center font-medium text-white">
                  A
                </th>
                <th className="border border-[var(--atm-linea)] bg-[var(--atm-th)] px-2 py-1.5 text-center font-medium text-white">
                  B
                </th>
                <th className="border border-[var(--atm-linea)] bg-[var(--atm-th)] px-2 py-1.5 text-center font-medium text-white">
                  C
                </th>
              </tr>
            </thead>
            <tbody>
              {act.map((r, i) => {
                const incoherente = r.a !== null && r.b !== null && r.a !== r.b;
                return (
                  <tr key={r.codigo || i} className={incoherente ? "bg-amber-50" : undefined}>
                    <td className="border border-[var(--atm-linea)] px-2 py-1.5 font-mono text-xs text-zinc-700">
                      {r.codigo}
                    </td>
                    <td className="border border-[var(--atm-linea)] px-2 py-1.5 text-zinc-800">
                      {r.actividad}
                    </td>
                    <td className="border border-[var(--atm-linea)] px-2 py-1.5 text-center">
                      {r.a ?? "—"}
                    </td>
                    <td className="border border-[var(--atm-linea)] px-2 py-1.5 text-center">
                      {r.b ?? "—"}
                    </td>
                    <td className="border border-[var(--atm-linea)] px-2 py-1.5 text-center">
                      {r.c ?? "—"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-zinc-400">
          Filas resaltadas: A ≠ B (posible incoherencia entre capacidad y desempeño).
        </p>
      </div>
    </Panel>
  );
}

/* ── contenedor ─────────────────────────────────────────────────────────── */

export function ObservacionesAnalisis({ analisis }: { analisis: AnalisisQA }) {
  const diagnosticos = analisis.analisis_diagnosticos ?? [];
  const guia = analisis.evaluacion_guia_clinica ?? [];
  const validacion = analisis.validacion_ivadec_cif;

  const hayAlertas =
    !!analisis.metadata_informe?.estado_analisis ||
    !!analisis.metadata_informe?.requiere_revision_humana ||
    (analisis.carga_cerofilas?.alertas_carga?.length ?? 0) > 0 ||
    !!analisis.reglas_deterministicas?.mr_f4 ||
    (!!validacion?.porcentaje_consta && validacion?.coincide_con_expediente === false);

  // Si no hay ningún bloque de detalle, no mostramos la sección.
  const hayContenido =
    hayAlertas ||
    diagnosticos.length > 0 ||
    guia.length > 0 ||
    (analisis.fuentes_duras_calificacion?.ivadec?.actividades_coherencia?.length ?? 0) > 0;

  if (!hayContenido) return null;

  return (
    <details
      open
      className="group overflow-hidden rounded-xl border border-[var(--atm-linea)] bg-white"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 hover:bg-zinc-50 group-open:border-b group-open:border-[var(--atm-linea)]">
        <div className="min-w-0">
          <h2 className="border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
            OBSERVACIONES DEL ANÁLISIS
          </h2>
          <p className="mt-1 pl-3 text-xs text-zinc-500">
            Lectura estructurada del expediente: diagnósticos identificados, brechas de
            información según la guía clínica y alertas encontradas en la documentación. La ficha
            de arriba reproduce los documentos; esto los organiza y contrasta.
          </p>
        </div>
        <span className="mt-0.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <PanelAlertas analisis={analisis} />
      {diagnosticos.length > 0 && <PanelDiagnosticos items={diagnosticos} />}
      {guia.length > 0 && <PanelGuia items={guia} />}
      <PanelIvadec analisis={analisis} />
    </details>
  );
}
