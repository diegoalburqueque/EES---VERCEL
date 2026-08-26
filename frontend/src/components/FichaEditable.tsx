"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalisisQA } from "@/data/analisis";
import type { DocumentoCaso, ResolucionCalificador } from "@/data/casos";
import { GuiaClinicaIBF } from "@/components/GuiaClinicaIBF";
import { DocumentosExpediente } from "@/components/DocumentosExpediente";

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
  /** Nunca editable, ni siquiera en modo edición — ej. el % que propuso el motor, que el
   *  calificador corrige aparte con el select oficial de "Modificar propuesta", no acá. */
  soloLectura?: boolean;
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

/** El motor usa estos placeholders cuando no logró determinar un valor — para efectos de
 *  "¿hay dato real?" cuentan como vacío, igual que "". */
const PLACEHOLDERS_SIN_DATO = new Set(["NO_DETERMINADO", "NO DETERMINADO", "No consta en el expediente"]);

function hayDato(valor: string): boolean {
  return valor !== "" && !PLACEHOLDERS_SIN_DATO.has(valor);
}

/** `carga_cerofilas` es una sección aparte del JSON que el motor a veces deja con placeholders
 *  aunque el mismo dato ya esté resuelto en otra sección (ej. `datos_calificacion`) — antes de
 *  copiar y pegar en CeroFilas, usa el respaldo en vez del placeholder. */
