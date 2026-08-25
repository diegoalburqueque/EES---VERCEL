import type { AnalisisQA } from "./analisis";

export type EstadoChecklist = "APTO" | "REQUIERE_REVISION" | "NO_APTO";
export type EstadoCalificacion = "PENDIENTE" | "CALIFICADO";

export interface ChecklistItem {
  item: string;
  cumple: boolean;
  evidencia: string;
}

export interface DocumentoCaso {
  tipo: string;
  link: string;
}

export interface PropuestaCalificacion {
  diagnosticoPrincipal: string;
  diagnosticoSecundario: string | null;
  porcentajeIvadecIA: number;
  porcentajeFinal: number | null; // null hasta que el calificador confirma o modifica
  fundamento: string;
  modificadoPorCalificador: boolean;
  checklist: ChecklistItem[];
  documentos: DocumentoCaso[];
}

export interface Caso {
  id: string;
  idTramite: string;
  region: "RM" | "OHIGGINS" | "BIOBIO" | "ANTOFAGASTA";
  rut: string;
  nombreCompleto: string;
  estadoChecklist: EstadoChecklist;
  estadoCalificacion: EstadoCalificacion;
  /** Estado del flujo en la tabla `estados_caso`: BORRADOR, EN_REVISION, FINALIZADO, etc. */
  estadoCaso: string;
  calificadorAsignadoId: string | null;
  calificadorNombre?: string | null; // solo lo llena el endpoint de admin, para no cruzar con la lista mock de usuarios
  fechaAsignacion: string;
  fechaCalificacion: string | null;
  propuesta: PropuestaCalificacion;
  /**
   * Ficha QA completa del bot, leída directo de `casos.analysis_json` en Supabase.
   * Es null si el bot todavía no generó el análisis para ese ID de trámite (falló en la IA).
   */
  analisis: AnalisisQA | null;
}

