"use client";

import type {
  AnalisisQA,
  DiagnosticoAnalizado,
  EvaluacionGuiaClinica,
} from "@/data/analisis";

/**
 * "OBSERVACIONES DEL ANÁLISIS" — bloques del `analysis.json` ampliado que la ficha no usa:
 * análisis por diagnóstico, brechas según guía clínica, actividades IVADEC-CIF y alertas.
 * Cada sección se muestra solo si el dato viene; si no hay ninguno, no renderiza nada.
 */

/* ── piezas de presentación ──────────────────────────────────────────────── */

type Tono = "ok" | "obs" | "mal" | "neutro";

const TONO_TAG: Record<Tono, string> = {
  ok: "border-[var(--atm-ok)] text-[var(--atm-ok)]",
  obs: "border-[var(--atm-obs)] text-[var(--atm-obs)]",
  mal: "border-[var(--atm-mal)] text-[var(--atm-mal)]",
  neutro: "border-[var(--atm-linea)] text-zinc-600",
};

const TONO_POR_VALOR: Record<string, Tono> = {
  COHERENTE: "ok", CONFIRMADO: "ok", COMPLETA: "ok", LEGIBLE: "ok", SI: "ok",
  COMPLETO: "ok", CUMPLE: "ok", SUFICIENTE: "ok",
  REQUIERE_REVISION: "obs", INCOMPLETA: "obs", PARCIAL: "obs", NO_DETERMINADO: "obs",
  ANTECEDENTE: "obs", MENOR_REQUIERE_REVISION: "obs", NO_VERIFICABLE: "obs",
  NO: "mal", NO_APTO: "mal", NO_CUMPLE: "mal", DIVERGENTE: "mal",
};

function tonoDe(v: string): Tono {
  return TONO_POR_VALOR[v.toUpperCase().replace(/\s+/g, "_")] ?? "neutro";
}

