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
    <div className="flex flex-1 flex-col bg-white">
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
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">ID Trámite</th>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">% IVADEC final</th>
                  <th className="px-4 py-2 font-medium">Modificado</th>
                  <th className="px-4 py-2 font-medium">Fecha calificación</th>
                  <th className="px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {misCasosCalificados.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-zinc-700">{c.idTramite}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.nombreCompleto}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.propuesta.porcentajeFinal}%</td>
                    <td className="px-4 py-3">
                      {c.propuesta.modificadoPorCalificador ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Sí
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatearFecha(c.fechaCalificacion)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/calificador/casos/${c.id}`}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        Ver
                      </Link>
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