// Dataset mock — reemplazar por consulta a la base de datos (tabla casos + tabla propuestas) cuando el backend esté listo.
export const casos: Caso[] = [
  {
    id: "c-001",
    idTramite: "32542103",
    region: "RM",
    rut: "12.345.678-9",
    nombreCompleto: "María Elena Soto",
    estadoChecklist: "APTO",
    estadoCalificacion: "PENDIENTE",
    calificadorAsignadoId: "u-003",
    fechaAsignacion: "2026-08-18",
    fechaCalificacion: null,
    analisis: null,
    estadoCaso: "BORRADOR",
    propuesta: {
      diagnosticoPrincipal: "Artrosis de rodilla bilateral",
      diagnosticoSecundario: "Hipertensión arterial",
      porcentajeIvadecIA: 42,
      porcentajeFinal: null,
      fundamento:
        "Cédula, IBF, ISRA e IVADEC vigentes y concordantes entre sí. RUT y fecha de nacimiento coinciden en los 4 documentos. Profesional idóneo y firma/timbre verificados.",
      modificadoPorCalificador: false,
      checklist: [
        { item: "Cédula de identidad vigente", cumple: true, evidencia: "Vigencia hasta 2028." },
        { item: "IBF completo y firmado", cumple: true, evidencia: "Firma y timbre de asistente social." },
        { item: "ISRA completo y firmado", cumple: true, evidencia: "Firma y timbre de terapeuta ocupacional." },
        { item: "IVADEC vigente y firmado", cumple: true, evidencia: "Calificador IVADEC identificado." },
      ],
      documentos: [
        { tipo: "Cédula", link: "https://drive.google.com/mock/cedula-32542103" },
        { tipo: "IBF", link: "https://drive.google.com/mock/ibf-32542103" },
        { tipo: "ISRA", link: "https://drive.google.com/mock/isra-32542103" },
        { tipo: "IVADEC", link: "https://drive.google.com/mock/ivadec-32542103" },
      ],
    },
  },
  {
    id: "c-002",
    idTramite: "33417665",
    region: "RM",
    rut: "9.876.543-2",
    nombreCompleto: "Pedro Antonio Vera",
    estadoChecklist: "REQUIERE_REVISION",
    estadoCalificacion: "PENDIENTE",
    calificadorAsignadoId: "u-003",
    fechaAsignacion: "2026-08-19",
    fechaCalificacion: null,
    analisis: null,
    estadoCaso: "BORRADOR",
    propuesta: {
      diagnosticoPrincipal: "Trastorno depresivo mayor",
      diagnosticoSecundario: null,
      porcentajeIvadecIA: 35,
      porcentajeFinal: null,
      fundamento:
        "Diferencia menor tolerada: el nombre en el IBF aparece como 'Pedro A. Vera' mientras que en cédula figura 'Pedro Antonio Vera'. RUT completo y fecha de nacimiento coinciden en los 4 documentos, por lo que se tolera como typo menor, no como discordancia de identidad.",
      modificadoPorCalificador: false,
      checklist: [
        { item: "Cédula de identidad vigente", cumple: true, evidencia: "Vigencia hasta 2027." },
        {
          item: "Coincidencia de nombre entre documentos",
          cumple: false,
          evidencia: "Diferencia menor tolerada por RUT + fecha de nacimiento ancla.",
        },
        { item: "ISRA completo y firmado", cumple: true, evidencia: "Firma y timbre correctos." },
        { item: "IVADEC vigente y firmado", cumple: true, evidencia: "Calificador IVADEC identificado." },
      ],
      documentos: [
        { tipo: "Cédula", link: "https://drive.google.com/mock/cedula-33417665" },
        { tipo: "IBF", link: "https://drive.google.com/mock/ibf-33417665" },
        { tipo: "ISRA", link: "https://drive.google.com/mock/isra-33417665" },
        { tipo: "IVADEC", link: "https://drive.google.com/mock/ivadec-33417665" },
      ],
    },
  },
  {
    id: "c-003",
    idTramite: "32707392",
    region: "RM",
    rut: "18.234.567-1",
    nombreCompleto: "Menor de edad (representado)",
    estadoChecklist: "NO_APTO",
    estadoCalificacion: "PENDIENTE",
    calificadorAsignadoId: null,
    fechaAsignacion: "2026-08-19",
    fechaCalificacion: null,
    analisis: null,
    estadoCaso: "BORRADOR",
    propuesta: {
      diagnosticoPrincipal: "Sin determinar",
      diagnosticoSecundario: null,
      porcentajeIvadecIA: 0,
      porcentajeFinal: null,
      fundamento: "Caso NO_APTO — reservado para revisión del admin, no visible para el calificador.",
      modificadoPorCalificador: false,
      checklist: [],
      documentos: [],
    },
  },
  {
    id: "c-004",
    idTramite: "33854673",
    region: "BIOBIO",
    rut: "15.111.222-3",
    nombreCompleto: "Ana Luisa Fuentes",
    estadoChecklist: "APTO",
    estadoCalificacion: "CALIFICADO",
    calificadorAsignadoId: "u-003",
    fechaAsignacion: "2026-08-17",
    fechaCalificacion: "2026-08-18",
    analisis: null,
    estadoCaso: "BORRADOR",
    propuesta: {
      diagnosticoPrincipal: "Espondiloartrosis lumbar",
      diagnosticoSecundario: "Diabetes mellitus tipo 2",
      porcentajeIvadecIA: 38,
      porcentajeFinal: 38,
      fundamento: "Cédula, IBF, ISRA e IVADEC vigentes y concordantes entre sí.",
      modificadoPorCalificador: false,
      checklist: [
        { item: "Cédula de identidad vigente", cumple: true, evidencia: "Vigencia hasta 2029." },
        { item: "IBF completo y firmado", cumple: true, evidencia: "Firma y timbre correctos." },
        { item: "ISRA completo y firmado", cumple: true, evidencia: "Firma y timbre correctos." },
        { item: "IVADEC vigente y firmado", cumple: true, evidencia: "Calificador IVADEC identificado." },
      ],
      documentos: [
        { tipo: "Cédula", link: "https://drive.google.com/mock/cedula-33854673" },
        { tipo: "IBF", link: "https://drive.google.com/mock/ibf-33854673" },
        { tipo: "ISRA", link: "https://drive.google.com/mock/isra-33854673" },
        { tipo: "IVADEC", link: "https://drive.google.com/mock/ivadec-33854673" },
      ],
    },
  },
];
