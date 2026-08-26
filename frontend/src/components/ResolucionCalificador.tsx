"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCasos } from "@/components/CasosProvider";
import { leerValoresGuardados } from "@/components/FichaEditable";
import { Modal } from "@/components/Modal";
import type { Caso, ReevaluacionFinal } from "@/data/casos";
import { TABLA_IDIS, MOTIVOS_MODIFICACION, CAUSAS_NO_EVALUABLE, OPCIONES_REEV } from "@/data/resolucion-catalogos";

/** Celda "No disponible" en rojo en vez de un guion gris — un dato ausente debe llamar la
 *  atención del calificador, no perderse como si fuera un valor normal. */
function CeldaOVacio({ valor }: { valor: string | number | null | undefined }) {
  if (valor === null || valor === undefined || valor === "") {
    return <span className="font-medium text-red-600">No disponible</span>;
  }
  return <>{valor}</>;
}

const ETIQUETA_DIRECCION: Record<string, string> = {
  SE_MANTIENE: "Se mantiene",
  SE_AUMENTA: "Aumenta",
  SE_DISMINUYE: "Disminuye",
};

const ESTILO_DIRECCION: Record<string, string> = {
  SE_MANTIENE: "bg-emerald-50 text-emerald-700",
  SE_AUMENTA: "bg-amber-50 text-amber-700",
  SE_DISMINUYE: "bg-red-50 text-red-700",
};

function ChipDireccion({ direccion }: { direccion: string | null }) {
  if (!direccion) return <CeldaOVacio valor={null} />;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO_DIRECCION[direccion] ?? "bg-zinc-100 text-zinc-600"}`}>
      {ETIQUETA_DIRECCION[direccion] ?? direccion}
    </span>
  );
}

const AVISO_DIRECCION: Record<string, { verbo: string; icono: string; estilo: string }> = {
  SE_AUMENTA: { verbo: "aumentar", icono: "▲", estilo: "border-amber-300 bg-amber-50 text-amber-900" },
  SE_MANTIENE: { verbo: "mantener", icono: "=", estilo: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  SE_DISMINUYE: { verbo: "disminuir", icono: "▼", estilo: "border-red-300 bg-red-50 text-red-900" },
};

/** Mensaje de orientación para el calificador (antes de resolver): qué implica la propuesta
 *  sugerida respecto del IVADEC-CIF original — subir / mantener / bajar el porcentaje, con el
 *  salto de grado si lo hay. */
function AvisoDireccionSugerida({ caso }: { caso: Caso }) {
  const dir = caso.direccionSugerida;
  if (!dir) return null;
  const t = AVISO_DIRECCION[dir];
  const desde = caso.porcentajeIvadecDocumento;
  const hasta = caso.propuesta.porcentajeIvadecIA;
  const hayRango = desde !== null && hasta !== null;
  const gradoCambia =
    !!caso.gradoIvadec &&
    !!caso.gradoMotor &&
    caso.gradoIvadec.trim().toUpperCase() !== caso.gradoMotor.trim().toUpperCase();

  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${t.estilo}`}>
      <span aria-hidden className="mt-0.5 text-xs font-bold">{t.icono}</span>
      <div>
        <p>
          {dir === "SE_MANTIENE" ? (
            <>
              La propuesta <span className="font-semibold">mantiene</span> el porcentaje del IVADEC-CIF
              {hayRango && ` (${desde}%)`}
            </>
          ) : (
            <>
              La propuesta sugiere <span className="font-semibold">{t.verbo}</span> el porcentaje respecto del
              IVADEC-CIF{hayRango && `: ${desde}% → ${hasta}%`}
            </>
          )}
        </p>
        {gradoCambia && (
          <p className="mt-0.5 text-xs">
            Grado: {caso.gradoIvadec} → {caso.gradoMotor}
          </p>
        )}
      </div>
    </div>
  );
}

