import {
  buscarGuiaClinica,
  origenDiscrepa,
  evaluarProfesional,
  CRITERIO_GENERAL,
  type CoincidenciaGuia,
} from "@/data/guia-clinica";

/**
 * Fila del manual M3 que corresponde al diagnóstico del caso.
 *
 * Se muestra con las mismas cuatro columnas del documento original —Diagnóstico,
 * Información Requerida, Rescatar y Origen— para que el calificador lea el cuadro tal
 * como lo conoce, pero sin abrir el PDF ni buscar entre todas las filas: aquí sólo
 * aparecen las que aplican a este caso.
 */

function Fila({
  coincidencia,
  origenDelCaso,
  ibfCompletadoPor,
}: {
  coincidencia: CoincidenciaGuia;
  origenDelCaso: string;
  ibfCompletadoPor: string;
}) {
  const { entrada, esPrincipal } = coincidencia;
  const discrepa = esPrincipal && origenDiscrepa(origenDelCaso, entrada.origen);
  const profesional = evaluarProfesional(ibfCompletadoPor, entrada);

  return (
    <tr className="align-top">
      <td className="border border-zinc-300 px-3 py-2">
        <p className="text-sm text-zinc-900">{entrada.diagnostico}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
            esPrincipal ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {esPrincipal ? "Principal" : "Secundario"}
        </span>
      </td>

      <td className="border border-zinc-300 px-3 py-2">
        <p className="text-sm font-semibold text-zinc-900">{entrada.profesional}</p>

        {profesional === "CORRESPONDE" && (
          <p className="mt-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
            ✓ Firma el IBF un profesional idóneo para este diagnóstico:{" "}
            <span className="font-semibold">{ibfCompletadoPor}</span>
          </p>
        )}
        {profesional === "REQUIERE_REVISION" && (
          <p className="mt-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            ⚠ Requiere revisión: el IBF lo firma{" "}
            <span className="font-semibold">{ibfCompletadoPor}</span>, que no corresponde al profesional
            que el manual exige para este diagnóstico.
          </p>
        )}
        {profesional === "NO_VERIFICABLE" && (
          <p className="mt-1 rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
            No verificable: no consta con claridad quién firma el IBF, así que no puede comprobarse la
            idoneidad del profesional.
          </p>
        )}

        <p className="mt-2 text-sm text-zinc-600">{entrada.debeDescribir}</p>
        {entrada.notas && entrada.notas.length > 0 && (
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-600">
            {entrada.notas.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        )}
      </td>

      <td className="border border-zinc-300 px-3 py-2">
        <ul className="flex flex-col gap-0.5 text-sm text-zinc-600">
          {entrada.rescatar.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </td>

      <td className="border border-zinc-300 px-3 py-2">
        <p className="text-sm text-zinc-900">{entrada.origen}</p>
        {discrepa && (
          <p className="mt-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            El caso declara <span className="font-semibold">{origenDelCaso}</span>. Si el IVADEC no lo
            sustenta, es base para proponer su modificación.
          </p>
        )}
      </td>
    </tr>
  );
}

export function GuiaClinicaIBF({
  diagnosticoPrincipal,
  diagnosticosSecundarios,
  origenPrincipal,
  ibfCompletadoPor,
}: {
  diagnosticoPrincipal: string;
  diagnosticosSecundarios: string;
  origenPrincipal: string;
  /** Quién firma el IBF, para contrastarlo con el profesional que exige el manual. */
  ibfCompletadoPor: string;
}) {
  const coincidencias = buscarGuiaClinica(diagnosticoPrincipal, diagnosticosSecundarios);

  return (
    <details open className="mt-4 rounded-lg border border-zinc-300 bg-zinc-50">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700">
        Información clínica requerida en IBF o en informes complementarios
        {coincidencias.length > 0 && ` (${coincidencias.length})`} ▾
      </summary>

      <div className="border-t border-zinc-200 px-3 py-3">
        {coincidencias.length === 0 ? (
          <p className="rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-600">
            {CRITERIO_GENERAL}
          </p>
        ) : (
          // La tabla conserva el ancho de sus columnas y se desplaza dentro de su caja en
          // pantallas angostas, en vez de comprimir el texto hasta hacerlo ilegible.
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse bg-white text-left">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="w-[15%] border border-zinc-300 px-3 py-2 text-center text-sm font-bold text-zinc-900">
                    Diagnóstico
                  </th>
                  <th className="w-[47%] border border-zinc-300 px-3 py-2 text-center text-sm font-bold text-zinc-900">
                    Información Requerida
                  </th>
                  <th className="w-[23%] border border-zinc-300 px-3 py-2 text-center text-sm font-bold text-zinc-900">
                    Rescatar
                  </th>
                  <th className="w-[15%] border border-zinc-300 px-3 py-2 text-center text-sm font-bold text-zinc-900">
                    Origen
                  </th>
                </tr>
              </thead>
              <tbody>
                {coincidencias.map((coincidencia) => (
                  <Fila
                    key={coincidencia.entrada.id}
                    coincidencia={coincidencia}
                    origenDelCaso={origenPrincipal}
                    ibfCompletadoPor={ibfCompletadoPor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-2 text-xs text-zinc-500">
          Filas del manual M3 que aplican a los diagnósticos de este caso. El manual completo sigue
          siendo la referencia.
        </p>
      </div>
    </details>
  );
}
