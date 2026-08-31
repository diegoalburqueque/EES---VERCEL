"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSesion } from "@/components/SesionProvider";
import { useCasos } from "@/components/CasosProvider";
import { CalificadorHeader } from "@/components/CalificadorHeader";
import { FichaEditable, PantallaCerofilas } from "@/components/FichaEditable";
import {
  TablaComparativaIdis,
  PanelResolucion,
  ResolucionRegistrada,
  type CajaResolucion,
} from "@/components/ResolucionCalificador";
import { DocumentosExpediente } from "@/components/DocumentosExpediente";
import { ObservacionesAnalisis } from "@/components/ObservacionesAnalisis";
import { useRevisionTracker } from "@/components/useRevisionTracker";
import { formatearFecha } from "@/lib/fechas";

export default function DetalleCasoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sesion } = useSesion();
  const { casos, cargando, cargarDetalleCaso, marcarSubidoCerofilas } = useCasos();
  // "Modificar propuesta" es el único botón de edición: cuando está abierto, la ficha entra en
  // modo editable y al guardar la resolución se persisten juntos ficha + decisión.
  const [caja, setCaja] = useState<CajaResolucion>("ninguna");
  // Tras ratificar o modificar, se muestra la pantalla de "copiar y pegar en CeroFilas" en vez
  // de navegar directo — el calificador ya terminó de calificar, ahora tiene que subirlo.
  const [mostrarCerofilas, setMostrarCerofilas] = useState(false);
  const [subiendoCerofilas, setSubiendoCerofilas] = useState(false);
  // Desde el histórico, "Ver CeroFilas" enlaza con ?cerofilas=1 para reabrir esta misma
  // pantalla en un caso ya resuelto (si no, solo se veía una vez, justo al resolver).
  const verCerofilasDesdeUrl = searchParams.get("cerofilas") === "1";

  const caso = casos.find((c) => c.id === id);

  // Al abrir el caso, pide su detalle real: si el analysis.json del bot todavía no está
  // cacheado en la base, /api/casos/[id] lo trae de Drive y lo guarda para la próxima vez.
  useEffect(() => {
    if (id) cargarDetalleCaso(id);
  }, [id, cargarDetalleCaso]);

  // Métricas de productividad (Revisión 13): mide el tiempo de revisión mientras el
  // calificador tiene abierto un caso propio y sin resolver. No corre en el histórico,
  // ni sobre la pantalla de CeroFilas, ni sobre casos ajenos / NO_APTO.
  const revisionActiva =
    !!caso &&
    caso.calificadorAsignadoId === sesion.id &&
    caso.estadoChecklist !== "NO_APTO" &&
    caso.estadoCalificacion !== "CALIFICADO" &&
    searchParams.get("cerofilas") !== "1";
  useRevisionTracker(caso?.id, revisionActiva);

  if (cargando) {
    return (
      <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
        <CalificadorHeader />
        <main className="flex-1 px-6 py-6">
          <p className="text-sm text-zinc-500">Cargando caso...</p>
        </main>
      </div>
    );
  }

  if (!caso || caso.calificadorAsignadoId !== sesion.id || caso.estadoChecklist === "NO_APTO") {
    return (
      <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
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

  const yaCalificado = caso.estadoCalificacion === "CALIFICADO";
  const { propuesta } = caso;
  const mostrarPantallaCerofilas = mostrarCerofilas || (verCerofilasDesdeUrl && yaCalificado);
  // Vuelve a donde tenga sentido: si entró desde el histórico, de vuelta al histórico; si
  // recién terminó de calificar, a "Mis casos" (ya no está pendiente ahí).
  const rutaVolverCerofilas = verCerofilasDesdeUrl ? "/calificador/historico" : "/calificador";

  // Ocupa el lado izquierdo de la barra que despliega los datos del usuario.
  const encabezadoCaso = (
    <div className="min-w-0 border-l-4 border-[var(--atm-azul2)] pl-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold text-zinc-900">Propuesta de calificación</h1>
        {yaCalificado && (
          <>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Calificado el {formatearFecha(caso.fechaCalificacion)}
              {propuesta.porcentajeFinal !== null && ` · ${propuesta.porcentajeFinal}%`}
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

  async function manejarYaLoSubi() {
    setSubiendoCerofilas(true);
    try {
      await marcarSubidoCerofilas(caso!.id);
      router.push(rutaVolverCerofilas);
    } finally {
      setSubiendoCerofilas(false);
    }
  }

  if (mostrarPantallaCerofilas) {
    return (
      <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
        <CalificadorHeader />
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-[1100px]">
            {caso.analisis ? (
              <PantallaCerofilas
                analisis={caso.analisis}
                casoId={caso.id}
                subiendo={subiendoCerofilas}
                onYaLoSubi={manejarYaLoSubi}
                onVolver={() => router.push(rutaVolverCerofilas)}
                porcentajeFinal={propuesta.porcentajeFinal}
                modificado={propuesta.modificadoPorCalificador}
                calificadorNombre={caso.resolucion?.calificadorNombre ?? caso.calificadorNombre ?? null}
                calificadorProfesion={caso.resolucion?.calificadorProfesion ?? null}
                fichaEditada={caso.fichaEditada}
                resolucion={caso.resolucion}
              />
            ) : (
              <div className="rounded-xl border border-[var(--atm-linea)] bg-white p-5">
                <p className="text-sm text-zinc-500">
                  Trámite {caso.idTramite} resuelto. No hay ficha QA para generar el texto de CeroFilas —
                  revisa el trámite directo en CeroFilas.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(rutaVolverCerofilas)}
                  className="mt-4 rounded-lg bg-[var(--atm-azul)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Volver a página principal
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[var(--atm-fondo)]">
      <CalificadorHeader />

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-[1100px]">
          <Link href={yaCalificado ? "/calificador/historico" : "/calificador"} className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Volver
          </Link>
        </div>

        <div className="mx-auto mt-4 flex max-w-[1100px] flex-col gap-4">
          {/* A. Identificación del trámite + B/C/E lo trae FichaEditable por bloques */}
          <div className="rounded-xl border border-[var(--atm-linea)] bg-white">
            {caso.analisis ? (
              <FichaEditable
                analisis={caso.analisis}
                casoId={caso.id}
                editable={caja === "modificar" && !yaCalificado}
                encabezadoCaso={encabezadoCaso}
                documentos={propuesta.documentos}
                fichaEditada={caso.fichaEditada}
              />
            ) : (
              <>
                <div className="border-b border-[var(--atm-linea)] px-5 py-4">{encabezadoCaso}</div>
                <div className="border-b border-[var(--atm-linea)] px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
                    Documentos del expediente
                  </p>
                  <DocumentosExpediente documentos={propuesta.documentos} />
                </div>
                <div className="border-b border-[var(--atm-linea)] px-5 py-4 text-sm">
                  <p className="mb-1 text-zinc-400">Fundamento</p>
                  <p className="text-zinc-700">
                    {propuesta.fundamento || "Sin ficha QA disponible para este trámite."}
                  </p>
                </div>
              </>
            )}


            {caja === "modificar" && !yaCalificado && (
              <p className="border-t border-[var(--atm-linea)] bg-blue-50 px-5 py-2 text-xs text-[var(--atm-azul)]">
                Edición activa. Los cambios se guardan al confirmar la resolución en
                &quot;Guardar resolución&quot;, más abajo.
              </p>
            )}
          </div>

          {/* C-bis. Observaciones del análisis — bloques de detalle del analysis.json ampliado */}
          {caso.analisis && <ObservacionesAnalisis analisis={caso.analisis} />}

          {/* D. Propuesta de calificación sugerida — tabla comparativa IVADEC vs propuesta (vs Calificador si ya resuelto) */}
          <div className="rounded-xl border border-[var(--atm-linea)] bg-white px-5 py-4">
            <h2 className="mb-3 border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
              Propuesta de calificación sugerida
            </h2>
            <TablaComparativaIdis caso={caso} />
          </div>

          {/* F. Tu resolución */}
          <div className="rounded-xl border border-[var(--atm-linea)] bg-white">
            {yaCalificado ? (
              <ResolucionRegistrada caso={caso} />
            ) : (
              <PanelResolucion
                caso={caso}
                caja={caja}
                setCaja={setCaja}
                onResuelto={() => setMostrarCerofilas(true)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