/** Tabla comparativa IVADEC vs Motor (vs Calificador cuando ya está resuelto). */
export function TablaComparativaIdis({ caso }: { caso: Caso }) {
  const resuelto = caso.estadoCalificacion === "CALIFICADO" && caso.resolucion;
  return (
    <>
    <div className="overflow-hidden rounded-lg border border-[var(--atm-linea)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--atm-th)] text-white">
          <tr>
            <th className="px-3 py-2 font-medium"></th>
            <th className="px-3 py-2 font-medium">IDIS</th>
            <th className="px-3 py-2 font-medium">Porcentaje</th>
            <th className="px-3 py-2 font-medium">Grado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          <tr>
            <th className="px-3 py-2 font-medium text-zinc-500">Según IVADEC-CIF</th>
            <td className="px-3 py-2 text-zinc-700"><CeldaOVacio valor={caso.idisIvadec} /></td>
            <td className="px-3 py-2 text-zinc-700">
              <CeldaOVacio valor={caso.porcentajeIvadecDocumento !== null ? `${caso.porcentajeIvadecDocumento}%` : null} />
            </td>
            <td className="px-3 py-2 text-zinc-700"><CeldaOVacio valor={caso.gradoIvadec} /></td>
          </tr>
          <tr>
            <th className="px-3 py-2 font-medium text-zinc-500">Propuesta de calificación sugerida</th>
            <td className="px-3 py-2 font-semibold text-zinc-900"><CeldaOVacio valor={caso.idisMotor} /></td>
            <td className="px-3 py-2 font-semibold text-zinc-900">
              <CeldaOVacio
                valor={caso.propuesta.porcentajeIvadecIA !== null ? `${caso.propuesta.porcentajeIvadecIA}%` : null}
              />
            </td>
            <td className="px-3 py-2 font-semibold text-zinc-900"><CeldaOVacio valor={caso.gradoMotor} /></td>
          </tr>
          {resuelto && caso.resolucion && (
            <tr className="bg-zinc-50">
              <th className="px-3 py-2 font-medium text-zinc-500">Calificador</th>
              <td className="px-3 py-2 font-semibold text-zinc-900"><CeldaOVacio valor={caso.resolucion.idisFinal} /></td>
              <td className="px-3 py-2 font-semibold text-zinc-900">
                <CeldaOVacio valor={caso.propuesta.porcentajeFinal !== null ? `${caso.propuesta.porcentajeFinal}%` : null} />
              </td>
              <td className="px-3 py-2 font-semibold text-zinc-900"><CeldaOVacio valor={caso.resolucion.gradoFinal} /></td>
            </tr>
          )}
        </tbody>
      </table>
      {resuelto && caso.resolucion?.direccion && (
        <div className="flex items-center gap-2 border-t border-[var(--atm-linea)] bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
          Dirección respecto del IVADEC: <ChipDireccion direccion={caso.resolucion.direccion} />
        </div>
      )}
    </div>
    {!resuelto && <AvisoDireccionSugerida caso={caso} />}
    </>
  );
}

const CAUSAS_POR_FAMILIA = CAUSAS_NO_EVALUABLE.reduce<Record<string, typeof CAUSAS_NO_EVALUABLE>>((acc, causa) => {
  const familia = causa.familia ?? "Otros";
  (acc[familia] ??= []).push(causa);
  return acc;
}, {});

export type CajaResolucion = "ninguna" | "modificar" | "no-evaluable";

/**
 * Panel "Tu resolución": MR/REEV + los 3 botones + cajas condicionales de Modificar/No evaluable.
 *
 * `caja`/`setCaja` vienen controlados desde la página del caso porque "Modificar propuesta"
 * absorbió al viejo botón "Editar campos de la ficha": cuando `caja === "modificar"`, la página
 * pone `FichaEditable` en modo edición — un solo botón, una sola resolución que guarda ficha +
 * decisión juntos.
 */
