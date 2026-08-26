"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/components/SesionProvider";
import { useCasos } from "@/components/CasosProvider";
import { CalificadorHeader } from "@/components/CalificadorHeader";
import { formatearFecha } from "@/lib/fechas";
import type { Caso } from "@/data/casos";

/** En el histórico todos los casos ya están calificados, así que el filtro "de estado" que en
 *  "Mis casos" es APTO/REQUIERE_REVISION acá filtra por la resolución (la columna que se muestra). */
type FiltroResolucion = "TODAS" | "RATIFICADO" | "MODIFICADO" | "DEVUELTO";
type TamanoPagina = 20 | 50 | "TODOS";

const OPCIONES_PAGINA: TamanoPagina[] = [20, 50, "TODOS"];

/** Misma derivación que el badge de la columna "Resolución". */
function resolucionDe(c: Caso): Exclude<FiltroResolucion, "TODAS"> {
  if (c.resolucion?.decision === "NO_EVALUABLE") return "DEVUELTO";
  if (c.propuesta.modificadoPorCalificador) return "MODIFICADO";
  return "RATIFICADO";
}

export default function HistoricoPage() {
  const { sesion } = useSesion();
  const { casos, cargando, error } = useCasos();

  const [busquedaId, setBusquedaId] = useState("");
  const [filtroResolucion, setFiltroResolucion] = useState<FiltroResolucion>("TODAS");
  const [tamanoPagina, setTamanoPagina] = useState<TamanoPagina>(20);
  const [pagina, setPagina] = useState(1);

  const misCasosCalificados = useMemo(
    () =>
      casos
        .filter((c) => c.calificadorAsignadoId === sesion.id && c.estadoCalificacion === "CALIFICADO")
        .sort((a, b) => (b.fechaCalificacion ?? "").localeCompare(a.fechaCalificacion ?? "")),
    [casos, sesion.id]
  );

  const porResolucion =
    filtroResolucion === "TODAS"
      ? misCasosCalificados
      : misCasosCalificados.filter((c) => resolucionDe(c) === filtroResolucion);

  const casosFiltrados = busquedaId.trim()
    ? porResolucion.filter((c) => c.idTramite.includes(busquedaId.trim()))
    : porResolucion;

  const totalPaginas =
    tamanoPagina === "TODOS" ? 1 : Math.max(1, Math.ceil(casosFiltrados.length / tamanoPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const casosPagina = useMemo(() => {
    if (tamanoPagina === "TODOS") return casosFiltrados;
    const inicio = (paginaActual - 1) * tamanoPagina;
    return casosFiltrados.slice(inicio, inicio + tamanoPagina);
  }, [casosFiltrados, tamanoPagina, paginaActual]);

  function cambiarBusquedaId(nuevo: string) {
    setBusquedaId(nuevo);
    setPagina(1);
  }

  function cambiarFiltroResolucion(nuevo: FiltroResolucion) {
    setFiltroResolucion(nuevo);
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
        {cargando && <p className="text-sm text-zinc-500">Cargando...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!cargando && !error && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-zinc-500">
                {casosFiltrados.length} caso{casosFiltrados.length === 1 ? "" : "s"} ya calificado
                {casosFiltrados.length === 1 ? "" : "s"}
                {filtroResolucion !== "TODAS" && ` (de ${misCasosCalificados.length} en total)`}
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
                  Resolución
                  <select
                    value={filtroResolucion}
                    onChange={(e) => cambiarFiltroResolucion(e.target.value as FiltroResolucion)}
                    className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="RATIFICADO">Ratificado</option>
                    <option value="MODIFICADO">Modificado</option>
                    <option value="DEVUELTO">Devuelto</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-zinc-500">
                  Mostrar
                  <select
                    value={tamanoPagina}
                    onChange={(e) =>
                      cambiarTamanoPagina(
                        e.target.value === "TODOS" ? "TODOS" : (Number(e.target.value) as TamanoPagina)
                      )
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
              <p className="text-sm text-zinc-500">
                {misCasosCalificados.length === 0
                  ? "Aún no has calificado ningún caso."
                  : "Ningún caso coincide con el filtro."}
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--atm-linea)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--atm-th)] text-white">
                    <tr>
                      <th className="px-4 py-2 font-medium">ID Trámite</th>
                      <th className="px-4 py-2 font-medium">Nombre</th>
                      <th className="px-4 py-2 font-medium">Resolución</th>
                      <th className="px-4 py-2 font-medium">% final</th>
                      <th className="px-4 py-2 font-medium">Fecha</th>
                      <th className="px-4 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {casosPagina.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-mono text-zinc-700">{c.idTramite}</td>
                        <td className="px-4 py-3 text-zinc-700">{c.nombreCompleto}</td>
                        <td className="px-4 py-3">
                          {c.resolucion?.decision === "NO_EVALUABLE" ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              Devuelto
                            </span>
                          ) : c.propuesta.modificadoPorCalificador ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Modificado
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Ratificado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {c.propuesta.porcentajeFinal !== null ? `${c.propuesta.porcentajeFinal}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{formatearFecha(c.fechaCalificacion)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link
                              href={`/calificador/casos/${c.id}`}
                              className="rounded-lg border border-[var(--atm-azul2)] px-2.5 py-1 text-xs font-medium text-[var(--atm-azul)] hover:bg-blue-50"
                            >
                              Ver
                            </Link>
                            {/* No evaluable no emite documento, no hay nada que pegar en CeroFilas. */}
                            {c.resolucion?.decision !== "NO_EVALUABLE" && (
                              <Link
                                href={`/calificador/casos/${c.id}?cerofilas=1`}
                                className="rounded-lg border border-[var(--atm-linea)] px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Ver CeroFilas
                              </Link>
                            )}
                          </div>
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
