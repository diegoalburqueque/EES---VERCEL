"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalisisQA } from "@/data/analisis";
import { GuiaClinicaIBF } from "@/components/GuiaClinicaIBF";

/**
 * Ficha de análisis en el formato que el calificador copia y pega.
 *
 * Cada bloque se despliega por separado y todos los campos son editables: el calificador
 * corrige lo que el motor de EES propuso antes de llevarlo a CeroFilas. Las ediciones viven en el
 * navegador (localStorage por caso) hasta que exista el endpoint que las persista.
 */

/* ── modelo ─────────────────────────────────────────────────────────────── */

interface Campo {
  id: string;
  etiqueta: string;
  valor: string;
  /** Campos largos se muestran como bloque de texto; los cortos, en una línea. */
  largo?: boolean;
}

interface DatoReferencia {
  etiqueta: string;
  valor: string;
  /** Resultado del checklist del documento (CUMPLE / NO_CUMPLE / NO_VERIFICABLE). */
  resultado?: string;
}

interface Bloque {
  id: string;
  titulo: string;
  /** Encabezado interno opcional, p. ej. "Informe biomédico funcional:". */
  subtitulo?: string;
  /** Vista previa en la cabecera de la casilla, para leerla sin desplegarla. */
  resumen?: string;
  campos: Campo[];
  /** Bloques como los exámenes complementarios se copian como lista con guiones. */
  comoLista?: boolean;
  /** Los datos del usuario se editan, pero no van en el texto que se pega en CeroFilas. */
  fueraDelFormato?: boolean;
  /**
   * Lo que el motor de EES analizó para esta sección: el ítem del checklist del documento que
   * alimenta el bloque, sus fechas y las observaciones QA que le corresponden. Va debajo
   * de los campos editables, como respaldo de la propuesta.
   */
  referencia: DatoReferencia[];
}

/** Campo de la casilla de CeroFilas que fija el % final que se guarda en la base. */
export const CAMPO_PORCENTAJE_FINAL = "cf_porcentaje";

const clavePorCaso = (casoId: string) => `ficha-editada:${casoId}`;

/**
 * % final que dejó el calificador en la casilla "COPIAR Y PEGAR EN CEROFILAS".
 *
 * Es el único porcentaje que el humano edita, así que es el que se persiste al calificar.
 * Devuelve null si no lo tocó o si escribió algo que no es un porcentaje válido; el llamador
 * decide el valor por defecto (normalmente el que propuso el motor de EES).
 */
/**
 * Snapshot completo de los valores actuales de la ficha (todos los campos, editados o no),
 * tal como está guardado en localStorage para este caso. Lo usa la página del caso para
 * mandarlo a `POST /api/casos/[id]/ficha` al guardar — reemplaza a localStorage como fuente
 * de verdad, sin cambiar cómo edita el calificador mientras escribe.
 */
