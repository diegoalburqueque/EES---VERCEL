import type { DocumentoCaso } from "@/data/casos";

/**
 * `documentos_caso` guarda `tipo` + `link_drive` — nunca el nombre del archivo. Se muestra
 * como link clickeable con una etiqueta legible derivada del tipo, no como nombre de archivo
 * (ese dato no existe en la base).
 */
const ETIQUETA_TIPO: Record<string, string> = {
  CEDULA: "Cédula de identidad",
  IBF: "IBF · Informe biomédico",
  ISRA: "ISRA · Informe social",
  IVADEC: "IVADEC-CIF · Desempeño",
  COMPLEMENTARIO: "Documento complementario",
};

const TIPOS_OBLIGATORIOS = ["CEDULA", "IBF", "ISRA", "IVADEC"];

export function DocumentosExpediente({ documentos }: { documentos: DocumentoCaso[] }) {
  const grupos = new Map<string, DocumentoCaso[]>();
  for (const doc of documentos) {
    const lista = grupos.get(doc.tipo) ?? [];
    lista.push(doc);
    grupos.set(doc.tipo, lista);
  }

  const faltantes = TIPOS_OBLIGATORIOS.filter((t) => !grupos.has(t));

  return (
    <div>
      {faltantes.length > 0 && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          Falta en el expediente: {faltantes.map((t) => ETIQUETA_TIPO[t] ?? t).join(", ")}.
        </p>
      )}

      {documentos.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin documentos registrados para este trámite.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {[...grupos.entries()].map(([tipo, docs]) => (
            <div key={tipo}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
                {ETIQUETA_TIPO[tipo] ?? tipo} ({docs.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {docs.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm text-[var(--atm-azul)] hover:bg-blue-100"
                  >
                    {ETIQUETA_TIPO[tipo] ?? tipo}
                    {docs.length > 1 ? ` ${i + 1}` : ""}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
