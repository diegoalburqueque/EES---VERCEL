const ZONA_HORARIA = "America/Santiago";

/**
 * Normaliza a `YYYY-MM-DD` en hora de Chile.
 *
 * `pg` entrega los `timestamptz` como `Date`, y `String(date)` produce el formato inglés
 * ("Thu Aug 20 2026 …"), así que hay que formatear explícitamente. El locale "sv-SE" es el
 * atajo estándar para obtener ISO; la zona horaria evita que un caso guardado de noche
 * aparezca con la fecha del día siguiente.
 */
export function aFechaISO(valor: Date | string | null): string {
  if (!valor) return "";
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return typeof valor === "string" ? valor.slice(0, 10) : "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA_HORARIA }).format(fecha);
}

/** Fecha lista para mostrar en la interfaz: 20-08-2026. */
export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia}-${mes}-${anio}`;
}
