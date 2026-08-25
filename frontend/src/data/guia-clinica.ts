/**
 * Tabla "INFORMACIÓN CLÍNICA REQUERIDA EN IBF O EN INFORMES COMPLEMENTARIOS".
 *
 * Transcripción de `rules/manuales/M3-guia-clinica.md` — ese archivo es la fuente; si
 * cambia, hay que actualizar este módulo. Sirve para mostrarle al calificador, dentro de
 * la ficha, sólo la fila que corresponde al diagnóstico del caso, en vez de obligarlo a
 * abrir el PDF y buscarla.
 *
 * El emparejamiento es por palabras clave sobre el texto libre del diagnóstico, así que
 * es una ayuda de lectura, no una clasificación clínica: el manual completo sigue siendo
 * la autoridad y el criterio final es del profesional.
 */

export type OrigenDiscapacidad =
  | "FÍSICO"
  | "MENTAL PSÍQUICO"
  | "MENTAL INTELECTUAL"
  | "SENSORIAL AUDITIVO"
  | "SENSORIAL VISUAL"
  | "DEPENDE DE LA SECUELA";

export interface EntradaGuiaClinica {
  /** Ancla en M3, para citar la fuente: `M3§<id>`. */
  id: string;
  diagnostico: string;
  /** Quién puede firmar el informe. */
  profesional: string;
  /** Qué debe describir el IBF o el informe complementario. */
  debeDescribir: string;
  /** Complementarios y escalas que hay que rescatar. */
  rescatar: string[];
  origen: OrigenDiscapacidad;
  /** Reglas particulares del cuadro (aceptaciones, excepciones, menores de edad). */
  notas?: string[];
  /**
   * Palabras que se buscan en el diagnóstico del caso, ya normalizadas (minúsculas y sin
   * tildes). Son raíces a propósito: "artros" cubre artrosis y artrósico.
   */
  claves: string[];
  /**
   * Profesiones que el manual acepta como firmantes del informe, en raíces normalizadas.
   * Se comparan contra quien firmó el IBF para avisar cuando no es el idóneo.
   */
  profesionalesAceptados: string[];
}

/**
 * Profesiones que acepta la fórmula genérica del manual:
 * "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf."
 */
const PROFESIONAL_GENERICO = [
  "medic",
  "med.",
  "med ",
  "doctor",
  "cirujano",
  "terapeuta ocupacional",
  "t.o.",
  "kinesiolog",
  "klgo",
  "fonoaudiolog",
  "flgo",
  "psicolog",
  "psic.",
  "enfermer",
  "enf.",
];