export function leerValoresGuardados(casoId: string): Record<string, string> | null {
  try {
    const guardado = localStorage.getItem(clavePorCaso(casoId));
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function leerPorcentajeFinal(casoId: string): number | null {
  try {
    const guardado = localStorage.getItem(clavePorCaso(casoId));
    if (!guardado) return null;
    const crudo = JSON.parse(guardado)[CAMPO_PORCENTAJE_FINAL];
    if (typeof crudo !== "string") return null;
    // El instrumento usa coma decimal ("52,5"), pero el JSON del bot a veces trae punto.
    const numero = Number(crudo.replace("%", "").replace(",", ".").trim());
    return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
  } catch {
    return null;
  }
}

const SIN_DATO = "";

function texto(valor: string | null | undefined): string {
  return valor?.trim() ?? SIN_DATO;
}

function construirBloques(analisis: AnalisisQA): Bloque[] {
  const cliente = analisis.propuesta_formato_cliente;
  const social = cliente.antecedentes_sociales;
  const ibf = cliente.datos_relevantes_calificacion;
  const complementarios = cliente.informes_examenes_complementarios;
  const propuestaIA = analisis.propuesta_calificacion_fundada;
  const cerofilas = analisis.carga_cerofilas;

  const lineasComplementarias = complementarios.items.length
    ? complementarios.items.map((item, i) => ({
        id: `complementario_${i}`,
        etiqueta: item.documento,
        valor: [item.fecha, item.hallazgo].filter(Boolean).join(" — "),
        largo: true,
      }))
    : [
        {
          id: "complementario_0",
          etiqueta: "Sin informes",
          valor: texto(complementarios.resumen_concordancia),
          largo: true,
        },
      ];

  const origenesPropuestos = [
    texto(propuestaIA.origen_principal_propuesto),
    texto(propuestaIA.origenes_secundarios_propuestos),
  ]
    .filter(Boolean)
    .join(" · ");

  const checklist = analisis.checklist_admisibilidad_rm;
  const fechas = analisis.fechas_documentos;
  const calif = analisis.datos_calificacion;
  const validacion = analisis.validacion_ivadec_cif;

  // Cada observación QA se muestra en la sección del documento que la origina.
  const observacionesPorCodigo = (codigos: string[]): DatoReferencia[] =>
    analisis.observaciones_qa
      .filter((obs) => codigos.includes(obs.codigo))
      .map((obs) => ({
        etiqueta: `Observación QA ${obs.codigo} — ${obs.categoria}`,
        valor: obs.justificacion,
      }));

  const ident = analisis.datos_identificacion;

  return [
    {
      id: "datos_usuario",
      titulo: "DATOS DEL USUARIO",
      resumen: [texto(ident.edad), texto(ident.sexo), texto(ident.comuna)].filter(Boolean).join(" · "),
      fueraDelFormato: true,
      campos: [
        { id: "usr_nombre", etiqueta: "Nombre", valor: texto(ident.nombre) },
        { id: "usr_apellidos", etiqueta: "Apellidos", valor: texto(ident.apellidos) },
        { id: "usr_fecha_nacimiento", etiqueta: "Fecha de nacimiento", valor: texto(ident.fecha_nacimiento) },
        { id: "usr_edad", etiqueta: "Edad", valor: texto(ident.edad) },
        { id: "usr_sexo", etiqueta: "Sexo", valor: texto(ident.sexo) },
        { id: "usr_comuna", etiqueta: "Comuna", valor: texto(ident.comuna) },
        { id: "usr_zona", etiqueta: "Zona de vivienda", valor: texto(ident.zona_vivienda) },
        {
          id: "usr_institucion",
          etiqueta: "Institución calificadora",
          valor: texto(ident.institucion_calificadora),
        },
        {
          id: "usr_direccion",
          etiqueta: "Dirección de notificación",
          valor: texto(ident.direccion_notificacion),
          largo: true,
        },
        { id: "usr_red_apoyo", etiqueta: "Red de apoyo", valor: texto(ident.red_apoyo), largo: true },
      ],
      referencia: [
        {
          etiqueta: "Checklist cédula",
          valor: texto(analisis.checklist_admisibilidad_rm.cedula.observacion),
          resultado: analisis.checklist_admisibilidad_rm.cedula.resultado,
        },
        { etiqueta: "Vigencia de la cédula", valor: texto(analisis.fechas_documentos.cedula) },
        {
          etiqueta: "Verificación de identidad",
          valor: texto(analisis.verificacion_identidad.resumen),
          resultado: analisis.verificacion_identidad.resultado,
        },
        ...analisis.verificacion_identidad.diferencias_menores_toleradas.map((dif) => ({
          etiqueta: `Diferencia en ${dif.campo} (${dif.documento})`,
          valor: `${dif.valor_documento_a} vs ${dif.valor_documento_b} — ${dif.justificacion}`,
        })),
        {
          etiqueta: "Representante",
          valor: analisis.checklist_admisibilidad_rm.requiere_representante
            ? `Requiere representante · ${analisis.checklist_admisibilidad_rm.representante_presente}`
            : "No requiere representante",
        },
        ...observacionesPorCodigo(["1"]),
      ],
    },
    {
      id: "antecedentes_sociales",
      titulo: "ANTECEDENTES SOCIALES",
      campos: [
        { id: "nivel_educativo", etiqueta: "Nivel educativo", valor: texto(social.nivel_educativo) },
        { id: "trabajo_ocupacion", etiqueta: "Trabajo / Ocupación", valor: texto(social.trabajo_ocupacion), largo: true },
        { id: "situacion_familiar", etiqueta: "Situación familiar", valor: texto(social.situacion_familiar), largo: true },
        { id: "grado_limitacion", etiqueta: "Grado de Limitación", valor: texto(social.grado_limitacion), largo: true },
        { id: "situacion_especial", etiqueta: "Situación especial", valor: texto(social.situacion_especial) },
      ],
      referencia: [
        {
          etiqueta: "Checklist ISRA",
          valor: texto(checklist.isra.observacion),
          resultado: checklist.isra.resultado,
        },
        { etiqueta: "Fecha del ISRA", valor: texto(fechas.isra) },
        { etiqueta: "Completado por", valor: texto(social.isra_completado_por) },
        {
          etiqueta: "Antecedentes sociales relevantes (motor)",
          valor: texto(calif.antecedentes_sociales_relevantes),
        },
        ...observacionesPorCodigo(["13"]),
      ],
    },
    {
      id: "observaciones_calificacion",
      titulo: "OBSERVACIONES DE LA CALIFICACIÓN",
      subtitulo: "Informe biomédico funcional:",
      campos: [
        { id: "diagnosticos", etiqueta: "Diagnósticos", valor: texto(ibf.diagnosticos), largo: true },
        {
          id: "informacion_relevante",
          etiqueta: "Información relevante",
          valor: texto(ibf.resumen_informacion_relevante_ibf),
          largo: true,
        },
        {
          id: "estado_funcional",
          etiqueta: "Descripción del estado funcional",
          valor: texto(ibf.descripcion_estado_funcional),
          largo: true,
        },
        { id: "medicamentos", etiqueta: "Medicamentos", valor: texto(ibf.medicamentos), largo: true },
        { id: "ayudas_tecnicas", etiqueta: "Ayudas Técnicas", valor: texto(ibf.ayudas_tecnicas), largo: true },
      ],
      referencia: [
        {
          etiqueta: "Checklist IBF",
          valor: texto(checklist.ibf.observacion),
          resultado: checklist.ibf.resultado,
        },
        { etiqueta: "Fecha del IBF", valor: texto(fechas.ibf) },
        { etiqueta: "Completado por", valor: texto(ibf.ibf_completado_por) },
        { etiqueta: "Diagnóstico principal (motor)", valor: texto(calif.diagnostico_principal) },
        { etiqueta: "Diagnósticos secundarios (motor)", valor: texto(calif.diagnosticos_secundarios) },
        { etiqueta: "Origen principal (motor)", valor: texto(calif.origen_principal_discapacidad) },
        {
          etiqueta: "Observaciones de datos relevantes (motor)",
          valor: texto(calif.observaciones_datos_relevantes_calificacion),
        },
        ...observacionesPorCodigo(["10", "11", "12"]),
      ],
    },
    {
      id: "complementarios",
      titulo: "INFORMES O EXÁMENES COMPLEMENTARIOS",
      comoLista: true,
      campos: lineasComplementarias,
      referencia: [
        { etiqueta: "Concordancia con el IBF", valor: texto(complementarios.resumen_concordancia) },
        { etiqueta: "Fechas de los complementarios", valor: texto(fechas.complementarios) },
        ...complementarios.items.map((item) => ({
          etiqueta: item.documento,
          valor: item.hallazgo,
          resultado: item.relacion_ibf,
        })),
      ],
    },
    {
      id: "ivadec",
      titulo: "IVADEC",
      campos: [
        { id: "aplicado_a", etiqueta: "Aplicado a", valor: texto(cliente.ivadec.aplicado_a) },
        { id: "porcentaje_obtenido", etiqueta: "Porcentaje Obtenido", valor: texto(cliente.ivadec.porcentaje_obtenido) },
        {
          id: "aplicado_con_origen",
          etiqueta: "Aplicado con Origen",
          valor: texto(cliente.ivadec.origenes_considerados),
          largo: true,
        },
      ],
      referencia: [
        {
          etiqueta: "Checklist IVADEC",
          valor: texto(checklist.ivadec.observacion),
          resultado: checklist.ivadec.resultado,
        },
        { etiqueta: "Fecha del IVADEC-CIF", valor: texto(fechas.ivadec_cif) },
        { etiqueta: "Calificador IVADEC", valor: texto(cliente.ivadec.ivadec_calificador) },
        { etiqueta: "IDIS / Grado en tabla", valor: `${texto(validacion.idis_tabla)} · ${texto(validacion.grado_tabla)}` },
        {
          etiqueta: "Validación IVADEC-CIF",
          valor: texto(validacion.observacion_breve),
          resultado: validacion.coincide_con_expediente ? "COINCIDE" : "NO_COINCIDE",
        },
      ],
    },
    {
      id: "propuesta",
      titulo: "OBSERVACIONES DEL IVADEC / PROPUESTA, SE SUGIERE",
      campos: [
        {
          id: "observaciones_ivadec",
          etiqueta: "Observaciones del IVADEC",
          valor: cliente.observaciones_ivadec.join("\n"),
          largo: true,
        },
        { id: "prop_porcentaje", etiqueta: "Porcentaje", valor: texto(propuestaIA.porcentaje_propuesto) },
        { id: "prop_origenes", etiqueta: "Orígenes", valor: origenesPropuestos, largo: true },
        {
          id: "prop_fundamento",
          etiqueta: "Fundamento",
          valor: texto(cliente.propuesta.texto_sugerencia) || texto(propuestaIA.fundamento_breve),
          largo: true,
        },
        { id: "prop_mr", etiqueta: "MR", valor: texto(cliente.propuesta.movilidad_reducida), largo: true },
        { id: "prop_reev", etiqueta: "REEV", valor: texto(cliente.propuesta.reevaluacion) },
      ],
      referencia: [
        { etiqueta: "Acción sugerida por el motor", valor: texto(propuestaIA.accion_sugerida) },
        {
          etiqueta: "Grado propuesto",
          valor: `${texto(propuestaIA.grado_propuesto)} · IDIS ${texto(calif.idis)}`,
        },
        { etiqueta: "Fundamento del motor", valor: texto(propuestaIA.fundamento_breve) },
        {
          etiqueta: `Glosa (${texto(cliente.propuesta.glosa_tipo) || "sin tipo"})`,
          valor: texto(cliente.propuesta.glosa_texto),
        },
        ...observacionesPorCodigo(["8"]),
      ],
    },
    {
      id: "cerofilas",
      titulo: "COPIAR Y PEGAR EN CEROFILAS",
      campos: [
        {
          id: "cf_zona_vivienda",
          etiqueta: "Zona de Vivienda",
          valor: texto(cerofilas.zona_vivienda),
        },
        {
          id: "cf_institucion_calificadora",
          etiqueta: "Institución Calificadora",
          valor: [texto(cerofilas.institucion_calificadora), texto(cerofilas.nombre_institucion)]
            .filter(Boolean)
            .join(" · "),
        },
        {
          id: "cf_diagnostico_principal",
          etiqueta: "Diagnóstico Principal",
          valor: texto(cerofilas.diagnostico_principal),
          largo: true,
        },
        {
          id: "cf_origen_principal",
          etiqueta: "Origen Principal de Discapacidad",
          valor: texto(cerofilas.origen_principal_discapacidad),
        },
        {
          id: "cf_diagnosticos_secundarios",
          etiqueta: "Diagnósticos Secundarios (Opcional)",
          valor: texto(cerofilas.diagnosticos_secundarios),
          largo: true,
        },
        {
          id: "cf_origenes_secundarios",
          etiqueta: "Orígenes Secundarios",
          valor: cerofilas.origenes_secundarios.join(", ") || "Sin orígenes secundarios",
        },
        {
          id: "cf_porcentaje",
          etiqueta: "Porcentaje de discapacidad",
          valor: texto(cerofilas.porcentaje_de_discapacidad),
        },
        {
          id: "cf_movilidad_reducida",
          etiqueta: "Movilidad Reducida",
          valor: texto(cerofilas.movilidad_reducida),
        },
        {
          id: "cf_antecedentes",
          etiqueta: "Antecedentes Sociales Relevantes",
          valor: texto(cerofilas.antecedentes_sociales_relevantes),
          largo: true,
        },
        {
          id: "cf_observaciones",
          etiqueta: "Observaciones Datos Relevantes de Calificación",
          valor: texto(cerofilas.observaciones_calificacion),
          largo: true,
        },
      ],
      referencia: [
        {
          etiqueta: "Apto para revisión",
          valor: cerofilas.apto_para_revision ? "Sí" : "No",
          resultado: cerofilas.apto_para_revision ? "CUMPLE" : "NO_CUMPLE",
        },
        ...cerofilas.alertas_carga.map((alerta, i) => ({
          etiqueta: `Alerta de carga ${i + 1}`,
          valor: alerta,
          resultado: "ALERTA",
        })),
      ],
    },
  ];
}

/** Texto plano de un bloque, en el formato acordado para pegar. */
function bloqueATexto(bloque: Bloque, valores: Record<string, string>): string {
  const cuerpo = bloque.campos
    .map((campo) => {
      const valor = valores[campo.id] ?? campo.valor;
      return bloque.comoLista ? `-  ${campo.etiqueta}: ${valor}` : `* ${campo.etiqueta}: ${valor}`;
    })
    .join("\n");

  return [bloque.titulo, bloque.subtitulo, "", cuerpo].filter((l) => l !== undefined).join("\n");
}

/* ── piezas de interfaz ─────────────────────────────────────────────────── */

function BotonCopiar({ obtenerTexto }: { obtenerTexto: () => string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(obtenerTexto());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        copiar();
      }}
      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-white"
    >
      {copiado ? "✓ Copiado" : "Copiar"}
    </button>
  );
}