export function PanelResolucion({
  caso,
  caja,
  setCaja,
  onResuelto,
}: {
  caso: Caso;
  caja: CajaResolucion;
  setCaja: (caja: CajaResolucion) => void;
  /** Ratificar o modificar terminan aquí en vez de navegar — la página muestra PantallaCerofilas.
   *  "No evaluable" no la llama: no hay nada que pegar en CeroFilas, navega directo. */
  onResuelto: () => void;
}) {
  const router = useRouter();
  const { confirmarPropuesta, modificarYCalificar, declararNoEvaluable, guardarFicha } = useCasos();

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Qué confirmación mostrar antes de ejecutar la acción — reemplaza a window.confirm(). */
  const [confirmando, setConfirmando] = useState<"ninguna" | "ratificar" | "no-evaluable">("ninguna");

  // Precarga con lo que propuso el motor (propuesta_calificacion_fundada.movilidad_reducida_propuesta).
  const mrPropuesta = /^S/i.test(caso.analisis?.propuesta_calificacion_fundada.movilidad_reducida_propuesta ?? "");
  const [mr, setMr] = useState<boolean>(mrPropuesta);

  // Precarga REEV con lo que propuso el motor si el texto matchea una de las 5 opciones válidas.
  const reevPropuesta = OPCIONES_REEV.find(
    (o) =>
      o.etiqueta.replace(/\s/g, "") ===
      (caso.analisis?.propuesta_calificacion_fundada.reevaluacion_propuesta ?? "").toUpperCase().replace(/\s/g, "")
  )?.valor;
  const [reev, setReev] = useState<ReevaluacionFinal>(reevPropuesta ?? "NO");

  const [pct, setPct] = useState<number | "">("");
  const [motivoCodigo, setMotivoCodigo] = useState("");
  const [fundamento, setFundamento] = useState("");

  const [causaCodigo, setCausaCodigo] = useState("");
  const [detalle, setDetalle] = useState("");

  const direccionPreview =
    pct !== "" && caso.porcentajeIvadecDocumento !== null
      ? pct === caso.porcentajeIvadecDocumento
        ? "SE MANTIENE"
        : pct > caso.porcentajeIvadecDocumento
          ? "SE AUMENTA"
          : "SE DISMINUYE"
      : null;

  async function ratificar() {
    setConfirmando("ninguna");
    setGuardando(true);
    setError(null);
    try {
      // Aunque ratifique, si tocó algún campo de la ficha se persiste en casos.ficha_editada —
      // así el histórico (que lee de la BD, no de localStorage) muestra lo que dejó.
      const valoresEditados = leerValoresGuardados(caso.id);
      if (valoresEditados) await guardarFicha(caso.id, valoresEditados);
      await confirmarPropuesta(caso.id, mr, reev);
      onResuelto();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ratificar el caso.");
      setGuardando(false);
    }
  }

  async function guardarModificacion() {
    if (pct === "") {
      setError("Selecciona el porcentaje que corresponde.");
      return;
    }
    if (!motivoCodigo) {
      setError("Selecciona el motivo por el que no aceptas la propuesta.");
      return;
    }
    if (fundamento.trim().length < 20) {
      setError("Explica el motivo por escrito (mínimo 20 caracteres).");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      // "Modificar propuesta" absorbió a "Editar campos de la ficha": si el calificador corrigió
      // algún campo de texto mientras esta caja estaba abierta, se guarda primero como parte de
      // la misma acción — si el % fallara después, al menos las correcciones de texto ya quedaron.
      const valoresEditados = leerValoresGuardados(caso.id);
      if (valoresEditados) await guardarFicha(caso.id, valoresEditados);
      await modificarYCalificar(caso.id, { porcentajeFinal: pct, motivoCodigo, fundamento, mr, reev });
      onResuelto();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la calificación.");
      setGuardando(false);
    }
  }

  /** Valida y recién ahí pide confirmación — evita abrir el modal para un formulario incompleto. */
  function intentarNoEvaluable() {
    if (!causaCodigo) {
      setError("Selecciona la causa por la que el caso no se puede evaluar.");
      return;
    }
    if (detalle.trim().length < 20) {
      setError("Describe qué impide evaluarlo (mínimo 20 caracteres).");
      return;
    }
    setError(null);
    setConfirmando("no-evaluable");
  }

  async function guardarNoEvaluable() {
    setConfirmando("ninguna");
    setGuardando(true);
    setError(null);
    try {
      await declararNoEvaluable(caso.id, { causaCodigo, detalle });
      router.push("/calificador");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo declarar el caso no evaluable.");
      setGuardando(false);
    }
  }

  return (
    <div className="border-t border-[var(--atm-linea)] px-5 py-4">
      <h2 className="mb-3 border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">Tu resolución</h2>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Movilidad reducida (MR) que va en la propuesta</span>
          <select
            value={mr ? "SI" : "NO"}
            onChange={(e) => setMr(e.target.value === "SI")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
          >
            <option value="SI">SÍ</option>
            <option value="NO">NO</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Reevaluación (REEV)</span>
          <select
            value={reev}
            onChange={(e) => setReev(e.target.value as ReevaluacionFinal)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
          >
            {OPCIONES_REEV.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-lg border-2 border-blue-200 bg-zinc-50 p-4">
        <p className="mb-3 text-sm text-zinc-700">
          Ya hay una propuesta de calificación sugerida. Si estás de acuerdo,{" "}
          <span className="font-semibold">ratifica</span> y el documento se emite tal cual. Si no,{" "}
          <span className="font-semibold">modifica</span> lo que corresponda y fundaméntalo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirmando("ratificar")}
            disabled={guardando || caja !== "ninguna"}
            title={caja !== "ninguna" ? "Cancela la modificación en curso para poder ratificar." : undefined}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Ratificar propuesta"}
          </button>
          <button
            type="button"
            onClick={() => setCaja(caja === "modificar" ? "ninguna" : "modificar")}
            disabled={guardando || caja === "no-evaluable"}
            className="rounded-lg border-2 border-amber-700 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            Modificar propuesta
          </button>
          <button
            type="button"
            onClick={() => setCaja(caja === "no-evaluable" ? "ninguna" : "no-evaluable")}
            disabled={guardando || caja === "modificar"}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
          >
            El caso no se puede evaluar
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Usa la última solo cuando el expediente no permita pronunciarse. No es un rechazo: el caso va a revisión
          administrativa.
        </p>
      </div>

      {caja === "modificar" && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--atm-linea)] p-4">
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-[var(--atm-azul)]">
            La ficha de arriba ya está en modo edición — corrige ahí lo que corresponda (diagnóstico,
            antecedentes, etc.). Al guardar esta resolución se guardan también esos cambios.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">¿Por qué no aceptas la propuesta? (obligatorio)</span>
            <select
              value={motivoCodigo}
              onChange={(e) => setMotivoCodigo(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
            >
              <option value="">— selecciona el motivo —</option>
              {MOTIVOS_MODIFICACION.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.codigo} · {m.texto}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Porcentaje que corresponde (solo valores válidos de la tabla oficial)</span>
            <select
              value={pct}
              onChange={(e) => setPct(e.target.value === "" ? "" : Number(e.target.value))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
            >
              <option value="">— selecciona —</option>
              {TABLA_IDIS.map((v) => (
                <option key={v.porcentaje} value={v.porcentaje}>
                  {v.porcentaje}% · IDIS {v.idis} · {v.grado}
                </option>
              ))}
            </select>
          </label>

          {direccionPreview && (
            <p className="text-xs text-zinc-500">
              Dirección resultante: <span className="font-semibold">{direccionPreview}</span> respecto del IVADEC
              {caso.porcentajeIvadecDocumento !== null && ` (${caso.porcentajeIvadecDocumento}% → ${pct}%)`}
            </p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Explica el motivo (obligatorio)</span>
            <textarea
              value={fundamento}
              onChange={(e) => setFundamento(e.target.value)}
              placeholder="Qué antecedente del expediente sustenta un porcentaje distinto al propuesto."
              rows={4}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardarModificacion}
              disabled={guardando}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Ratificar / Guardar resolución"}
            </button>
            <button
              type="button"
              onClick={() => setCaja("ninguna")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {caja === "no-evaluable" && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--atm-linea)] p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">¿Por qué no se puede evaluar? (obligatorio)</span>
            <select
              value={causaCodigo}
              onChange={(e) => setCausaCodigo(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
            >
              <option value="">— selecciona la causa —</option>
              {Object.entries(CAUSAS_POR_FAMILIA).map(([familia, causas]) => (
                <optgroup key={familia} label={familia}>
                  {causas.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} · {c.texto}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Describe qué falta o qué impide evaluarlo (obligatorio)</span>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Qué documento falta, qué está ilegible, qué no corresponde."
              rows={4}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={intentarNoEvaluable}
              disabled={guardando}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Declarar no evaluable"}
            </button>
            <button
              type="button"
              onClick={() => setCaja("ninguna")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {confirmando === "ratificar" && (
        <Modal titulo="Confirmar ratificación" onCerrar={() => setConfirmando("ninguna")}>
          <p className="text-sm text-zinc-700">
            Vas a ratificar la propuesta de calificación sugerida y cerrar el trámite{" "}
            <span className="font-semibold">{caso.idTramite}</span>. El documento se emite tal cual, sin
            cambios.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmando("ninguna")}
              className="rounded-lg border border-[var(--atm-linea)] px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Seguir calificando
            </button>
            <button
              type="button"
              onClick={ratificar}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Sí, ratificar
            </button>
          </div>
        </Modal>
      )}

      {confirmando === "no-evaluable" && (
        <Modal titulo="Confirmar caso no evaluable" onCerrar={() => setConfirmando("ninguna")}>
          <p className="text-sm text-zinc-700">
            Vas a declarar el trámite <span className="font-semibold">{caso.idTramite}</span> como{" "}
            <span className="font-semibold">NO EVALUABLE</span>. No se emite documento y el caso pasa a
            revisión administrativa.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmando("ninguna")}
              className="rounded-lg border border-[var(--atm-linea)] px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Seguir calificando
            </button>
            <button
              type="button"
              onClick={guardarNoEvaluable}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Sí, declarar no evaluable
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Caso ya resuelto: muestra la resolución registrada en modo lectura, sin botones activos. */
export function ResolucionRegistrada({ caso }: { caso: Caso }) {
  const r = caso.resolucion;
  if (!r) return null;

  const etiquetaDecision =
    r.decision === "ACEPTA" ? "RATIFICADO" : r.decision === "MODIFICA" ? "MODIFICADO" : "NO EVALUABLE";

  return (
    <div className="border-t border-[var(--atm-linea)] px-5 py-4">
      <h2 className="mb-3 border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
        Resolución registrada
      </h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-zinc-400">Decisión</p>
          <p className="font-semibold text-zinc-900">{etiquetaDecision}</p>
        </div>
        {r.decision !== "NO_EVALUABLE" && (
          <>
            <div>
              <p className="text-xs text-zinc-400">MR final / REEV final</p>
              <p className="text-zinc-800">
                {r.mrFinal === null ? "—" : r.mrFinal ? "SÍ" : "NO"} · {r.reevFinal ?? "—"}
              </p>
            </div>
          </>
        )}
        {r.decision === "MODIFICA" && (
          <div className="col-span-2">
            <p className="text-xs text-zinc-400">Motivo</p>
            <p className="text-zinc-800">
              {MOTIVOS_MODIFICACION.find((m) => m.codigo === r.motivoCodigo)?.texto ?? r.motivoCodigo}
            </p>
          </div>
        )}
        {r.decision === "NO_EVALUABLE" && (
          <div className="col-span-2">
            <p className="text-xs text-zinc-400">Causa</p>
            <p className="text-zinc-800">
              {CAUSAS_NO_EVALUABLE.find((c) => c.codigo === r.causaCodigo)?.texto ?? r.causaCodigo}
            </p>
          </div>
        )}
        {r.explicacion && (
          <div className="col-span-2">
            <p className="text-xs text-zinc-400">{r.decision === "NO_EVALUABLE" ? "Detalle" : "Fundamento"}</p>
            <p className="whitespace-pre-line text-zinc-800">{r.explicacion}</p>
          </div>
        )}
        {r.calificadorNombre && (
          <div className="col-span-2 border-t border-[var(--atm-linea)] pt-3">
            <p className="text-xs text-zinc-400">Calificado por</p>
            <p className="font-semibold text-zinc-900">{r.calificadorNombre}</p>
            <p className="text-zinc-500">{r.calificadorProfesion ?? "Profesión no registrada"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