function conRespaldo(valor: string, ...respaldos: string[]): string {
  if (hayDato(valor)) return valor;
  for (const respaldo of respaldos) {
    if (hayDato(respaldo)) return respaldo;
  }
  return valor;
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
          etiqueta: "Antecedentes sociales relevantes (sugerido)",
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
        { etiqueta: "Diagnóstico principal (sugerido)", valor: texto(calif.diagnostico_principal) },
        { etiqueta: "Diagnósticos secundarios (sugerido)", valor: texto(calif.diagnosticos_secundarios) },
        { etiqueta: "Origen principal (sugerido)", valor: texto(calif.origen_principal_discapacidad) },
        {
          etiqueta: "Observaciones de datos relevantes (sugerido)",
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
        {
          id: "prop_porcentaje",
          etiqueta: "Porcentaje (PROPUESTA SUGERIDA)",
          valor: texto(propuestaIA.porcentaje_propuesto),
          soloLectura: true,
        },
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
        { etiqueta: "Acción sugerida", valor: texto(propuestaIA.accion_sugerida) },
        {
          etiqueta: "Grado propuesto",
          valor: `${texto(propuestaIA.grado_propuesto)} · IDIS ${texto(calif.idis)}`,
        },
        { etiqueta: "Fundamento de la propuesta", valor: texto(propuestaIA.fundamento_breve) },
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
          valor: conRespaldo(texto(cerofilas.diagnostico_principal), texto(calif.diagnostico_principal)),
          largo: true,
        },
        {
          id: "cf_origen_principal",
          etiqueta: "Origen Principal de Discapacidad",
          valor: conRespaldo(
            texto(cerofilas.origen_principal_discapacidad),
            texto(calif.origen_principal_discapacidad),
            texto(propuestaIA.origen_principal_propuesto)
          ),
        },
        {
          id: "cf_diagnosticos_secundarios",
          etiqueta: "Diagnósticos Secundarios (Opcional)",
          valor: conRespaldo(texto(cerofilas.diagnosticos_secundarios), texto(calif.diagnosticos_secundarios)),
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
          valor: conRespaldo(texto(cerofilas.porcentaje_de_discapacidad), texto(calif.porcentaje_discapacidad)),
        },
        {
          id: "cf_movilidad_reducida",
          etiqueta: "Movilidad Reducida",
          valor: conRespaldo(
            texto(cerofilas.movilidad_reducida),
            texto(calif.movilidad_reducida),
            texto(propuestaIA.movilidad_reducida_propuesta)
          ),
        },
        {
          id: "cf_antecedentes",
          etiqueta: "Antecedentes Sociales Relevantes",
          valor: conRespaldo(
            texto(cerofilas.antecedentes_sociales_relevantes),
            texto(calif.antecedentes_sociales_relevantes)
          ),
          largo: true,
        },
        {
          id: "cf_observaciones",
          etiqueta: "Observaciones Datos Relevantes de Calificación",
          valor: conRespaldo(
            texto(cerofilas.observaciones_calificacion),
            texto(calif.observaciones_datos_relevantes_calificacion)
          ),
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

/** Valor actual de un campo (editado o no) por id de bloque + id de campo. */
function valorCampo(
  bloques: Bloque[],
  bloqueId: string,
  campoId: string,
  valores: Record<string, string>
): string {
  const campo = bloques.find((b) => b.id === bloqueId)?.campos.find((c) => c.id === campoId);
  return (valores[campoId] ?? campo?.valor ?? "").trim();
}

/**
 * Texto "FORMATO PARA ANALISIS DE CASOS" que el calificador copia y pega — sigue el esqueleto
 * del Word del equipo: ANTECEDENTES SOCIALES / OBSERVACIONES DE LA CALIFICACIÓN / INFORMES
 * COMPLEMENTARIOS / IVADEC / OBSERVACIONES DEL IVADEC / PROPUESTA, SE SUGIERE. No incluye la
 * casilla de CeroFilas (se copia aparte en PantallaCerofilas) ni los datos del usuario.
 */
function textoFormatoAnalisis(bloques: Bloque[], valores: Record<string, string>): string {
  const v = (bloqueId: string, campoId: string) => valorCampo(bloques, bloqueId, campoId, valores);

  const complementarios = bloques.find((b) => b.id === "complementarios");
  const lineasComplementarios = (complementarios?.campos ?? []).map(
    (c) => `-  ${c.etiqueta}: ${(valores[c.id] ?? c.valor).trim()}`
  );

  return [
    "FORMATO PARA ANALISIS DE CASOS (PARA COPIAR Y PEGAR)",
    "",
    "ANTECEDENTES SOCIALES",
    "",
    `* Nivel educativo: ${v("antecedentes_sociales", "nivel_educativo")}`,
    `* Trabajo / Ocupación: ${v("antecedentes_sociales", "trabajo_ocupacion")}`,
    `* Situación familiar: ${v("antecedentes_sociales", "situacion_familiar")}`,
    `* Grado de Limitación: ${v("antecedentes_sociales", "grado_limitacion")}`,
    `* Situación especial*: ${v("antecedentes_sociales", "situacion_especial")}`,
    "",
    "",
    "OBSERVACIONES DE LA CALIFICACIÓN",
    "Informe biomédico funcional:",
    "",
    `* Diagnósticos: ${v("observaciones_calificacion", "diagnosticos")}`,
    `* Información relevante: ${v("observaciones_calificacion", "informacion_relevante")}`,
    `* Descripción del estado funcional: ${v("observaciones_calificacion", "estado_funcional")}`,
    `* Medicamentos: ${v("observaciones_calificacion", "medicamentos")}`,
    `* Ayudas Técnicas: ${v("observaciones_calificacion", "ayudas_tecnicas")}`,
    "",
    "",
    "INFORMES O EXAMENES COMPLEMENTARIOS",
    ...(lineasComplementarios.length ? lineasComplementarios : ["-"]),
    "",
    "",
    "IVADEC",
    "",
    `* Aplicado a: ${v("ivadec", "aplicado_a")}`,
    `* Porcentaje Obtenido: ${v("ivadec", "porcentaje_obtenido")}`,
    `* Aplicado con Origen: ${v("ivadec", "aplicado_con_origen")}`,
    "",
    "",
    "OBSERVACIONES DEL IVADEC:",
    v("propuesta", "observaciones_ivadec"),
    "",
    "     PROPUESTA, SE SUGIERE:",
    "",
    `* Porcentaje: ${v("propuesta", "prop_porcentaje")}`,
    `* Orígenes: ${v("propuesta", "prop_origenes")}`,
    `* Fundamento: ${v("propuesta", "prop_fundamento")}`,
    `* MR: ${v("propuesta", "prop_mr")}`,
    `* REEV: ${v("propuesta", "prop_reev")}`,
    "",
    "",
    "Datos de usuario revisados.",
  ].join("\n");
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
  COINCIDENCIA_TOTAL: "bg-emerald-50 text-emerald-700",
  CONCORDANTE_CON_IBF: "bg-emerald-50 text-emerald-700",
  NO_CUMPLE: "bg-red-50 text-red-700",
  NO_COINCIDE: "bg-red-50 text-red-700",
  APORTA_DIAGNOSTICO_NUEVO: "bg-red-50 text-red-700",
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
    <details open className="mt-4 rounded-lg border border-[var(--atm-linea)] bg-zinc-50">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700">
        Análisis de esta sección ({visibles.length}) ▾
      </summary>
      <div className="flex flex-col gap-3 border-t border-[var(--atm-linea)] px-3 py-3">
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
          <span className="font-medium">Propuesta sugerida:</span> {campo.valor || "—"}
        </p>
      )}
    </div>
  );
}