const ESTILO_RESULTADO: Record<string, string> = {
  CUMPLE: "bg-emerald-50 text-emerald-700",
  COINCIDE: "bg-emerald-50 text-emerald-700",
  CONCORDANTE_CON_IBF: "bg-emerald-50 text-emerald-700",
  NO_CUMPLE: "bg-red-50 text-red-700",
  NO_COINCIDE: "bg-red-50 text-red-700",
  NO_VERIFICABLE: "bg-amber-50 text-amber-700",
  REQUIERE_REVISION: "bg-amber-50 text-amber-700",
  ALERTA: "bg-amber-50 text-amber-700",
};

function Insignia({ valor }: { valor: string }) {
  const estilo = ESTILO_RESULTADO[valor.toUpperCase().replace(/\s+/g, "_")] ?? "bg-zinc-100 text-zinc-600";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${estilo}`}>
      {valor.replace(/_/g, " ")}
    </span>
  );
}

/** Lo que el motor de EES analizó para esta sección: respaldo de la propuesta, no editable. */
function PanelReferencia({ datos }: { datos: DatoReferencia[] }) {
  const visibles = datos.filter((d) => d.valor.trim());
  if (visibles.length === 0) return null;

  return (
    <details open className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700">
        Motor de EES — análisis de esta sección ({visibles.length}) ▾
      </summary>
      <div className="flex flex-col gap-3 border-t border-zinc-200 px-3 py-3">
        {visibles.map((dato, i) => (
          <div key={i}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900">{dato.etiqueta}</p>
              {dato.resultado && <Insignia valor={dato.resultado} />}
            </div>
            <p className="mt-0.5 whitespace-pre-line text-sm text-zinc-600">{dato.valor}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function CampoEditable({
  campo,
  valor,
  editable,
  onCambiar,
}: {
  campo: Campo;
  valor: string;
  editable: boolean;
  onCambiar: (nuevo: string) => void;
}) {
  const filas = Math.min(12, Math.max(2, Math.ceil(valor.length / 90) + valor.split("\n").length - 1));
  const modificado = valor !== campo.valor;

  return (
    <div>
      <label htmlFor={campo.id} className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        {campo.etiqueta}
        {modificado && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            Editado
          </span>
        )}
      </label>
      {!editable ? (
        <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">{valor || "—"}</p>
      ) : campo.largo ? (
        <textarea
          id={campo.id}
          value={valor}
          rows={filas}
          onChange={(e) => onCambiar(e.target.value)}
          className="mt-1 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      ) : (
        <input
          id={campo.id}
          type="text"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      )}
      {modificado && (
        <p className="mt-1 whitespace-pre-line text-xs text-zinc-400">
          <span className="font-medium">Motor de EES:</span> {campo.valor || "—"}
        </p>
      )}
    </div>
  );
}

function Desplegable({
  titulo,
  resumen,
  children,
  accion,
  abiertoPorDefecto = false,
  encabezado,
}: {
  titulo: string;
  resumen?: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
  abiertoPorDefecto?: boolean;
  /**
   * Contenido que ocupa el lado izquierdo de la barra en lugar del título. Lo usa la primera
   * casilla para fundirse con la cabecera del caso: a la izquierda queda el título del caso y
   * a la derecha el botón que despliega los datos del usuario.
   */
  encabezado?: React.ReactNode;
}) {
  return (
    <details open={abiertoPorDefecto} className="group border-b border-zinc-200 last:border-b-0">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 ${
          encabezado ? "bg-white py-4 hover:bg-zinc-50" : "bg-zinc-50 hover:bg-zinc-100"
        }`}
      >
        {encabezado ?? (
          <div className="min-w-0">
            <span className="text-sm font-bold text-zinc-900">{titulo}</span>
            {resumen && <p className="truncate text-xs text-zinc-600">{resumen}</p>}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {encabezado && (
            <div className="text-right">
              <span className="text-sm font-bold text-zinc-900">{titulo}</span>
              {resumen && <p className="text-xs text-zinc-600">{resumen}</p>}
            </div>
          )}
          {accion}
          <span className="text-zinc-400 transition-transform group-open:rotate-180">▾</span>
        </div>
      </summary>
      <div className="px-5 py-4">{children}</div>
    </details>
  );
}

