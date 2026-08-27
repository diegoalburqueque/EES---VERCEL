/**
 * NOMBRE_GENERO — ajuste de la etiqueta de profesión al género del calificador.
 *
 * La BD no tiene columna `genero` (y no la necesita: ese dato no participa de ninguna
 * lógica de calificación). En vez de crear una tabla para un dato puramente cosmético,
 * acá se infiere el género del PRIMER NOMBRE del calificador y se ajusta la etiqueta
 * neutra que viene de `profesiones.etiqueta` (ej. "Fonoaudiología" -> "Fonoaudióloga").
 *
 * Es una heurística SOLO de presentación: firma al pie de la ficha, pantalla de
 * CeroFilas, texto que se copia y resolución histórica. Ante cualquier duda devuelve
 * la etiqueta neutra tal cual — nunca inventa ni rompe.
 *
 * Si algún día llega un `genero` real desde la BD, basta con recibirlo explícito y
 * dejar esta inferencia como fallback para cuando venga `null`.
 *
 * Buscar "NOMBRE_GENERO" en el repo para todos los puntos de uso.
 */

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú|ü/g, "u")
    .replace(/ñ/g, "n");

/* NOMBRE_GENERO — nombres de pila que terminan en "a" pero son masculinos. Ampliar según planilla. */
const MASC_EN_A = new Set([
  "matias", "tomas", "nicolas", "elias", "lucas", "joshua", "bautista", "jeremias", "isaias", "ezequiel",
]);

/* NOMBRE_GENERO — nombres de pila femeninos que NO terminan en "a". Ampliar según planilla. */
const FEM_SIN_A = new Set([
  "belen", "carmen", "isabel", "raquel", "beatriz", "ester", "esther", "ruth", "soledad", "pilar",
  "consuelo", "ines", "mercedes", "dolores", "lourdes", "abigail", "flor", "nieves", "rocio", "monserrat",
  "montserrat", "millaray", "maria", "aracely", "noemi", "yasmin", "jazmin", "carol",
]);

type Genero = "F" | "M";

/** NOMBRE_GENERO — infiere género del primer nombre. `null` si no hay señal clara. */
function inferirGenero(nombreCompleto: string): Genero | null {
  const pila = norm(nombreCompleto).split(/\s+/)[0];
  if (!pila) return null;
  if (MASC_EN_A.has(pila)) return "M";
  if (FEM_SIN_A.has(pila)) return "F";
  if (pila.endsWith("a")) return "F";
  if (/[oe]$|[bcdfgjklmnprstvz]$/.test(pila)) return "M";
  return null;
}

/* NOMBRE_GENERO — etiqueta neutra (`profesiones.etiqueta`, normalizada) -> forma por género. */
const POR_GENERO: Record<string, { F: string; M: string }> = {
  kinesiologia: { F: "Kinesióloga", M: "Kinesiólogo" },
  fonoaudiologia: { F: "Fonoaudióloga", M: "Fonoaudiólogo" },
  "terapia ocupacional": { F: "Terapeuta Ocupacional", M: "Terapeuta Ocupacional" },
  enfermeria: { F: "Enfermera", M: "Enfermero" },
  psicologia: { F: "Psicóloga", M: "Psicólogo" },
};

/**
 * NOMBRE_GENERO — devuelve la profesión ajustada al género del calificador.
 * - `null` si no hay profesión.
 * - etiqueta neutra tal cual si la profesión no está mapeada o no se pudo inferir el género.
 */
export function profesionParaFirma(
  nombreCompleto?: string | null,
  profesion?: string | null,
): string | null {
  if (!profesion) return null;
  const par = POR_GENERO[norm(profesion)];
  if (!par) return profesion;
  const g = nombreCompleto ? inferirGenero(nombreCompleto) : null;
  return g ? par[g] : profesion;
}

/* NOMBRE_GENERO — rol (enum de la sesión) -> etiqueta por género. */
const ROL_POR_GENERO: Record<string, { F: string; M: string }> = {
  CALIFICADOR: { F: "Calificadora", M: "Calificador" },
  ADMIN: { F: "Administradora", M: "Administrador" },
};

/**
 * NOMBRE_GENERO — etiqueta del rol ajustada al género (inferido del nombre).
 * Si no se puede inferir, usa la forma masculina como neutra. Rol desconocido: se devuelve tal cual.
 */
export function rolParaFirma(nombreCompleto?: string | null, rol?: string | null): string {
  if (!rol) return "";
  const par = ROL_POR_GENERO[rol];
  if (!par) return rol;
  const g = nombreCompleto ? inferirGenero(nombreCompleto) : null;
  return g ? par[g] : par.M;
}
