"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSesion } from "@/components/SesionProvider";
import { useCasos } from "@/components/CasosProvider";
import { CalificadorHeader } from "@/components/CalificadorHeader";
import { FichaEditable, leerPorcentajeFinal, leerValoresGuardados } from "@/components/FichaEditable";
import { formatearFecha } from "@/lib/fechas";

export default function DetalleCasoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sesion } = useSesion();
  const { casos, cargando, confirmarPropuesta, modificarYCalificar, guardarFicha, cargarDetalleCaso } = useCasos();
  const [modoModificar, setModoModificar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const caso = casos.find((c) => c.id === id);

  // Al abrir el caso, pide su detalle real: si el analysis.json del bot todavía no está
  // cacheado en la base, /api/casos/[id] lo trae de Drive y lo guarda para la próxima vez.
  useEffect(() => {
    if (id) cargarDetalleCaso(id);
  }, [id, cargarDetalleCaso]);

  if (cargando) {
    return (
      <div className="flex flex-1 flex-col bg-white">
        <CalificadorHeader />
        <main className="flex-1 px-6 py-6">
          <p className="text-sm text-zinc-500">Cargando caso...</p>
        </main>
      </div>
    );
  }

  if (!caso || caso.calificadorAsignadoId !== sesion.id || caso.estadoChecklist === "NO_APTO") {
    return (
      <div className="flex flex-1 flex-col bg-white">
        <CalificadorHeader />
        <main className="flex-1 px-6 py-6">
          <p className="text-sm text-zinc-500">
            Este caso no existe o no está asignado a tu usuario.{" "}
            <Link href="/calificador" className="font-medium text-zinc-900 underline">
              Volver a mis casos
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const casoId = caso.id;
  const yaCalificado = caso.estadoCalificacion === "CALIFICADO";
  const { propuesta } = caso;

  // Ocupa el lado izquierdo de la barra que despliega los datos del usuario.
  const encabezadoCaso = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold text-zinc-900">Propuesta de calificación</h1>
        {yaCalificado && (
          <>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Calificado el {formatearFecha(caso.fechaCalificacion)} · {propuesta.porcentajeFinal}%
            </span>
            {propuesta.modificadoPorCalificador && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Modificado
              </span>
            )}
          </>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        ID Trámite {caso.idTramite} · {caso.region} · RUT {caso.rut} · {caso.nombreCompleto}
      </p>
    </div>
  );

  function abrirModificar() {
    setModoModificar(true);
  }

  async function guardarModificacion() {
    // El % lo edita el calificador en la casilla de CeroFilas; si no lo tocó (o escribió algo
    // que no es un porcentaje válido), se mantiene el que propuso el motor de EES.
    const valor = leerPorcentajeFinal(casoId) ?? propuesta.porcentajeIvadecIA;
    const valoresEditados = leerValoresGuardados(casoId);
    setGuardando(true);
    setErrorGuardado(null);
    try {
      // La ficha se guarda antes de calificar: si el % falla después, al menos las
      // correcciones de texto que ya hizo el calificador quedan en la base.
      if (valoresEditados) await guardarFicha(casoId, valoresEditados);
      await modificarYCalificar(casoId, valor);
      router.push("/calificador");
    } catch {
      setErrorGuardado("No se pudo guardar la calificación. Intenta de nuevo.");
      setGuardando(false);
    }
  }

  async function confirmar() {
    setGuardando(true);
    setErrorGuardado(null);
    try {
      await confirmarPropuesta(casoId);
      router.push("/calificador");
    } catch {
      setErrorGuardado("No se pudo confirmar el caso. Intenta de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      <CalificadorHeader />

      <main className="flex-1 px-6 py-6">
        <Link href={yaCalificado ? "/calificador/historico" : "/calificador"} className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Volver
        </Link>

        <div className="mt-4 max-w-3xl rounded-xl border border-zinc-200">
          {caso.analisis ? (
            <FichaEditable
              analisis={caso.analisis}
              casoId={caso.id}
              editable={modoModificar && !yaCalificado}
              encabezadoCaso={encabezadoCaso}
            />
          ) : (
            <>
              <div className="border-b border-zinc-200 px-5 py-4">{encabezadoCaso}</div>
              <div className="border-b border-zinc-200 px-5 py-4 text-sm">
                <p className="mb-1 text-zinc-400">Fundamento</p>
                <p className="text-zinc-700">
                  {propuesta.fundamento || "Sin ficha QA disponible para este trámite."}
                </p>
              </div>
            </>
          )}

          {propuesta.documentos.length > 0 && (
            <div className="border-t border-zinc-200 px-5 py-4">
              <p className="mb-2 text-sm text-zinc-400">Documentos</p>
              <ul className="flex flex-col gap-1 text-sm">
                {propuesta.documentos.map((doc) => (
                  <li key={doc.tipo}>
                    <a
                      href={doc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-zinc-900 underline"
                    >
                      {doc.tipo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorGuardado && (
            <p className="border-t border-zinc-200 bg-red-50 px-5 py-2 text-sm text-red-600">{errorGuardado}</p>
          )}

          {!yaCalificado && !modoModificar && (
            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-5 py-4">
              <p className="text-xs text-zinc-400">
                Ficha en solo lectura. Usa &quot;Modificar&quot; para corregir campos.
              </p>
              <div className="flex gap-2">
              <button
                onClick={abrirModificar}
                disabled={guardando}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Modificar
              </button>
              <button
                onClick={confirmar}
                disabled={guardando}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {guardando ? "Confirmando..." : "Confirmar propuesta"}
              </button>
              </div>
            </div>
          )}

          {!yaCalificado && modoModificar && (
            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-5 py-4">
              <p className="text-xs text-zinc-500">
                El % final se toma del campo <span className="font-medium">Porcentaje de discapacidad</span>{" "}
                de la casilla &quot;Copiar y pegar en CeroFilas&quot;.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setModoModificar(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarModificacion}
                  disabled={guardando}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar y calificar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