export const GUIA_CLINICA: EntradaGuiaClinica[] = [
  {
    id: "acv",
    diagnostico: "ACV secuelado",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Tipo y fecha del ACV, causa, evolución, tratamientos y rehabilitación realizada o pendiente. Debe especificar secuelas motoras, sensitivas, cognitivas, visuales, conductuales, del lenguaje, habla o deglución; alteraciones de marcha y equilibrio; dependencia en actividades de la vida diaria y asistencia de terceros.",
    rescatar: [
      "Epicrisis",
      "Ayuda Técnica",
      "Índice de Barthel",
      "Índice de Lawton y Brody",
      "Escala de Rankin modificada",
    ],
    origen: "DEPENDE DE LA SECUELA",
    claves: ["acv", "accidente cerebrovascular", "cerebrovascular", "ictus", "hemiplej", "hemipares"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "amputaciones",
    diagnostico: "Amputaciones",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Causa, fecha, extremidad, lateralidad y nivel anatómico de la amputación; estado, dolor residual o fantasma, uso y adaptación de prótesis, ayudas técnicas y rehabilitación. Debe señalar las limitaciones que ésta produce.",
    rescatar: ["Epicrisis o Protocolo Operatorio", "Ayuda técnica que utiliza"],
    origen: "FÍSICO",
    claves: ["amputa", "protesis", "muñon"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "artrosis",
    diagnostico: "Artrosis",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Articulación comprometida, lateralidad, tiempo de evolución, gravedad, dolor, rigidez, limitación del rango articular, deformidades, alteración de fuerza, marcha y equilibrio; tratamientos realizados, respuesta, cirugías indicadas o pendientes.",
    rescatar: [
      "Informe imagenológico de la articulación afectada",
      "Epicrisis o Protocolo Operatorio",
      "Ayuda Técnica",
    ],
    origen: "FÍSICO",
    claves: ["artros", "gonartros", "coxartros", "artrosico"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "cancer",
    diagnostico: "Cáncer",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Informe oncológico actualizado con diagnóstico específico, localización, estadio y extensión de la enfermedad; evolución clínica; tratamientos realizados, actuales y pendientes; respuesta terapéutica; pronóstico; secuelas y compromiso funcional asociado.",
    rescatar: [
      "Informe Anátomo Patológico",
      "Secuelas específicas según el órgano comprometido",
      "Escala ECOG",
      "Índice de Karnofsky",
    ],
    origen: "FÍSICO",
    claves: [
      "cancer",
      "oncolog",
      "tumor",
      "neoplas",
      "carcinoma",
      "linfoma",
      "leucemia",
      "mieloma",
      "sarcoma",
      "metastas",
    ],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "cardiacas",
    diagnostico: "Enfermedades cardíacas (ICC, arritmias, infarto agudo del miocardio, etc.)",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Diagnóstico, evolución y gravedad de la enfermedad; función cardíaca objetiva (disnea, fatiga, angina, palpitaciones, síncope, intolerancia al esfuerzo y limitaciones para las actividades de la vida diaria); tratamiento realizado y actual; eventos cardiovasculares relevantes y repercusión en las actividades de la vida diaria.",
    rescatar: ["Ecocardiograma", "Capacidad funcional", "Clasificación funcional NYHA"],
    origen: "FÍSICO",
    claves: [
      "cardiac",
      "cardiopat",
      "insuficiencia cardiaca",
      "icc",
      "arritmia",
      "infarto",
      "miocardio",
      "coronari",
      "valvulopat",
      "fibrilacion auricular",
    ],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "respiratorias",
    diagnostico: "Enfermedades respiratorias (EPOC, LCFA, asma, fibrosis pulmonar, etc.)",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Diagnóstico y evolución de la enfermedad respiratoria, grado de severidad, pruebas de función pulmonar, exacerbaciones, tratamiento realizado y actual, y repercusión funcional, incluyendo limitación para el esfuerzo y actividades de la vida diaria.",
    rescatar: [
      "Espirometría",
      "VEF1 (% predicho)",
      "Saturación de O₂",
      "Necesidad de O₂",
      "TAC de tórax",
    ],
    origen: "FÍSICO",
    claves: ["epoc", "lcfa", "asma", "fibrosis pulmonar", "respiratori", "pulmonar", "bronquiectasia"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "demencia",
    diagnostico: "Demencia / Deterioro cognitivo / Trastorno neurocognitivo",
    profesional:
      "Neurólogo/a, Psiquiatra, Geriatra o Médico/a tratante del Programa de Salud Mental, Programa de Memoria, Programa de Atención Domiciliaria a Personas con Dependencia Severa (Postrados) o PADI.",
    debeDescribir:
      "Tipo y causa del trastorno neurocognitivo, gravedad, tiempo de evolución, compromiso de memoria y otras funciones cognitivas, síntomas conductuales o emocionales, tratamientos y pronóstico. Debe especificar repercusión en la autonomía, seguridad, manejo de medicamentos y dinero, orientación, actividades de la vida diaria, necesidad de supervisión y asistencia de terceros.",
    rescatar: [
      "Índice de Barthel",
      "Escala de Lawton y Brody",
      "Cuestionario de Pfeiffer",
      "MMSE, MoCA",
      "Debe identificarse al informante o cuidador",
      "Informe de neuroimagen",
      "Ayuda Técnica",
    ],
    origen: "MENTAL PSÍQUICO",
    notas: [
      "Es admisible si se indica que el profesional es parte de alguno de esos programas.",
      "El ingreso del trámite debe hacerse con ClaveÚnica de un representante (M1§ingreso.representante).",
    ],
    claves: ["demencia", "alzheimer", "deterioro cognitivo", "neurocognitiv"],
    profesionalesAceptados: ["neurolog", "psiquiatr", "geriatr", "salud mental", "memoria", "padi", "postrado", "domiciliaria"],
  },
  {
    id: "daño-cerebral",
    diagnostico: "Daño orgánico cerebral",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Causa, diagnóstico neurológico, fecha de inicio, localización y extensión de la lesión, evolución y carácter estable o progresivo. Debe describir secuelas cognitivas, conductuales, motoras, sensitivas, visuales, del lenguaje, habla o deglución; presencia de epilepsia; tratamientos, rehabilitación, ayudas técnicas, autonomía y necesidad de supervisión o asistencia de terceros.",
    rescatar: [
      "Índice de Barthel",
      "Escala de Lawton y Brody",
      "Informe de neuroimagen",
      "Ayuda Técnica",
    ],
    origen: "MENTAL PSÍQUICO",
    claves: [
      "dano organico cerebral",
      "dano cerebral",
      "organico cerebral",
      "tec ",
      "traumatismo encefalocraneano",
      "encefalopat",
    ],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "di",
    diagnostico: "Discapacidad intelectual",
    profesional:
      "De 6 a 18 años: psicometría (WAIS-WISC) o informe descriptivo de Psicólogo. Mayores de 18: psicometría (WAIS) o informe de Psicólogo, Psiquiatra, Neurólogo o Médico de Programa de Salud Mental.",
    debeDescribir:
      "Grado de discapacidad intelectual (leve, moderada, severa). Se aceptan diagnósticos de especialistas que especifiquen el CI sin psicometría, sólo por neurólogo o psiquiatra con informe descriptivo.",
    rescatar: ["Psicometría WAIS / WISC", "Informe descriptivo con grado de DI o CI"],
    origen: "MENTAL INTELECTUAL",
    notas: [
      "Ver M3§sindromes: hay síndromes genéticos que permiten origen MENTAL INTELECTUAL sin psicometría.",
    ],
    claves: [
      "discapacidad intelectual",
      "retraso mental",
      "deficiencia mental",
      "coeficiente intelectual",
      "retardo mental",
    ],
    profesionalesAceptados: ["psicolog", "psiquiatr", "neurolog", "salud mental"],
  },
  {
    id: "tea",
    diagnostico: "Trastorno del Espectro Autista (TEA)",
    profesional: "Psiquiatra o Neurólogo.",
    debeDescribir:
      "Fundamentos del diagnóstico, nivel de apoyo requerido —1, 2 o 3—, desarrollo cognitivo y del lenguaje, comorbilidades, tratamientos, medicamentos y evolución. Debe especificar limitaciones.",
    rescatar: [
      "Autocuidado",
      "Aprendizaje",
      "Flexibilidad",
      "Desregulaciones",
      "Participación familiar, escolar, social o laboral",
      "Necesidad de supervisión",
    ],
    origen: "MENTAL PSÍQUICO",
    claves: ["autis", "espectro autista", "tea ", "asperger"],
    profesionalesAceptados: ["psiquiatr", "neurolog"],
  },
  {
    id: "depresion",
    diagnostico: "Depresión / Trastorno mixto de ansiedad y depresión",
    profesional: "Psiq. / Méd. de Programa de Salud Mental, Psic.",
    debeDescribir:
      "Diagnóstico específico, gravedad, fecha de inicio, evolución, recurrencias, síntomas actuales, comorbilidades, riesgo suicida, hospitalizaciones, tratamientos farmacológicos y psicoterapéuticos, adherencia, respuesta, efectos adversos y pronóstico. Debe especificar la repercusión en la funcionalidad.",
    rescatar: [
      "Autocuidado",
      "Concentración",
      "Relaciones interpersonales",
      "Participación social",
      "Desempeño educativo o laboral",
    ],
    origen: "MENTAL PSÍQUICO",
    claves: ["depresi", "depresivo", "ansied", "ansioso", "distimia", "animo", "panico"],
    profesionalesAceptados: ["psiquiatr", "psicolog", "salud mental"],
  },
  {
    id: "psiquiatricos-mayores",
    diagnostico:
      "Trastorno bipolar, trastorno esquizoafectivo, trastornos de la personalidad, esquizofrenia",
    profesional: "Psiq. / Méd. de Programa de Salud Mental, Psic.",
    debeDescribir:
      "Diagnóstico, fecha de inicio, evolución, síntomas actuales, descompensaciones, episodios afectivos o psicóticos, hospitalizaciones, comorbilidades, consumo de sustancias, tratamiento farmacológico y psicosocial, adherencia, respuesta, efectos adversos y pronóstico. Debe especificar la repercusión en la funcionalidad.",
    rescatar: [
      "Autocuidado",
      "Concentración",
      "Relaciones interpersonales",
      "Participación social",
      "Desempeño educativo o laboral",
      "Manejo del dinero",
      "Necesidad de supervisión o asistencia de terceros",
    ],
    origen: "MENTAL PSÍQUICO",
    claves: [
      "esquizofren",
      "esquizoafect",
      "bipolar",
      "trastorno de la personalidad",
      "trastorno de personalidad",
      "psicosis",
      "psicotic",
      "paranoide",
    ],
    profesionalesAceptados: ["psiquiatr", "psicolog", "salud mental"],
  },
  {
    id: "sustancias",
    diagnostico: "Trastornos por abuso de sustancias",
    profesional: "Psiq. / Méd. de Programa de Salud Mental, Psic.",
    debeDescribir:
      "Sustancias consumidas, patrón, gravedad y tiempo de evolución; fecha del último consumo, períodos de abstinencia, recaídas, episodios de intoxicación, abstinencia o sobredosis, hospitalizaciones y tratamientos realizados. Debe describir comorbilidades psiquiátricas y médicas, secuelas cognitivas, neurológicas o físicas, adherencia, respuesta terapéutica y pronóstico.",
    rescatar: [
      "Autocuidado",
      "Desempeño laboral",
      "Relaciones familiares y sociales",
      "Necesidad de supervisión",
      "Manejo de dinero",
    ],
    origen: "MENTAL PSÍQUICO",
    claves: ["abuso de sustancias", "dependencia de", "alcohol", "drogas", "adicci", "consumo problematico"],
    profesionalesAceptados: ["psiquiatr", "psicolog", "salud mental"],
  },
  {
    id: "parkinson",
    diagnostico: "Enfermedad de Parkinson",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      'Fecha de inicio, evolución, etapa de la enfermedad, síntomas motores y no motores, fluctuaciones "on-off", discinesias, alteraciones de marcha y equilibrio, caídas, compromiso cognitivo, del habla o deglución; tratamientos, respuesta y rehabilitación.',
    rescatar: [
      "Índice de Barthel",
      "Escala de Lawton y Brody",
      "Ayuda Técnica",
      "Necesidad de supervisión o asistencia de terceros",
    ],
    origen: "FÍSICO",
    claves: ["parkinson", "parkinsoniano"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "erc",
    diagnostico: "Enfermedad renal crónica en diálisis",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Causa de la enfermedad renal, etapa, fecha de inicio y modalidad de diálisis —hemodiálisis o peritoneodiálisis—, frecuencia, acceso vascular o peritoneal, adherencia, tolerancia, complicaciones, hospitalizaciones, tratamientos y eventual condición para trasplante.",
    rescatar: [
      "Hemodiálisis",
      "Diálisis peritoneal",
      "Condición para trasplante",
      "Informe nefrológico",
      "Ceroteca",
    ],
    origen: "FÍSICO",
    claves: ["renal cronica", "dialisis", "hemodialisis", "erc", "nefropat", "insuficiencia renal"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "epilepsia",
    diagnostico: "Epilepsia",
    profesional: "Neurólogo.",
    debeDescribir:
      "Tipo y causa de la epilepsia, edad de inicio, características, frecuencia y duración de las crisis, alteración de conciencia, fecha de la última crisis, período posictal, lesiones asociadas, episodios de estatus epiléptico, factores desencadenantes y grado de control. Debe señalar tratamiento, adherencia, respuesta, efectos adversos, hospitalizaciones, comorbilidades cognitivas o conductuales y necesidad de supervisión.",
    rescatar: ["Electroencefalograma", "Informe de neuroimagen", "Necesidad de supervisión"],
    origen: "MENTAL PSÍQUICO",
    claves: ["epileps", "epileptic", "crisis convulsiva", "convulsi"],
    profesionalesAceptados: ["neurolog"],
  },
  {
    id: "fibromialgia",
    diagnostico: "Fibromialgia",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Tiempo de evolución, dolor generalizado, fatiga, alteraciones del sueño y cognitivas, síntomas asociados, comorbilidades, tratamientos farmacológicos y no farmacológicos, adherencia, respuesta y pronóstico. Debe especificar la repercusión en la movilidad, tolerancia al esfuerzo, actividades de la vida diaria y desempeño social o laboral.",
    rescatar: [
      "Índice de dolor generalizado (WPI)",
      "Repercusiones de la movilidad",
      "Tratamiento farmacológico",
    ],
    origen: "FÍSICO",
    claves: ["fibromialgia"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "hipoacusia",
    diagnostico: "Hipoacusia",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir: "Debe contar con Audiometría.",
    rescatar: ["Audiometría", "Potencial evocado"],
    origen: "SENSORIAL AUDITIVO",
    notas: [
      "Se acepta GES confirmado en lugar de audiometría, sólo si indica lateralidad y severidad.",
      "Si es diagnóstico secundario: se acepta informe de Otorrinolaringología sin audiometría, a cualquier edad.",
      "Menores sin lenguaje: potencial evocado auditivo o examen BERA.",
    ],
    claves: ["hipoacusia", "sordera", "auditiv", "sordo"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO, "otorrino"],
  },
  {
    id: "disautonomia",
    diagnostico: "Disautonomía",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Resultado de la prueba de mesa basculante (Tilt Test) y/o informe cardiológico complementario actualizado que fundamente el diagnóstico y describa su repercusión funcional.",
    rescatar: ["Tilt Test"],
    origen: "FÍSICO",
    claves: ["disautonomia", "disautonomic"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "ar",
    diagnostico: "Artritis reumatoide",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Tiempo de evolución, articulaciones comprometidas, actividad de la enfermedad, dolor, rigidez matinal, inflamación, deformidades, pérdida de fuerza y rango articular; manifestaciones extraarticulares, tratamientos realizados y actuales, adherencia, respuesta, cirugías, ayudas técnicas y pronóstico.",
    rescatar: [
      "Informe imagenológico de la articulación afectada",
      "Epicrisis o Protocolo Operatorio",
      "Ayuda Técnica",
    ],
    origen: "FÍSICO",
    claves: ["artritis reumatoide", "artritis"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "columna",
    diagnostico: "Patologías de columna",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Diagnóstico, segmento comprometido —cervical, dorsal o lumbar—, causa, tiempo de evolución, dolor, limitación de movilidad, alteraciones de fuerza o sensibilidad, radiculopatía, compromiso medular, marcha, tratamientos realizados, respuesta, cirugías, rehabilitación, ayudas técnicas y pronóstico. Debe especificar la repercusión en las actividades de la vida diaria y la necesidad de asistencia de terceros.",
    rescatar: ["Informe imagenológico RX, TAC, Resonancia", "Electromiografía", "Ayuda Técnica"],
    origen: "FÍSICO",
    claves: [
      "columna",
      "lumbar",
      "cervical",
      "dorsal",
      "discopat",
      "hernia del nucleo",
      "hernia discal",
      "espondil",
      "lumbago",
      "ciatica",
      "radiculopat",
      "escoliosis",
    ],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "tourette",
    diagnostico: "Síndrome de Tourette",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Edad de inicio, tipos de tics motores y vocales, frecuencia, intensidad, duración, variabilidad, capacidad de supresión, factores desencadenantes, lesiones o dolor asociados y evolución.",
    rescatar: [
      "Repercusión en las actividades de la vida diaria (relaciones sociales y desempeño escolar o laboral)",
      "Escala Global de Gravedad de Tics de Yale (YGTSS)",
    ],
    origen: "MENTAL PSÍQUICO",
    claves: ["tourette", "tics"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "obesidad",
    diagnostico: "Obesidad mórbida u obesidad clase III",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Peso, talla, índice de masa corporal (IMC), tiempo de evolución, tratamientos realizados, respuesta y eventual indicación de cirugía bariátrica. Debe describir comorbilidades y complicaciones metabólicas, cardiovasculares, respiratorias, osteoarticulares o psicológicas, además de limitaciones para la marcha, movilidad, autocuidado y actividades de la vida diaria.",
    rescatar: ["Indicar IMC", "Autocuidado", "Ayuda Técnica"],
    origen: "FÍSICO",
    claves: ["obesidad morbida", "obesidad clase iii", "obesidad"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "vih",
    diagnostico: "VIH",
    profesional: "Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.",
    debeDescribir:
      "Fecha de diagnóstico, etapa clínica, tratamiento antirretroviral, adherencia, respuesta y efectos adversos, infecciones oportunistas, neoplasias, hospitalizaciones, comorbilidades y secuelas neurológicas, cognitivas, físicas o nutricionales. Debe especificar la repercusión en las actividades de la vida diaria y desempeño social o laboral.",
    rescatar: [
      "Desempeño social y laboral",
      "Autocuidado",
      "Funciones cognitivas",
      "Síndrome consuntivo",
    ],
    origen: "FÍSICO",
    notas: ["Nomenclatura: consignar como `B24 EN TARV` (M4§vih)."],
    claves: ["vih", "sida", "b24", "tarv", "inmunodeficiencia"],
    profesionalesAceptados: [...PROFESIONAL_GENERICO],
  },
  {
    id: "visual",
    diagnostico: "Visual",
    profesional: "Oftalmólogo (o los documentos aceptados que se indican).",
    debeDescribir:
      "Informe de Oftalmólogo o agudeza visual (con corrección) o informe de campo visual o receta de lentes o fondo de ojo.",
    rescatar: ["Agudeza visual con corrección", "Campo visual", "Fondo de ojo", "Receta de lentes"],
    origen: "SENSORIAL VISUAL",
    notas: [
      "Si el oftalmólogo indica CEGUERA LEGAL con patología asociada: evaluar y pasar a comisión, no pedir agudeza visual.",
      "Menores: potencial evocado visual.",
      "Vicio de refracción sin patología asociada: se rechaza, no constituye discapacidad.",
      "Vicio de refracción con patología asociada: evaluar funcionalidad y determinar porcentaje.",
      "Casos antiguos asociados a VR (ingresados el 2024): aplicar tabla de agudeza visual, evaluar y pasar a comisión.",
    ],
    claves: ["ceguera", "vision", "visual", "oftalmolog", "retinopat", "glaucoma", "catarata", "ambliop"],
    profesionalesAceptados: ["oftalmolog"],
  },
  {
    id: "afasia",
    diagnostico: "Afasia",
    profesional: "Neurólogo o Fonoaudiólogo.",
    debeDescribir:
      "La causa —ACV, traumatismo, tumor, enfermedad neurodegenerativa u otra—, fecha de inicio, tipo y gravedad de la afasia, evolución, tratamientos y rehabilitación. Debe describir el compromiso de comprensión, expresión oral, denominación, repetición, lectura y escritura, además de su repercusión en la comunicación cotidiana, autonomía y participación social o laboral.",
    rescatar: [
      "Informe de neuroimagen",
      "Autonomía",
      "Repercusión en las actividades de la vida diaria",
      "Necesidad de asistencia de terceros",
    ],
    origen: "MENTAL PSÍQUICO",
    notas: [
      "La afasia debe consignarse como secuela o trastorno del lenguaje, identificando siempre la enfermedad que la origina.",
    ],
    claves: ["afasia", "disfasia", "trastorno del lenguaje"],
    profesionalesAceptados: ["neurolog", "fonoaudiolog", "flgo"],
  },
];

/** Criterio general de M3§6 cuando el diagnóstico no tiene cuadro propio en el manual. */
export const CRITERIO_GENERAL =
  "Este diagnóstico no tiene cuadro específico en el manual M3. Aplica el criterio general: informe actualizado de profesional idóneo que describa diagnóstico, evolución, tratamiento y repercusión funcional. Deja constancia de que el diagnóstico no tiene cuadro específico en M3.";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface CoincidenciaGuia {
  entrada: EntradaGuiaClinica;
  /** true si vino del diagnóstico principal; false si sólo aparece en los secundarios. */
  esPrincipal: boolean;
}

/**
 * Busca en el manual los cuadros que corresponden a los diagnósticos del caso.
 *
 * Los del diagnóstico principal van primero, porque son los que determinan el origen y el
 * grueso de la documentación exigible.
 */
export function buscarGuiaClinica(
  diagnosticoPrincipal: string,
  diagnosticosSecundarios = ""
): CoincidenciaGuia[] {
  const principal = normalizar(diagnosticoPrincipal ?? "");
  const secundarios = normalizar(diagnosticosSecundarios ?? "");

  const coincidencias: CoincidenciaGuia[] = [];
  for (const entrada of GUIA_CLINICA) {
    const enPrincipal = entrada.claves.some((clave) => principal.includes(clave));
    const enSecundarios = entrada.claves.some((clave) => secundarios.includes(clave));
    if (enPrincipal || enSecundarios) {
      coincidencias.push({ entrada, esPrincipal: enPrincipal });
    }
  }

  return coincidencias.sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal));
}

export type ResultadoProfesional = "CORRESPONDE" | "REQUIERE_REVISION" | "NO_VERIFICABLE";

/**
 * Compara quién firmó el IBF con las profesiones que el manual exige para ese diagnóstico.
 *
 * Los cuadros de salud mental, neurología y oftalmología exigen especialista: un médico
 * general no basta. Devuelve NO_VERIFICABLE cuando el firmante no consta o es ilegible,
 * porque en ese caso no se puede afirmar ni que cumple ni que no.
 */
export function evaluarProfesional(
  ibfCompletadoPor: string,
  entrada: EntradaGuiaClinica
): ResultadoProfesional {
  const firmante = normalizar(ibfCompletadoPor ?? "");

  const noConsta =
    !firmante.trim() ||
    firmante.includes("no consta") ||
    firmante.includes("no se identifica") ||
    firmante.includes("ilegible") ||
    firmante.includes("no verificable");
  if (noConsta) return "NO_VERIFICABLE";

  const corresponde = entrada.profesionalesAceptados.some((profesion) =>
    firmante.includes(normalizar(profesion))
  );
  return corresponde ? "CORRESPONDE" : "REQUIERE_REVISION";
}

/**
 * Compara el origen que declara el caso con el que indica el manual.
 *
 * M3§5: el origen del manual es el que corresponde clínicamente; si el IVADEC declara otro
 * sin sustento, es base para proponer su modificación o eliminación. Sólo se compara contra
 * el cuadro del diagnóstico principal, y "DEPENDE DE LA SECUELA" nunca marca discrepancia.
 */
export function origenDiscrepa(origenDelCaso: string, origenDelManual: OrigenDiscapacidad): boolean {
  if (origenDelManual === "DEPENDE DE LA SECUELA") return false;
  const declarado = normalizar(origenDelCaso ?? "").replace(/[^a-z ]/g, " ");
  if (!declarado.trim()) return false;
  // "Mental Psíquico" en el JSON vs "MENTAL PSÍQUICO" en el manual: basta la primera palabra
  // significativa (fisico / mental / sensorial) más el matiz.
  const esperado = normalizar(origenDelManual);
  const palabras = esperado.split(" ").filter(Boolean);
  return !palabras.every((palabra) => declarado.includes(palabra));
}