function Tag({ children, tono }: { children: string; tono?: Tono }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[3px] border bg-white px-1.5 py-[1px] text-[10.5px] font-semibold uppercase tracking-wide ${
        TONO_TAG[tono ?? tonoDe(children)]
      }`}
    >
      {children.replace(/_/g, " ")}
    </span>
  );
}

/** Rótulo de campo — estilo formulario oficial. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
      {children}
    </p>
  );
}

/** Lista de ítems con guion; nada si viene vacía. */
function Lista({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug text-zinc-700">
          <span className="text-zinc-400">–</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Sección — encabezado con el estilo estándar del sistema (barra azul + versalita). */
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
      <h3 className="mb-3 border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
        {titulo}
        {cuenta !== undefined && <span className="ml-1.5 font-normal text-zinc-400">({cuenta})</span>}
      </h3>
      {children}
    </section>
  );
}

/** Tarjeta interna con franja de encabezado — sobria, sin pasteles. */
function Tarjeta({
  encabezado,
  tags,
  children,
}: {
  encabezado: React.ReactNode;
  tags?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[4px] border border-[var(--atm-linea)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--atm-linea)] bg-[var(--atm-fondo)] px-3 py-2">
        <span className="text-sm font-semibold text-zinc-900">{encabezado}</span>
        {tags}
      </div>
      <div className="flex flex-col gap-2.5 px-3 py-3">{children}</div>
    </div>
  );
}

/* ── A. Alertas y estado ─────────────────────────────────────────────────── */

function Aviso({ titulo, tono, children }: { titulo: string; tono: "obs" | "mal" | "neutro"; children: React.ReactNode }) {
  const borde = tono === "mal" ? "border-l-[var(--atm-mal)]" : tono === "obs" ? "border-l-[var(--atm-obs)]" : "border-l-zinc-400";
  return (
    <div className={`border border-[var(--atm-linea)] border-l-2 ${borde} px-3 py-2`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">{titulo}</p>
      <div className="mt-1 text-sm text-zinc-700">{children}</div>
    </div>
  );
}

function PanelAlertas({ analisis }: { analisis: AnalisisQA }) {
  const meta = analisis.metadata_informe;
  const cerofilas = analisis.carga_cerofilas;
  const validacion = analisis.validacion_ivadec_cif;
  const mrF4 = analisis.reglas_deterministicas?.mr_f4;
  const alertas = cerofilas?.alertas_carga ?? [];
  const noCoincideIvadec =
    validacion && validacion.porcentaje_consta && validacion.coincide_con_expediente === false;

  if (!meta?.estado_analisis && !meta?.requiere_revision_humana && alertas.length === 0 && !noCoincideIvadec && !mrF4)
    return null;

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
            <Tag tono={meta.estado_analisis === "OK" ? "ok" : "obs"}>
              {estadoTexto[meta.estado_analisis] ?? meta.estado_analisis}
            </Tag>
          )}
          {analisis.checklist_admisibilidad_rm?.resultado_general && (
            <Tag tono={tonoDe(analisis.checklist_admisibilidad_rm.resultado_general)}>
              {`Admisibilidad ${analisis.checklist_admisibilidad_rm.resultado_general}`}
            </Tag>
          )}
          <Tag tono={cerofilas?.apto_para_revision ? "ok" : "mal"}>
            {cerofilas?.apto_para_revision ? "Apto para revisión" : "No apto para revisión"}
          </Tag>
          {meta?.requiere_revision_humana && <Tag tono="obs">Requiere revisión humana</Tag>}
        </div>

        {alertas.length > 0 && (
          <Aviso titulo={`Alertas de carga (${alertas.length})`} tono="obs">
            <ul className="flex flex-col gap-1">
              {alertas.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-zinc-400">–</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </Aviso>
        )}

        {noCoincideIvadec && (
          <Aviso titulo="IDIS / grado no coinciden con la tabla IVADEC-CIF" tono="mal">
            {validacion.observacion_breve}
          </Aviso>
        )}

        {mrF4 && (
          <Aviso titulo={`Movilidad reducida — regla F-4 · ${mrF4.resultado}`} tono="neutro">
            {mrF4.traza}
          </Aviso>
        )}
      </div>
    </Panel>
  );
}

/* ── B. Diagnósticos analizados ──────────────────────────────────────────── */

function TarjetaDiagnostico({ dx }: { dx: DiagnosticoAnalizado }) {
  const codigo = dx.codigo_visible && !/no consta/i.test(dx.codigo_visible) ? dx.codigo_visible : null;
  return (
    <Tarjeta
      encabezado={
        <>
          {dx.texto_literal}
          {codigo && <span className="ml-1.5 font-normal text-zinc-500">{codigo}</span>}
        </>
      }
      tags={
        <>
          {dx.es_principal_sugerido && (
            <span className="inline-flex items-center rounded-[3px] bg-[var(--atm-azul)] px-1.5 py-[1px] text-[10.5px] font-semibold uppercase tracking-wide text-white">
              Principal sugerido
            </span>
          )}
          {dx.estado_clinico && <Tag>{dx.estado_clinico}</Tag>}
          {dx.candidato_certificable && <Tag>{`Certificable ${dx.candidato_certificable}`}</Tag>}
        </>
      }
    >
      <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <Rotulo>Origen documental</Rotulo>
          <p className="text-zinc-800">{dx.origen_documental || "—"}</p>
        </div>
        <div>
          <Rotulo>Origen esperado (guía)</Rotulo>
          <p className="flex items-center gap-1.5 text-zinc-800">
            {dx.origen_esperado_guia || "—"}
            {dx.coherencia_origen && <Tag>{dx.coherencia_origen}</Tag>}
          </p>
        </div>
        {dx.fuente_tipo && (
          <div>
            <Rotulo>Fuente</Rotulo>
            <p className="flex items-center gap-1.5 text-zinc-800">
              {dx.fuente_tipo}
              {dx.legibilidad && <Tag>{dx.legibilidad}</Tag>}
            </p>
          </div>
        )}
      </div>

      {dx.impacto_funcional_documentado && (
        <div>
          <Rotulo>Impacto funcional documentado</Rotulo>
          <p className="mt-0.5 text-sm leading-snug text-zinc-700">{dx.impacto_funcional_documentado}</p>
        </div>
      )}

      {dx.faltantes_normalizacion?.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5">
            <Rotulo>Falta para normalizar</Rotulo>
            {dx.normalizacion_estado && <Tag>{dx.normalizacion_estado}</Tag>}
          </p>
          <Lista items={dx.faltantes_normalizacion} />
        </div>
      )}

      {dx.motivo_principal_sugerido && (
        <p className="border-t border-[var(--atm-linea)] pt-2 text-sm text-zinc-500">
          {dx.motivo_principal_sugerido}
        </p>
      )}
    </Tarjeta>
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
    <Tarjeta
      encabezado={g.familia_guia}
      tags={
        <>
          {g.resultado && <Tag>{g.resultado}</Tag>}
          {g.origen_guia && <span className="text-xs text-zinc-500">Origen: {g.origen_guia}</span>}
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Rotulo>Encontrado en el expediente</Rotulo>
          <Lista items={g.informacion_encontrada} />
        </div>
        <div>
          <Rotulo>Falta para certificar</Rotulo>
          <Lista items={g.informacion_faltante} />
        </div>
      </div>
      {(g.profesionales_requeridos?.length > 0 || g.soporte_profesional_encontrado?.length > 0) && (
        <div>
          <Rotulo>Profesionales — requeridos frente a presentes</Rotulo>
          <p className="mt-0.5 text-sm text-zinc-700">
            {(g.profesionales_requeridos ?? []).join(", ") || "—"}
            <span className="text-zinc-400"> → </span>
            {(g.soporte_profesional_encontrado ?? []).join(", ") || "ninguno"}
          </p>
        </div>
      )}
      {g.elementos_rescatar_encontrados?.length > 0 && (
        <div>
          <Rotulo>Elementos a rescatar</Rotulo>
          <Lista items={g.elementos_rescatar_encontrados} />
        </div>
      )}
      {g.observacion && (
        <p className="border-t border-[var(--atm-linea)] pt-2 text-sm text-zinc-500">{g.observacion}</p>
      )}
    </Tarjeta>
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

/* ── D. Actividades IVADEC-CIF (tabla A/B/C) ─────────────────────────────── */

function PanelIvadec({ analisis }: { analisis: AnalisisQA }) {
  const act = analisis.fuentes_duras_calificacion?.ivadec?.actividades_coherencia ?? [];
  if (act.length === 0) return null;

  return (
    <Panel titulo="Actividades IVADEC-CIF — coherencia A / B / C" cuenta={act.length}>
      <div className="overflow-x-auto rounded-[4px] border border-[var(--atm-linea)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--atm-th)] text-white">
              <th className="px-3 py-1.5 text-left font-medium">Código</th>
              <th className="px-3 py-1.5 text-left font-medium">Actividad</th>
              <th className="w-10 px-2 py-1.5 text-center font-medium">A</th>
              <th className="w-10 px-2 py-1.5 text-center font-medium">B</th>
              <th className="w-10 px-2 py-1.5 text-center font-medium">C</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--atm-linea)]">
            {act.map((r, i) => {
              const incoherente = r.a !== null && r.b !== null && r.a !== r.b;
              return (
                <tr key={r.codigo || i} className={incoherente ? "bg-[var(--atm-fondo)]" : undefined}>
                  <td className="px-3 py-1.5 font-mono text-xs text-zinc-700">{r.codigo}</td>
                  <td className="px-3 py-1.5 text-zinc-800">{r.actividad}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{r.a ?? "—"}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{r.b ?? "—"}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{r.c ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-zinc-400">
        Filas sombreadas: A ≠ B — posible incoherencia entre capacidad y desempeño.
      </p>
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

  const hayContenido =
    hayAlertas ||
    diagnosticos.length > 0 ||
    guia.length > 0 ||
    (analisis.fuentes_duras_calificacion?.ivadec?.actividades_coherencia?.length ?? 0) > 0;

  if (!hayContenido) return null;

  return (
    <details open className="group overflow-hidden rounded-xl border border-[var(--atm-linea)] bg-white">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 hover:bg-[var(--atm-fondo)] group-open:border-b group-open:border-[var(--atm-linea)]">
        <div className="min-w-0">
          <h2 className="border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
            OBSERVACIONES DEL ANÁLISIS
          </h2>
          <p className="mt-1 pl-3 text-xs leading-relaxed text-zinc-500">
            Lectura estructurada del expediente: diagnósticos identificados, brechas de información
            según la guía clínica y alertas de la documentación. La ficha de arriba reproduce los
            documentos; esta sección los organiza y contrasta.
          </p>
        </div>
        <span className="mt-1 shrink-0 text-xs text-zinc-400 transition-transform group-open:rotate-180">▾</span>
      </summary>

      <PanelAlertas analisis={analisis} />
      {diagnosticos.length > 0 && <PanelDiagnosticos items={diagnosticos} />}
      {guia.length > 0 && <PanelGuia items={guia} />}
      <PanelIvadec analisis={analisis} />
    </details>
  );
}