/** Campo de la pantalla "COPIAR Y PEGAR EN CEROFILAS" en modo lectura: cada campo va en su
 *  propia tarjeta (encabezado con la etiqueta + cuerpo con el valor) para que el calificador
 *  distinga visualmente sección por sección. Marca "Editado" y muestra el valor sugerido
 *  original cuando el calificador cambió el campo. */
function CampoCerofilas({
  etiqueta,
  valor,
  original,
}: {
  etiqueta: string;
  valor: string;
  original: string;
}) {
  const modificado = valor !== original;
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--atm-linea)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--atm-linea)] bg-zinc-50 px-3 py-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">{etiqueta}</p>
        {modificado && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            Editado
          </span>
        )}
      </div>
      <p className="whitespace-pre-line px-3 py-2 text-sm text-zinc-700">{valor || "—"}</p>
      {modificado && (
        <p className="whitespace-pre-line border-t border-dashed border-[var(--atm-linea)] px-3 py-1.5 text-xs text-zinc-400">
          <span className="font-medium">Propuesta sugerida:</span> {original || "—"}
        </p>
      )}
    </div>
  );
}

/** Campo individual dentro de una celda de `TablaCamposCompacta` — sin label propio, la
 *  etiqueta ya está en el `<th>` de la fila. */
