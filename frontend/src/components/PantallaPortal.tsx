"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { AnalisisQA, DiagnosticoPortal } from "@/data/analisis";
import type { ResolucionCalificador } from "@/data/casos";
import { profesionParaFirma } from "@/lib/profesion-firma"; // NOMBRE_GENERO
import {
  BotonCopiar,
  clavePorCaso,
  construirBloques,
  hayDato,
  texto,
  textoAntecedentesSociales,
  textoObservacionesCerofilas,
  textoPropuestaSugerida,
} from "@/components/FichaEditable";

/**
 * Réplica del formulario "Propuesta de Calificación de Discapacidad" del portal
 * (app-discapacidad.milicenciamedica.cl): misma disposición, mismos rótulos y mismos controles
 * (buscadores, selectores, casillas, fecha, plazo, porcentaje y tres textos), para que el
 * calificador reconozca de inmediato dónde pegar cada cosa. Los controles muestran lo que
 * SUGIERE la plataforma (ficha corregida por el calificador + su resolución); cada campo trae
 * su botón Copiar. Reemplaza a PantallaCerofilas.
 *
 * "Notas para la Certificación" lleva la propuesta de calificación (porcentaje, orígenes,
 * fundamento, MR y REEV). Los antecedentes complementarios NO van acá: se ven al calificar.
 * "Fecha desde" no la propone el motor: queda vacía para que la elija el calificador.
 */

const AZUL = "#0f69c9";

const ORIGENES_PORTAL = [
  "Físico",
  "Mental Intelectual",
  "Mental Psíquico",
  "Sensorial Visual",
  "Sensorial Auditivo",
];

const DOCUMENTOS_CHECKLIST: ["cedula" | "ibf" | "isra" | "ivadec", string][] = [
  ["cedula", "Carnet de Identidad"],
  ["ibf", "Informe Biomédico"],
  ["isra", "Informe Social"],
  ["ivadec", "Informe de desempeño (IVADEC)"],
];

const MOTIVO_CHECKLIST: Record<string, string> = {
  NO_CUMPLE: "No cumple",
  NO_VERIFICABLE: "No verificable",
};

function sinTildes(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** "32.1 %" / "32,1%" / 32.1 → "32,1" (el portal usa coma decimal). */
function porcentajeParaPortal(valor: string): string {
  const numero = valor.replace("%", "").replace(",", ".").trim();
  return numero ? numero.replace(".", ",") : "";
}

/** Plazo de reevaluación → años, o null si no hay plazo. */
function plazoDesdeReev(reev: string | null | undefined): number | null {
  const m = /(\d+)_ANOS|(\d+)\s*A[ÑN]OS/i.exec(reev ?? "");
  return m ? Number(m[1] ?? m[2]) : null;
}

/** Separa "A; B" / saltos de línea en diagnósticos individuales. */
function listaDiagnosticos(valor: string): string[] {
  return valor
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter((x) => hayDato(x));
}

/* ── piezas con el aspecto del portal ───────────────────────────────────────────────────────── */

function Etiqueta({ children, obligatorio = false, copiar }: { children: ReactNode; obligatorio?: boolean; copiar?: string }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <label className="text-[13px] font-semibold text-zinc-900">
        {children}
        {obligatorio && <span className="ml-1 text-red-600">*</span>}
      </label>
      {copiar && hayDato(copiar) && <BotonCopiar obtenerTexto={() => copiar} />}
    </div>
  );
}

const CONTROL = "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800";

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-zinc-600" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SelectPortal({ valor, placeholder }: { valor: string; placeholder: string }) {
  return (
    <div className={`${CONTROL} flex items-center justify-between`}>
      <span className={hayDato(valor) ? "" : "text-zinc-400"}>{hayDato(valor) ? valor : placeholder}</span>
      <Chevron />
    </div>
  );
}

function Ayuda({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11px] text-zinc-500">{children}</p>;
}

interface ItemDiagnostico {
  /** Lo que se muestra (con código del portal cuando el bot lo encontró). */
  etiqueta: string;
  /** Lo que se copia: el código si lo hay (se pega en el buscador del portal), si no el texto. */
  copiar: string;
  estado: "COINCIDENCIA" | "PROBABLE" | "SIN_COINCIDENCIA" | "SIN_CODIGO";
  candidatos?: string;
}

