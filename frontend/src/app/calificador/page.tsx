"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/components/SesionProvider";
import { useCasos } from "@/components/CasosProvider";
import { CalificadorHeader } from "@/components/CalificadorHeader";
import { type EstadoChecklist } from "@/data/casos";
import { formatearFecha } from "@/lib/fechas";

/** El calificador nunca ve NO_APTO (regla no negociable), así que el filtro de estado
 *  solo ofrece los dos que sí le puede tocar revisar, más "todos" para no filtrar. */
type FiltroEstado = "TODOS" | "APTO" | "REQUIERE_REVISION";
type TamanoPagina = 20 | 50 | "TODOS";

const OPCIONES_PAGINA: TamanoPagina[] = [20, 50, "TODOS"];

const badgeEstado: Record<EstadoChecklist, string> = {
  APTO: "bg-emerald-50 text-emerald-700",
  REQUIERE_REVISION: "bg-amber-50 text-amber-700",
  NO_APTO: "bg-red-50 text-red-700",
};

const labelEstado: Record<EstadoChecklist, string> = {
  APTO: "Apto",
  REQUIERE_REVISION: "Requiere revisión",
  NO_APTO: "No apto",
};

export default function CalificadorPage() {
  const { sesion } = useSesion();
  const { casos, cargando, error } = useCasos();
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [busquedaId, setBusquedaId] = useState("");
  const [tamanoPagina, setTamanoPagina] = useState<TamanoPagina>(20);
  const [pagina, setPagina] = useState(1);

  // Un calificador solo ve APTO y REQUIERE_REVISION, nunca NO_APTO, y solo lo que aún no calificó.
  const misCasosPendientes = casos.filter(
    (c) =>
      c.calificadorAsignadoId === sesion.id &&
      c.estadoChecklist !== "NO_APTO" &&
      c.estadoCalificacion === "PENDIENTE"
  );

  const porEstado =
    filtroEstado === "TODOS"
      ? misCasosPendientes
      : misCasosPendientes.filter((c) => c.estadoChecklist === filtroEstado);

  const casosFiltrados = busquedaId.trim()
    ? porEstado.filter((c) => c.idTramite.includes(busquedaId.trim()))
    : porEstado;

  const totalPaginas =
    tamanoPagina === "TODOS" ? 1 : Math.max(1, Math.ceil(casosFiltrados.length / tamanoPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const casosPagina = useMemo(() => {
    if (tamanoPagina === "TODOS") return casosFiltrados;
    const inicio = (paginaActual - 1) * tamanoPagina;
    return casosFiltrados.slice(inicio, inicio + tamanoPagina);
  }, [casosFiltrados, tamanoPagina, paginaActual]);

  function cambiarFiltroEstado(nuevo: FiltroEstado) {
    setFiltroEstado(nuevo);
    setPagina(1);
  }

  function cambiarBusquedaId(nuevo: string) {
    setBusquedaId(nuevo);
    setPagina(1);
  }

  function cambiarTamanoPagina(nuevo: TamanoPagina) {
    setTamanoPagina(nuevo);
    setPagina(1);
  }

  return (
    <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
      <CalificadorHeader />

      <main className="flex-1 px-6 py-6">
        {cargando && <p className="text-sm text-zinc-500">Cargando casos...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!cargando && !error && (
        <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-500">
            {casosFiltrados.length} caso{casosFiltrados.length === 1 ? "" : "s"} pendiente
            {casosFiltrados.length === 1 ? "" : "s"} de revisión
            {filtroEstado !== "TODOS" && ` (de ${misCasosPendientes.length} en total)`}
          </h2>

          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5 text-zinc-500">
              Buscar ID
              <input
                type="text"
                value={busquedaId}
                onChange={(e) => cambiarBusquedaId(e.target.value)}
                placeholder="ID Trámite"
                className="w-32 rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-zinc-500">
              Estado
              <select
                value={filtroEstado}
                onChange={(e) => cambiarFiltroEstado(e.target.value as FiltroEstado)}
                className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
              >
                <option value="TODOS">Todos</option>
                <option value="APTO">Apto</option>
                <option value="REQUIERE_REVISION">Requiere revisión</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-zinc-500">
              Mostrar
              <select
                value={tamanoPagina}
                onChange={(e) =>
                  cambiarTamanoPagina(e.target.value === "TODOS" ? "TODOS" : (Number(e.target.value) as TamanoPagina))
                }
                className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
              >
                {OPCIONES_PAGINA.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion === "TODOS" ? "Todos" : opcion}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {casosFiltrados.length === 0 ? (
          <p className="text-sm text-zinc-500">No tienes casos pendientes por ahora.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--atm-linea)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--atm-th)] text-white">
                <tr>
                  <th className="px-4 py-2 font-medium">ID Trámite</th>
                  <th className="px-4 py-2 font-medium">Región</th>
                  <th className="px-4 py-2 font-medium">RUT</th>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">% IVADEC</th>
                  <th className="px-4 py-2 font-medium">Propuesta sugerida</th>
                  <th className="px-4 py-2 font-medium">Asignado</th>
                  <th className="px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {casosPagina.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-zinc-700">{c.idTramite}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.region}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.rut}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.nombreCompleto}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeEstado[c.estadoChecklist]}`}>
                        {labelEstado[c.estadoChecklist]}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {c.porcentajeIvadecDocumento !== null ? `${c.porcentajeIvadecDocumento}%` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {c.propuesta.porcentajeIvadecIA !== null ? `${c.propuesta.porcentajeIvadecIA}%` : "—"}
                      {c.gradoMotor ? <span className="ml-1 text-xs text-zinc-400">{c.gradoMotor}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatearFecha(c.fechaAsignacion)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/calificador/casos/${c.id}`}
                        className="rounded-lg bg-[var(--atm-azul)] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Revisar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tamanoPagina !== "TODOS" && casosFiltrados.length > tamanoPagina && (
          <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
            <p>
              Mostrando {(paginaActual - 1) * tamanoPagina + 1}–
              {Math.min(paginaActual * tamanoPagina, casosFiltrados.length)} de {casosFiltrados.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="rounded-lg border border-[var(--atm-linea)] px-2.5 py-1 text-zinc-700 hover:bg-blue-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="rounded-lg border border-[var(--atm-linea)] px-2.5 py-1 text-zinc-700 hover:bg-blue-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
