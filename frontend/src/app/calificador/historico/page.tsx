"use client";

import Link from "next/link";
import { useSesion } from "@/components/SesionProvider";
import { useCasos } from "@/components/CasosProvider";
import { CalificadorHeader } from "@/components/CalificadorHeader";
import { formatearFecha } from "@/lib/fechas";

export default function HistoricoPage() {
  const { sesion } = useSesion();
  const { casos, cargando } = useCasos();

  const misCasosCalificados = casos
    .filter((c) => c.calificadorAsignadoId === sesion.id && c.estadoCalificacion === "CALIFICADO")
    .sort((a, b) => (b.fechaCalificacion ?? "").localeCompare(a.fechaCalificacion ?? ""));

  return (
    <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
      <CalificadorHeader />

      <main className="flex-1 px-6 py-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">
          {misCasosCalificados.length} caso{misCasosCalificados.length === 1 ? "" : "s"} ya calificado
          {misCasosCalificados.length === 1 ? "" : "s"}
        </h2>

        {cargando ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : misCasosCalificados.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no has calificado ningún caso.</p>
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
                {misCasosCalificados.map((c) => (
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
      </main>
    </div>
  );
}