/**
 * Diagnósticos con su código del catálogo del portal. Usa el bloque `diagnosticos_portal` del
 * bot SOLO si el calificador no cambió el texto del diagnóstico; si lo editó, vale lo suyo.
 */
function itemsDiagnostico(valor: string, portal: DiagnosticoPortal[]): ItemDiagnostico[] {
  const textos = listaDiagnosticos(valor);
  return textos.map((texto) => {
    const hallado = portal.find((p) => sinTildes(p.texto) === sinTildes(texto));
    if (!hallado || hallado.estado === "SIN_COINCIDENCIA" || hallado.codigo === null) {
      return {
        etiqueta: texto,
        copiar: texto,
        estado: hallado ? "SIN_COINCIDENCIA" : "SIN_CODIGO",
        candidatos: hallado?.candidatos.length
          ? hallado.candidatos.slice(0, 3).map((c) => `${c.codigo} — ${c.nombre}`).join(" · ")
          : undefined,
      };
    }
    return {
      etiqueta: `${hallado.codigo} — ${hallado.nombre_portal ?? texto}`,
      copiar: String(hallado.codigo),
      estado: hallado.estado,
      candidatos:
        hallado.estado === "PROBABLE"
          ? hallado.candidatos.slice(1, 4).map((c) => `${c.codigo} — ${c.nombre}`).join(" · ") || undefined
          : undefined,
    };
  });
}

