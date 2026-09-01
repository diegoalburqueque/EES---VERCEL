"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/components/SesionProvider";
import { useCasos } from "@/components/CasosProvider";
import { CalificadorHeader } from "@/components/CalificadorHeader";
import { formatearFecha } from "@/lib/fechas";
import { descargarCsv, filaDevuelto, detalleDevuelto } from "@/lib/exportar-casos";

type TamanoPagina = 20 | 50 | "TODOS";
const OPCIONES_PAGINA: TamanoPagina[] = [20, 50, "TODOS"];

/**
 * "Devueltos" — los casos que el propio calificador declaró NO EVALUABLE. Al declararlos,
 * cambian de estado a RECHAZADO_CALIFICADOR y pasan a la bandeja de administración; acá el
 * calificador conserva el registro de lo que devolvió, con la causa y su detalle, y lo puede
 * exportar a Excel. Todo sale de `caso.resolucion` — sin endpoint nuevo.
 */
export default function DevueltosCalificadorPage() {
  const { sesion } = useSesion();
  const { casos, cargando, error } = useCasos();

  const [busquedaId, setBusquedaId] = useState("");
  const [tamanoPagina, setTamanoPagina] = useState<TamanoPagina>(20);
  const [pagina, setPagina] = useState(1);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  function alternar(id: string) {
    setExpandidas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  const misDevueltos = useMemo(
    () =>
      casos
        .filter(
          (c) => c.calificadorAsignadoId === sesion.id && c.resolucion?.decision === "NO_EVALUABLE",
        )
        .sort((a, b) => (b.fechaCalificacion ?? "").localeCompare(a.fechaCalificacion ?? "")),
    [casos, sesion.id],
  );

  const casosFiltrados = busquedaId.trim()
    ? misDevueltos.filter((c) => c.idTramite.includes(busquedaId.trim()))
    : misDevueltos;

  const totalPaginas =
    tamanoPagina === "TODOS" ? 1 : Math.max(1, Math.ceil(casosFiltrados.length / tamanoPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const casosPagina = useMemo(() => {
    if (tamanoPagina === "TODOS") return casosFiltrados;
    const inicio = (paginaActual - 1) * tamanoPagina;
    return casosFiltrados.slice(inicio, inicio + tamanoPagina);
  }, [casosFiltrados, tamanoPagina, paginaActual]);

  const fechaHoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
      <CalificadorHeader />

      <main className="flex-1 px-6 py-6">
        {cargando && <p className="text-sm text-zinc-500">Cargando...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!cargando && !error && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-zinc-500">
                  {casosFiltrados.length} caso{casosFiltrados.length === 1 ? "" : "s"} devuelto
                  {casosFiltrados.length === 1 ? "" : "s"} como no evaluable
                </h2>
                <button
                  type="button"
                  onClick={() => casosFiltrados.length && descargarCsv(`devueltos-${fechaHoy}`, casosFiltrados.map(filaDevuelto))}
                  disabled={casosFiltrados.length === 0}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  Exportar todo a Excel
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1.5 text-zinc-500">
                  Buscar ID
                  <input
                    type="text"
                    value={busquedaId}
                    onChange={(e) => { setBusquedaId(e.target.value); setPagina(1); }}
                    placeholder="ID Trámite"
                    className="w-32 rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-zinc-500">
                  Mostrar
                  <select
                    value={tamanoPagina}
                    onChange={(e) => {
                      setTamanoPagina(e.target.value === "TODOS" ? "TODOS" : (Number(e.target.value) as TamanoPagina));
                      setPagina(1);
                    }}
                    className="rounded-lg border border-[var(--atm-linea)] px-2 py-1 text-zinc-700 outline-none focus:border-[var(--atm-azul2)]"
                  >
                    {OPCIONES_PAGINA.map((o) => (
                      <option key={o} value={o}>{o === "TODOS" ? "Todos" : o}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {casosFiltrados.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {misDevueltos.length === 0
                  ? "No has devuelto ningún caso como no evaluable."
                  : "Ningún caso coincide con la búsqueda."}
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--atm-linea)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--atm-th)] text-white">
                    <tr>
                      <th className="px-4 py-2 font-medium">ID Trámite</th>
                      <th className="px-4 py-2 font-medium">Nombre</th>
                      <th className="px-4 py-2 font-medium">Causa</th>
                      <th className="px-4 py-2 font-medium">Fecha</th>
                      <th className="px-4 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {casosPagina.map((c) => {
                      const abierta = expandidas.has(c.id);
                      const dev = detalleDevuelto(c);
                      return (
                        <Fragment key={c.id}>
                          <tr className={abierta ? "bg-[var(--atm-fondo)]" : undefined}>
                            <td className="px-4 py-3 font-mono text-zinc-700">{c.idTramite}</td>
                            <td className="px-4 py-3 text-zinc-700">{c.nombreCompleto}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => alternar(c.id)}
                                className="max-w-[240px] truncate text-left text-xs text-zinc-700 hover:underline"
                                title={dev.detalle}
                              >
                                {dev.causa || dev.codigo || "Sin causa registrada"}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-zinc-500">{formatearFecha(c.fechaCalificacion)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => alternar(c.id)}
                                  className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                                >
                                  {abierta ? "Ocultar" : "Detalle"}
                                </button>
                                <button
                                  onClick={() => descargarCsv(`devuelto-${c.idTramite}`, [filaDevuelto(c)])}
                                  className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                                  title="Exportar este caso a Excel"
                                >
                                  Excel
                                </button>
                                <Link
                                  href={`/calificador/casos/${c.id}`}
                                  className="rounded-lg border border-[var(--atm-azul2)] px-2.5 py-1 text-xs font-medium text-[var(--atm-azul)] hover:bg-blue-50"
                                >
                                  Ver
                                </Link>
                              </div>
                            </td>
                          </tr>
                          {abierta && (
                            <tr className="bg-[var(--atm-fondo)]">
                              <td colSpan={5} className="px-4 pb-4 pt-0">
                                <div className="border border-[var(--atm-linea)] border-l-2 border-l-[var(--atm-azul2)] bg-white px-4 py-3 text-sm">
                                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">Causa</p>
                                      <p className="text-zinc-800">
                                        {dev.causa || "—"} {dev.codigo && <span className="text-zinc-400">({dev.codigo})</span>}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">Fecha de devolución</p>
                                      <p className="text-zinc-800">{dev.fecha || "—"}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">Detalle registrado</p>
                                      <p className="whitespace-pre-line text-zinc-800">{dev.detalle || "—"}</p>
                                    </div>
                                    {c.analisis?.datos_calificacion?.diagnostico_principal && (
                                      <div className="sm:col-span-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atm-gris)]">Diagnóstico principal (propuesta)</p>
                                        <p className="text-zinc-700">{c.analisis.datos_calificacion.diagnostico_principal}</p>
                                      </div>
                                    )}
                                  </div>
                                  <p className="mt-3 border-t border-[var(--atm-linea)] pt-2 text-xs text-zinc-400">
                                    Este caso ya no está en tu bandeja de trabajo: al declararlo no evaluable pasó a administración.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
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