/* ── ficha ──────────────────────────────────────────────────────────────── */

export function FichaEditable({
  analisis,
  casoId,
  editable = true,
  encabezadoCaso,
}: {
  analisis: AnalisisQA;
  casoId: string;
  editable?: boolean;
  /** Título e identificación del caso: se funde con la casilla de datos del usuario. */
  encabezadoCaso?: React.ReactNode;
}) {
  const bloques = useMemo(() => construirBloques(analisis), [analisis]);

  const valoresIniciales = useMemo(() => {
    const base: Record<string, string> = {};
    for (const bloque of bloques) {
      for (const campo of bloque.campos) base[campo.id] = campo.valor;
    }
    return base;
  }, [bloques]);

  const [valores, setValores] = useState<Record<string, string>>(valoresIniciales);
  const claveGuardado = clavePorCaso(casoId);

  // Recupera las ediciones previas de este caso al abrir la ficha. Se cargan también en
  // modo lectura: lo corregido por el calificador debe seguir a la vista al salir de edición.
  // localStorage solo existe en el navegador: la lectura va después de hidratar, no en el
  // render, o el HTML del servidor no coincidiría con el del cliente. Es sincronización con
  // un store externo, el caso legítimo de setState dentro de un efecto.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setValores(valoresIniciales);
    try {
      const guardado = localStorage.getItem(claveGuardado);
      if (guardado) setValores({ ...valoresIniciales, ...JSON.parse(guardado) });
    } catch {
      // localStorage no disponible o con contenido inválido: se usan los valores del análisis.
    }
  }, [valoresIniciales, claveGuardado]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function cambiar(id: string, nuevo: string) {
    setValores((previos) => {
      const siguientes = { ...previos, [id]: nuevo };
      try {
        localStorage.setItem(claveGuardado, JSON.stringify(siguientes));
      } catch {
        // Sin persistencia local: la edición sigue viva en memoria durante la sesión.
      }
      return siguientes;
    });
  }

  function restaurar() {
    setValores(valoresIniciales);
    try {
      localStorage.removeItem(claveGuardado);
    } catch {
      // Nada que limpiar.
    }
  }

  const hayEdiciones = Object.keys(valoresIniciales).some((id) => valores[id] !== valoresIniciales[id]);

  const textoCompleto = () =>
    [
      "FORMATO PARA ANALISIS DE CASOS (PARA COPIAR Y PEGAR)",
      "",
      ...bloques.filter((b) => !b.fueraDelFormato).map((bloque) => bloqueATexto(bloque, valores)),
      "",
      "Datos de usuario revisados.",
    ].join("\n\n");


  // La casilla de datos del usuario comparte barra con la cabecera del caso; el resto va debajo.
  const bloqueUsuario = bloques.find((b) => b.id === "datos_usuario");
  const bloquesRestantes = bloques.filter((b) => b.id !== "datos_usuario");

  const renderBloque = (bloque: Bloque, encabezado?: React.ReactNode) => (
    <Desplegable
      key={bloque.id}
      titulo={bloque.titulo}
      resumen={bloque.resumen ?? bloque.subtitulo}
      encabezado={encabezado}
      // Todas las casillas van siempre desplegadas, editable o no: el calificador tiene que
      // ver el caso completo de una pasada al entrar, sin ir abriendo una por una. El botón
      // "Copiar" de cada bloque se mantiene igual.
      abiertoPorDefecto
      // Los datos del usuario no se pegan en CeroFilas, así que esa casilla no lleva "Copiar".
      accion={
        bloque.fueraDelFormato ? undefined : (
          <BotonCopiar obtenerTexto={() => bloqueATexto(bloque, valores)} />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {bloque.campos.map((campo) => (
          <CampoEditable
            key={campo.id}
            campo={campo}
            valor={valores[campo.id] ?? campo.valor}
            editable={editable}
            onCambiar={(nuevo) => cambiar(campo.id, nuevo)}
          />
        ))}
      </div>
      <PanelReferencia datos={bloque.referencia} />
      {/* El cuadro del manual M3 va en la casilla del IBF: es ahí donde el calificador
          comprueba si el informe trae lo que el diagnóstico exige. */}
      {bloque.id === "observaciones_calificacion" && (
        <GuiaClinicaIBF
          diagnosticoPrincipal={analisis.datos_calificacion.diagnostico_principal}
          diagnosticosSecundarios={analisis.datos_calificacion.diagnosticos_secundarios}
          origenPrincipal={analisis.datos_calificacion.origen_principal_discapacidad}
          ibfCompletadoPor={
            analisis.propuesta_formato_cliente.datos_relevantes_calificacion.ibf_completado_por
          }
        />
      )}
    </Desplegable>
  );

  return (
    <div>
      {bloqueUsuario && renderBloque(bloqueUsuario, encabezadoCaso)}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            Formato para análisis de casos (para copiar y pegar)
          </p>
          <p className="text-xs text-zinc-500">
            {editable ? (
              <>
                Edición activa: puedes cambiar cualquier campo.
                {hayEdiciones && " Tienes cambios sin guardar."}
              </>
            ) : (
              <>
                Solo lectura.
                {hayEdiciones && " Hay campos editados por el calificador."}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editable && hayEdiciones && (
            <button
              type="button"
              onClick={restaurar}
              className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Restaurar original
            </button>
          )}
          <BotonCopiar obtenerTexto={textoCompleto} />
        </div>
      </div>

      {bloquesRestantes.map((bloque) => (
        <div key={bloque.id} className={bloque.id === "cerofilas" ? "mt-8" : undefined}>
          {renderBloque(bloque)}
        </div>
      ))}

      <p className="px-5 py-3 text-xs text-zinc-400">Datos de usuario revisados.</p>
    </div>
  );
}