function BuscadorDiagnosticos({
  etiqueta,
  obligatorio,
  items,
  vacio,
}: {
  etiqueta: string;
  obligatorio?: boolean;
  items: ItemDiagnostico[];
  vacio: string;
}) {
  return (
    <div>
      <Etiqueta obligatorio={obligatorio} copiar={items.map((d) => d.copiar).join("\n")}>
        {etiqueta}
      </Etiqueta>
      <div className={`${CONTROL} flex items-center gap-2 text-zinc-400`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-zinc-500" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Buscar por código o nombre (ej: &apos;1257&apos; o &apos;sarcoma&apos;)
      </div>
      <div className="mt-2 flex min-h-[44px] flex-col items-stretch justify-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        {items.length === 0 ? (
          <p className="text-center">{vacio}</p>
        ) : (
          items.map((d) => (
            <div key={d.etiqueta} className="flex flex-col gap-1">
              <span
                className={`w-fit rounded-full border bg-white px-3 py-1 text-sm text-zinc-800 ${
                  d.estado === "PROBABLE"
                    ? "border-amber-400"
                    : d.estado === "COINCIDENCIA"
                      ? "border-emerald-400"
                      : "border-dashed border-zinc-400"
                }`}
              >
                {d.etiqueta}
              </span>
              {d.estado === "PROBABLE" && (
                <span className="text-[11px] text-amber-700">
                  Código probable: confírmalo en el buscador del portal.{d.candidatos ? ` Otras opciones: ${d.candidatos}` : ""}
                </span>
              )}
              {(d.estado === "SIN_COINCIDENCIA" || d.estado === "SIN_CODIGO") && (
                <span className="text-[11px] text-zinc-500">
                  {d.estado === "SIN_COINCIDENCIA"
                    ? `Sin código seguro en el catálogo: búscalo por nombre.${d.candidatos ? ` Parecidos: ${d.candidatos}` : ""}`
                    : "Sin código asignado por el bot: búscalo por nombre en el portal."}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Pestanas({
  opciones,
  activa,
  onCambiar,
  grande = false,
}: {
  opciones: [string, string][];
  activa: string;
  onCambiar: (clave: string) => void;
  grande?: boolean;
}) {
  return (
    <div className="flex border-b border-zinc-300">
      {opciones.map(([clave, titulo]) => {
        const esActiva = clave === activa;
        return (
          <button
            key={clave}
            type="button"
            onClick={() => onCambiar(clave)}
            style={esActiva ? { color: AZUL, borderBottomColor: AZUL } : undefined}
            className={`-mb-px flex-1 border-b-[3px] px-4 text-center ${grande ? "py-3 text-sm" : "py-2.5 text-[13px]"} ${
              esActiva ? "font-semibold" : "border-transparent text-zinc-700 hover:text-zinc-900"
            }`}
          >
            {titulo}
          </button>
        );
      })}
    </div>
  );
}

export function PantallaPortal({
  analisis,
  casoId,
  subiendo,
  onYaLoSubi,
  onVolver,
  porcentajeFinal = null,
  modificado = false,
  calificadorNombre = null,
  calificadorProfesion = null,
  fichaEditada = null,
  resolucion = null,
}: {
  analisis: AnalisisQA;
  casoId: string;
  subiendo: boolean;
  onYaLoSubi: () => void;
  onVolver: () => void;
  porcentajeFinal?: number | null;
  modificado?: boolean;
  calificadorNombre?: string | null;
  calificadorProfesion?: string | null;
  fichaEditada?: Record<string, string> | null;
  resolucion?: ResolucionCalificador | null;
}) {
  const [pestana, setPestana] = useState<"admisible" | "falta">("admisible");
  const bloques = useMemo(() => construirBloques(analisis), [analisis]);

  // Lo que el calificador dejó, con prioridad: análisis original → snapshot de la BD
  // (ficha_editada) → localStorage (lo más reciente de este navegador, si existe).
  const valores = useMemo(() => {
    const base: Record<string, string> = {};
    for (const b of bloques) for (const campo of b.campos) base[campo.id] = campo.valor;
    let resultado = { ...base, ...(fichaEditada ?? {}) };
    try {
      const guardado = localStorage.getItem(clavePorCaso(casoId));
      if (guardado) resultado = { ...resultado, ...JSON.parse(guardado) };
    } catch {
      // Sin storage disponible: se usa lo anterior.
    }
    if (modificado && porcentajeFinal !== null) {
      resultado = { ...resultado, cf_porcentaje: String(porcentajeFinal) };
    }
    return resultado;
  }, [bloques, casoId, modificado, porcentajeFinal, fichaEditada]);

  const textoObservaciones = useMemo(
    () =>
      textoObservacionesCerofilas(
        bloques,
        valores,
        analisis,
        resolucion,
        porcentajeFinal,
        calificadorNombre,
        calificadorProfesion
      ),
    [bloques, valores, analisis, resolucion, porcentajeFinal, calificadorNombre, calificadorProfesion]
  );

  const v = (id: string) => (valores[id] ?? "").trim();
  const origenPrincipal = ORIGENES_PORTAL.find((o) => sinTildes(o) === sinTildes(v("cf_origen_principal")));
  const secundariosTexto = sinTildes(v("cf_origenes_secundarios"));
  const origenesSecundarios = ORIGENES_PORTAL.filter((o) => secundariosTexto.includes(sinTildes(o)));
  const movilidad = sinTildes(v("cf_movilidad_reducida"));
  const movilidadPortal = movilidad.startsWith("si")
    ? "CON MOVILIDAD REDUCIDA"
    : movilidad === "no"
      ? "SIN MOVILIDAD REDUCIDA"
      : "";
  const reev = resolucion?.reevFinal ?? null;
  const plazo = reev ? plazoDesdeReev(reev) : plazoDesdeReev(v("prop_reev"));
  const sinReevaluacion = reev ? reev === "NO" : sinTildes(v("prop_reev")) === "no";
  const porcentaje = porcentajeParaPortal(porcentajeFinal !== null ? String(porcentajeFinal) : v("cf_porcentaje"));
  const antecedentes = textoAntecedentesSociales(valores);
  const notasCertificacion = textoPropuestaSugerida(bloques, valores, resolucion, porcentajeFinal);
  const firmaProfesion = profesionParaFirma(calificadorNombre, calificadorProfesion);
  const dxPortal = analisis.diagnosticos_portal;
  const itemsPrincipal = itemsDiagnostico(
    v("cf_diagnostico_principal"),
    dxPortal?.principal ? [dxPortal.principal] : []
  );
  const itemsSecundarios = itemsDiagnostico(v("cf_diagnosticos_secundarios"), dxPortal?.secundarios ?? []);

  const textoTodo = () =>
    [
      `Diagnóstico(s) principal(es) a certificar: ${itemsPrincipal.map((d) => d.etiqueta).join("; ")}`,
      `Diagnóstico(s) secundario(s) a certificar: ${itemsSecundarios.map((d) => d.etiqueta).join("; ")}`,
      `Origen principal de la discapacidad: ${origenPrincipal ?? v("cf_origen_principal")}`,
      `Orígenes secundarios: ${origenesSecundarios.join(", ") || "Sin Origen Secundario"}`,
      `Movilidad reducida: ${movilidadPortal}`,
      `Plazo (años): ${sinReevaluacion ? "Sin Reevaluación" : (plazo ?? "")}`,
      `Porcentaje de propuesta de discapacidad: ${porcentaje}`,
      `Antecedentes sociales relevantes:\n${antecedentes}`,
      `Observaciones datos relevantes de Calificación:\n${textoObservaciones}`,
      `Notas para la Certificación de Discapacidad: ${notasCertificacion}`,
    ].join("\n\n");

  const observados = DOCUMENTOS_CHECKLIST.map(([clave, nombre]) => ({
    nombre,
    resultado: analisis.checklist_admisibilidad_rm[clave].resultado,
    observacion: texto(analisis.checklist_admisibilidad_rm[clave].observacion),
  })).filter((d) => d.resultado !== "CUMPLE");

  const areaTexto = (etiqueta: string, valor: string, filas: number) => (
    <div>
      <Etiqueta obligatorio copiar={valor}>
        {etiqueta}
      </Etiqueta>
      <textarea
        readOnly
        value={valor}
        rows={filas}
        placeholder="Respuesta escrita"
        className={`${CONTROL} resize-y leading-relaxed`}
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-[var(--atm-linea)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--atm-linea)] px-5 py-4">
        <h2 className="border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
          COPIAR Y PEGAR EN EL PORTAL
        </h2>
        <BotonCopiar obtenerTexto={textoTodo} />
      </div>

      <div className="px-5 pt-4">
        <Pestanas
          grande
          opciones={[
            ["admisible", "Admisible"],
            ["falta", "Falta Información"],
          ]}
          activa={pestana}
          onCambiar={(c) => setPestana(c as "admisible" | "falta")}
        />
      </div>

      {pestana === "admisible" ? (
        <div className="px-5 py-4">
          <div className="rounded-xl border border-zinc-200 bg-white px-5 pb-5 pt-2 shadow-sm">
            <Pestanas
              opciones={[["calificacion", "Calificación De Discapacidad"]]}
              activa="calificacion"
              onCambiar={() => undefined}
            />

            {(

              <div className="pt-6">
                <h3 className="mb-6 font-serif text-[22px] text-zinc-900">Propuesta de Calificación de Discapacidad</h3>

                <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                  <BuscadorDiagnosticos
                    etiqueta="Diagnóstico(s) principal(es) a certificar"
                    obligatorio
                    items={itemsPrincipal}
                    vacio="No hay diagnósticos principales seleccionados"
                  />
                  <BuscadorDiagnosticos
                    etiqueta="Diagnóstico(s) secundario(s) a certificar"
                    items={itemsSecundarios}
                    vacio="No hay diagnósticos secundarios seleccionados"
                  />

                  <div>
                    <Etiqueta obligatorio copiar={origenPrincipal ?? v("cf_origen_principal")}>
                      Origen principal de la discapacidad
                    </Etiqueta>
                    <SelectPortal valor={origenPrincipal ?? v("cf_origen_principal")} placeholder="Seleccione una opción" />
                  </div>
                  <div>
                    <Etiqueta obligatorio copiar={origenesSecundarios.join(", ") || "Sin Origen Secundario"}>
                      Orígenes secundarios
                    </Etiqueta>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-[13px] text-zinc-800">
                      {[...ORIGENES_PORTAL, "Sin Origen Secundario"].map((o) => {
                        const marcado =
                          o === "Sin Origen Secundario"
                            ? origenesSecundarios.length === 0
                            : origenesSecundarios.includes(o);
                        return (
                          <label key={o} className="flex items-center gap-2">
                            <input type="checkbox" checked={marcado} readOnly disabled style={{ accentColor: AZUL }} />
                            <span className={marcado ? "font-semibold" : ""}>{o}</span>
                          </label>
                        );
                      })}
                    </div>
                    <Ayuda>Selecciona los orígenes secundarios aplicables.</Ayuda>
                  </div>

                  <div>
                    <Etiqueta obligatorio copiar={movilidadPortal}>
                      Movilidad reducida
                    </Etiqueta>
                    <SelectPortal valor={movilidadPortal} placeholder="Seleccione una opción" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                    <div>
                      <Etiqueta obligatorio>Fecha desde</Etiqueta>
                      <div className={`${CONTROL} flex items-center justify-between text-zinc-400`}>
                        dd-mm-aaaa
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-zinc-600" strokeWidth="2">
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                      </div>
                      <Ayuda>Seleccione una fecha de reevaluación base.</Ayuda>
                    </div>
                    <div>
                      <Etiqueta copiar={plazo !== null && !sinReevaluacion ? String(plazo) : ""}>Plazo (años)</Etiqueta>
                      <SelectPortal
                        valor={plazo !== null && !sinReevaluacion ? String(plazo) : ""}
                        placeholder="Seleccionar"
                      />
                      <Ayuda>Seleccione la cantidad de años de plazo.</Ayuda>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 text-[13px] text-zinc-800">
                        <input type="checkbox" checked={sinReevaluacion} readOnly disabled style={{ accentColor: AZUL }} />
                        Sin Reevaluación
                      </label>
                      <Ayuda>Ingrese fecha de reevaluación o marque la casilla si no aplica</Ayuda>
                    </div>
                  </div>

                  <div>
                    <Etiqueta obligatorio copiar={porcentaje}>
                      Porcentaje de propuesta de discapacidad
                    </Etiqueta>
                    <input readOnly value={porcentaje} className={CONTROL} />
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-5">
                  {areaTexto("Antecedentes sociales relevantes", antecedentes, 6)}
                  {areaTexto("Observaciones datos relevantes de Calificación", textoObservaciones, 12)}
                  {areaTexto("Notas para la Certificación de Discapacidad", notasCertificacion, 8)}
                </div>

                {calificadorNombre && (
                  <p className="mt-4 text-xs text-zinc-500">
                    Revisado por {calificadorNombre}
                    {firmaProfesion ? ` · ${firmaProfesion}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-6 shadow-sm">
            {observados.length === 0 ? (
              <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                El checklist del motor no observó ningún documento: no hay nada que informar como faltante.
              </p>
            ) : (
              <div className="flex flex-col gap-8">
                {observados.map((d) => (
                  <div key={d.nombre} className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                    <div>
                      <Etiqueta obligatorio copiar={d.nombre}>
                        Documento a observar
                      </Etiqueta>
                      <SelectPortal valor={d.nombre} placeholder="Seleccione documento" />
                    </div>
                    <div>
                      <Etiqueta obligatorio copiar={MOTIVO_CHECKLIST[d.resultado] ?? d.resultado}>
                        Motivo de observación
                      </Etiqueta>
                      <SelectPortal valor={MOTIVO_CHECKLIST[d.resultado] ?? d.resultado} placeholder="Seleccione motivo" />
                    </div>
                    <div className="md:col-span-2">
                      <Etiqueta obligatorio copiar={d.observacion}>
                        Descripción falta de información
                      </Etiqueta>
                      <textarea
                        readOnly
                        value={d.observacion}
                        rows={4}
                        placeholder="Escriba aquí el detalle de la información faltante..."
                        className={`${CONTROL} resize-y leading-relaxed`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[var(--atm-linea)] px-5 py-4">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg border border-[var(--atm-linea)] px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Volver a página principal
        </button>
        <button
          type="button"
          onClick={onYaLoSubi}
          disabled={subiendo}
          className="rounded-lg bg-[var(--atm-azul)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {subiendo ? "Guardando..." : "Ya lo subí al portal"}
        </button>
      </div>
    </div>
  );
}