function CampoCompacto({
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
  if (!editable) {
    return <span className="whitespace-pre-line text-zinc-800">{valor || "—"}</span>;
  }
  return campo.largo ? (
    <textarea
      value={valor}
      rows={2}
      onChange={(e) => onCambiar(e.target.value)}
      className="w-full resize-y rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-900"
    />
  ) : (
    <input
      type="text"
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-900"
    />
  );
}

/** Agrupa campos de a 2 por fila (izquierda/derecha), salvo los `largo` que ocupan la fila
 *  completa — mismo patrón visual que la tabla RUN/Origen del encabezado del caso. */
function agruparCamposCompactos(campos: Campo[]): { izquierda: Campo; derecha?: Campo }[] {
  const filas: { izquierda: Campo; derecha?: Campo }[] = [];
  let pendiente: Campo | null = null;
  for (const campo of campos) {
    if (campo.largo) {
      if (pendiente) {
        filas.push({ izquierda: pendiente });
        pendiente = null;
      }
      filas.push({ izquierda: campo });
    } else if (pendiente) {
      filas.push({ izquierda: pendiente, derecha: campo });
      pendiente = null;
    } else {
      pendiente = campo;
    }
  }
  if (pendiente) filas.push({ izquierda: pendiente });
  return filas;
}

/** Tabla compacta de 2 columnas (etiqueta con fondo oscuro + valor) para "Datos del usuario" —
 *  reemplaza el stack vertical de CampoEditable para que quepan todos los campos sin
 *  ocupar tanto espacio. */
function TablaCamposCompacta({
  campos,
  valores,
  editable,
  onCambiar,
}: {
  campos: Campo[];
  valores: Record<string, string>;
  editable: boolean;
  onCambiar: (id: string, nuevo: string) => void;
}) {
  const filas = useMemo(() => agruparCamposCompactos(campos), [campos]);

  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i}>
            <th className="w-1/5 border border-[var(--atm-linea)] bg-[var(--atm-th)] px-3 py-2 text-left font-medium text-white">
              {fila.izquierda.etiqueta}
            </th>
            <td
              className="border border-[var(--atm-linea)] px-3 py-2"
              colSpan={fila.derecha ? 1 : 3}
            >
              <CampoCompacto
                campo={fila.izquierda}
                valor={valores[fila.izquierda.id] ?? fila.izquierda.valor}
                editable={editable}
                onCambiar={(nuevo) => onCambiar(fila.izquierda.id, nuevo)}
              />
            </td>
            {fila.derecha && (
              <>
                <th className="w-1/5 border border-[var(--atm-linea)] bg-[var(--atm-th)] px-3 py-2 text-left font-medium text-white">
                  {fila.derecha.etiqueta}
                </th>
                <td className="border border-[var(--atm-linea)] px-3 py-2">
                  <CampoCompacto
                    campo={fila.derecha}
                    valor={valores[fila.derecha.id] ?? fila.derecha.valor}
                    editable={editable}
                    onCambiar={(nuevo) => onCambiar(fila.derecha!.id, nuevo)}
                  />
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
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
    <details open={abiertoPorDefecto} className="group border-b border-[var(--atm-linea)] last:border-b-0">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 ${
          encabezado ? "bg-white py-4 hover:bg-zinc-50" : "bg-zinc-50 hover:bg-zinc-100"
        }`}
      >
        {encabezado ?? (
          <div className="min-w-0 border-l-4 border-[var(--atm-azul2)] pl-2">
            <span className="text-sm font-bold text-[var(--atm-azul)]">{titulo}</span>
            {resumen && <p className="truncate text-xs text-zinc-600">{resumen}</p>}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {encabezado && (
            <div className="text-right">
              <span className="text-sm font-bold text-[var(--atm-azul)]">{titulo}</span>
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
  documentos = [],
  fichaEditada = null,
}: {
  analisis: AnalisisQA;
  casoId: string;
  editable?: boolean;
  /** Título e identificación del caso: se funde con la casilla de datos del usuario. */
  encabezadoCaso?: React.ReactNode;
  /** Links de `documentos_caso` — se muestran arriba, dentro de la casilla de datos del usuario. */
  documentos?: DocumentoCaso[];
  /** Snapshot guardado en `casos.ficha_editada` (BD). Se usa como respaldo cuando el navegador
   *  no tiene nada en localStorage — clave en el histórico o al abrir en otro equipo. */
  fichaEditada?: Record<string, string> | null;
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
    // Prioridad: análisis original → snapshot de la BD (ficha_editada) → localStorage (lo más
    // reciente que el calificador tocó en este navegador, si existe).
    let base = { ...valoresIniciales, ...(fichaEditada ?? {}) };
    try {
      const guardado = localStorage.getItem(claveGuardado);
      if (guardado) base = { ...base, ...JSON.parse(guardado) };
    } catch {
      // localStorage no disponible o con contenido inválido: se usa lo anterior.
    }
    setValores(base);
  }, [valoresIniciales, claveGuardado, fichaEditada]);
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

  const textoCompleto = () => textoFormatoAnalisis(bloques, valores);


  // La casilla de datos del usuario comparte barra con la cabecera del caso; el resto va debajo.
  const bloqueUsuario = bloques.find((b) => b.id === "datos_usuario");
  // "cerofilas" ya no se muestra durante la revisión — el calificador ya tiene la propuesta
  // del motor en el panel "Propuesta del motor"; el texto para copiar y pegar en CeroFilas
  // recién aparece en `PantallaCerofilas`, después de ratificar o modificar.
  const bloquesRestantes = bloques.filter((b) => b.id !== "datos_usuario" && b.id !== "cerofilas");

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
      {bloque.id === "datos_usuario" ? (
        <>
          <TablaCamposCompacta
            campos={bloque.campos}
            valores={valores}
            editable={editable}
            onCambiar={cambiar}
          />
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--atm-gris)]">
              Documentos del expediente
            </p>
            <DocumentosExpediente documentos={documentos} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {bloque.campos.map((campo) => (
            <CampoEditable
              key={campo.id}
              campo={campo}
              valor={valores[campo.id] ?? campo.valor}
              editable={editable && !campo.soloLectura}
              onCambiar={(nuevo) => cambiar(campo.id, nuevo)}
            />
          ))}
        </div>
      )}
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--atm-linea)] px-5 py-3">
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
        <div key={bloque.id}>{renderBloque(bloque)}</div>
      ))}

      <p className="px-5 py-3 text-xs text-zinc-400">Datos de usuario revisados.</p>
    </div>
  );
}

/**
 * El campo "Antecedentes Sociales Relevantes" de CeroFilas se muestra abierto en los mismos 5
 * sub-campos que el calificador ve/edita en el bloque ANTECEDENTES SOCIALES de la ficha — con
 * lo que él dejó, no con el párrafo pre-armado. `[id de campo en la ficha, etiqueta]`.
 */
const SUBCAMPOS_ANTECEDENTES: [string, string][] = [
  ["nivel_educativo", "Nivel educativo"],
  ["trabajo_ocupacion", "Trabajo / Ocupación"],
  ["situacion_familiar", "Situación familiar"],
  ["grado_limitacion", "Grado de Limitación"],
  ["situacion_especial", "Situación especial*"],
];

function lineasAntecedentesSociales(valores: Record<string, string>) {
  return SUBCAMPOS_ANTECEDENTES.map(([id, etiqueta]) => ({
    etiqueta,
    valor: (valores[id] ?? "").trim(),
  }));
}

/** Texto de los 5 sub-campos para el bloque que se copia a CeroFilas. */
function textoAntecedentesSociales(valores: Record<string, string>): string {
  return lineasAntecedentesSociales(valores)
    .map((l) => `* ${l.etiqueta}: ${l.valor}`)
    .join("\n");
}

const VERBO_DIRECCION: Record<string, string> = {
  SE_AUMENTA: "AUMENTAR",
  SE_DISMINUYE: "DISMINUIR",
  SE_MANTIENE: "MANTENER",
};

const REEV_TEXTO: Record<string, string> = {
  NO: "NO",
  EN_3_ANOS: "SÍ, en 3 años",
  EN_5_ANOS: "SÍ, en 5 años",
  EN_6_ANOS: "SÍ, en 6 años",
  EN_10_ANOS: "SÍ, en 10 años",
};

/**
 * Texto completo del campo "Observaciones Datos Relevantes de Calificación" de CeroFilas:
 * informe biomédico funcional + complementarios + IVADEC + observaciones del IVADEC + la
 * PROPUESTA con la DECISIÓN FINAL del calificador (no la sugerencia del bot) + firma.
 * Todo sale de lo que el calificador dejó en la ficha (`valores`) y de su resolución.
 */
function textoObservacionesCerofilas(
  bloques: Bloque[],
  valores: Record<string, string>,
  analisis: AnalisisQA,
  resolucion: ResolucionCalificador | null,
  porcentajeFinal: number | null,
  calificadorNombre: string | null,
  calificadorProfesion: string | null
): string {
  const v = (bloqueId: string, campoId: string) => valorCampo(bloques, bloqueId, campoId, valores);

  const ibfPor = (
    analisis.propuesta_formato_cliente.datos_relevantes_calificacion.ibf_completado_por ?? ""
  ).trim();

  const complementarios = bloques.find((b) => b.id === "complementarios");
  const lineasComplementarios = (complementarios?.campos ?? []).map((c) => {
    const val = (valores[c.id] ?? c.valor).trim();
    return c.etiqueta === "Sin informes" ? `- ${val}` : `- ${c.etiqueta}${val ? `: ${val}` : ""}`;
  });

  // PROPUESTA: la decisión final del calificador, no la del bot.
  let lineaPorcentaje = "";
  if (porcentajeFinal !== null && resolucion?.direccion) {
    lineaPorcentaje =
      resolucion.direccion === "SE_MANTIENE"
        ? `MANTENER % EN ${porcentajeFinal}%`
        : `${VERBO_DIRECCION[resolucion.direccion]} % A ${porcentajeFinal}%`;
  } else if (porcentajeFinal !== null) {
    lineaPorcentaje = `${porcentajeFinal}%`;
  }
  const lineaMr =
    resolucion?.mrFinal === true ? "SI" : resolucion?.mrFinal === false ? "NO" : v("propuesta", "prop_mr");
  const lineaReev = resolucion?.reevFinal ? REEV_TEXTO[resolucion.reevFinal] : v("propuesta", "prop_reev");
  const lineaFundamento = (resolucion?.explicacion ?? "").trim() || v("propuesta", "prop_fundamento");

  const lineas: string[] = [
    `Informe biomédico funcional:${ibfPor ? ` ${ibfPor}` : ""}`,
    "",
    "•\tDiagnósticos:",
    v("observaciones_calificacion", "diagnosticos"),
    "",
    "•\tInformación relevante:",
    v("observaciones_calificacion", "informacion_relevante"),
    "",
    `•\tDescripción del estado funcional: ${v("observaciones_calificacion", "estado_funcional")}`,
    "",
    `•\tMedicamentos: ${v("observaciones_calificacion", "medicamentos")}`,
    "",
    `•\tAyudas Técnicas: ${v("observaciones_calificacion", "ayudas_tecnicas")}`,
    "",
    "INFORMES O EXAMENES COMPLEMENTARIOS",
    ...(lineasComplementarios.length ? lineasComplementarios : ["-"]),
    "",
    "IVADEC",
    `•\tAplicado a: ${v("ivadec", "aplicado_a")}`,
    `•\tPorcentaje Obtenido: ${v("ivadec", "porcentaje_obtenido")}`,
    `•\tAplicado con Origen: ${v("ivadec", "aplicado_con_origen")}`,
    "",
    "OBSERVACIONES DEL IVADEC:",
    v("propuesta", "observaciones_ivadec"),
    "",
    "     PROPUESTA, SE SUGIERE:",
    `•\tPorcentaje: ${lineaPorcentaje}`,
    `•\tOrígenes: ${v("propuesta", "prop_origenes")}`,
    `•\tFundamento: ${lineaFundamento}`,
    `•\tMR: ${lineaMr}`,
    `•\tREEV: ${lineaReev}`,
  ];

  if (calificadorNombre) {
    lineas.push("", "DATOS DE USUARIO REVISADOS", calificadorNombre, calificadorProfesion ?? "");
  }

  return lineas.join("\n");
}

/**
 * Pantalla que se muestra UNA vez, justo después de ratificar o modificar (nunca en
 * "no evaluable" — ahí no hay nada que subir a CeroFilas). Es el mismo contenido que antes
 * vivía dentro de la ficha ("cerofilas"), pero movido a este momento: el calificador ya no
 * lo necesita mientras revisa (tiene "Propuesta del motor" para eso), solo cuando termina y
 * tiene que pegarlo en CeroFilas.
 */
export function PantallaCerofilas({
  analisis,
  casoId,
  subiendo,
  onYaLoSubi,
  onVolver,
  porcentajeFinal = null,
  modificado = false,
  calificadorNombre = null,
  calificadorProfesion = null,
  fichaEditada = null,
  resolucion = null,
}: {
  analisis: AnalisisQA;
  casoId: string;
  subiendo: boolean;
  onYaLoSubi: () => void;
  onVolver: () => void;
  /** % final que decidió el calificador (`propuesta.porcentajeFinal`). Cuando `modificado` es
   *  true, reemplaza al % del motor en el texto de CeroFilas — si no, quedaría pegando en el
   *  sistema oficial el % que el motor propuso y no el que el calificador realmente decidió. */
  porcentajeFinal?: number | null;
  modificado?: boolean;
  /** Firma del calificador que resolvió: nombre + profesión (`caso.resolucion`). Se muestra al
   *  pie y se agrega al final del texto que se copia a CeroFilas. */
  calificadorNombre?: string | null;
  calificadorProfesion?: string | null;
  /** Snapshot de `casos.ficha_editada` (BD). En el histórico es la única fuente de lo que el
   *  calificador dejó (localStorage puede no existir en ese navegador). */
  fichaEditada?: Record<string, string> | null;
  /** Decisión final del calificador (`caso.resolucion`) — alimenta la sección PROPUESTA del
   *  campo "Observaciones Datos Relevantes de Calificación" con el % / MR / REEV finales. */
  resolucion?: ResolucionCalificador | null;
}) {
  const bloques = useMemo(() => construirBloques(analisis), [analisis]);
  const bloqueCerofilas = useMemo(() => bloques.find((b) => b.id === "cerofilas")!, [bloques]);

  // Lo que el calificador dejó, con prioridad: análisis original → snapshot de la BD
  // (ficha_editada) → localStorage (lo más reciente de este navegador, si existe). Incluye
  // TODOS los campos de la ficha, no solo los de CeroFilas, porque "Antecedentes Sociales
  // Relevantes" se arma con los 5 sub-campos del bloque ANTECEDENTES SOCIALES.
  const valores = useMemo(() => {
    const base: Record<string, string> = {};
    for (const b of bloques) for (const campo of b.campos) base[campo.id] = campo.valor;
    let resultado = { ...base, ...(fichaEditada ?? {}) };
    try {
      const guardado = localStorage.getItem(clavePorCaso(casoId));
      if (guardado) resultado = { ...resultado, ...JSON.parse(guardado) };
    } catch {
      // Sin storage disponible: se usa lo anterior.
    }
    if (modificado && porcentajeFinal !== null) {
      resultado = { ...resultado, cf_porcentaje: String(porcentajeFinal) };
    }
    return resultado;
  }, [bloques, casoId, modificado, porcentajeFinal, fichaEditada]);

  // Firma que va al pie de la pantalla y también al final del texto que se pega en CeroFilas.
  const firmaCalificador = calificadorNombre
    ? `${calificadorNombre}\n${calificadorProfesion ?? "Profesión no registrada"}`
    : null;

  // "Observaciones Datos Relevantes de Calificación": todo el informe + PROPUESTA con la
  // decisión final. Se calcula una vez y se reusa en la tarjeta y en el texto que se copia.
  const textoObservaciones = useMemo(
    () =>
      textoObservacionesCerofilas(
        bloques,
        valores,
        analisis,
        resolucion,
        porcentajeFinal,
        calificadorNombre,
        calificadorProfesion
      ),
    [bloques, valores, analisis, resolucion, porcentajeFinal, calificadorNombre, calificadorProfesion]
  );

  const textoCerofilas = () => {
    // Antecedentes → 5 sub-campos. Observaciones → el informe completo con la decisión final.
    const valoresCopia = {
      ...valores,
      cf_antecedentes: `\n${textoAntecedentesSociales(valores)}`,
      cf_observaciones: `\n${textoObservaciones}`,
    };
    const base = bloqueATexto(bloqueCerofilas, valoresCopia);
    return firmaCalificador ? `${base}\n\n${firmaCalificador}` : base;
  };

  return (
    <div className="rounded-xl border border-[var(--atm-linea)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--atm-linea)] px-5 py-4">
        <h2 className="border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
          {bloqueCerofilas.titulo}
        </h2>
        <BotonCopiar obtenerTexto={textoCerofilas} />
      </div>

      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {bloqueCerofilas.campos.map((campo) =>
            campo.id === "cf_antecedentes" ? (
              <div key={campo.id} className="overflow-hidden rounded-lg border border-[var(--atm-linea)]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--atm-linea)] bg-zinc-50 px-3 py-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--atm-azul2)]">
                    {campo.etiqueta}
                  </p>
                  <BotonCopiar obtenerTexto={() => textoAntecedentesSociales(valores)} />
                </div>
                <div className="flex flex-col divide-y divide-[var(--atm-linea)]">
                  {lineasAntecedentesSociales(valores).map((l) => (
                    <div key={l.etiqueta} className="px-3 py-2">
                      <p className="text-xs font-semibold text-zinc-900">{l.etiqueta}</p>
                      <p className="mt-0.5 whitespace-pre-line text-sm text-zinc-700">{l.valor || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : campo.id === "cf_observaciones" ? (
              <div key={campo.id} className="overflow-hidden rounded-lg border border-[var(--atm-linea)]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--atm-linea)] bg-zinc-50 px-3 py-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--atm-azul2)]">
                    {campo.etiqueta}
                  </p>
                  <BotonCopiar obtenerTexto={() => textoObservaciones} />
                </div>
                <p className="whitespace-pre-wrap break-words px-3 py-2 text-sm text-zinc-700">
                  {textoObservaciones}
                </p>
              </div>
            ) : (
              <CampoCerofilas
                key={campo.id}
                etiqueta={campo.etiqueta}
                valor={valores[campo.id] ?? campo.valor}
                original={campo.valor}
              />
            )
          )}
        </div>

        <p className="mt-4 border-l-4 border-[var(--atm-azul2)] pl-2 text-sm font-semibold text-[var(--atm-azul)]">
          Datos de usuario revisados.
        </p>
        {firmaCalificador && (
          <div className="mt-2 rounded-lg border border-[var(--atm-linea)] bg-zinc-50 px-3 py-3 text-sm">
            <p className="font-semibold text-zinc-900">{calificadorNombre}</p>
            <p className="text-zinc-500">{calificadorProfesion ?? "Profesión no registrada"}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--atm-linea)] px-5 py-4">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg border border-[var(--atm-linea)] px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Volver a página principal
        </button>
        <button
          type="button"
          onClick={onYaLoSubi}
          disabled={subiendo}
          className="rounded-lg bg-[var(--atm-azul)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {subiendo ? "Guardando..." : "Ya lo subí a CeroFilas"}
        </button>
      </div>
    </div>
  );
}
