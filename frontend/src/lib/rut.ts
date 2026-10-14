/** Normaliza un RUT chileno a la forma sin puntos y con guion. */
export function normalizarRut(value: string): string | null {
  const compacto = value.trim().replace(/[.\s-]/g, "").toUpperCase();
  const match = compacto.match(/^(\d{1,8})([0-9K])$/);
  if (!match) return null;

  const cuerpo = match[1];
  const digitoIngresado = match[2];
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const resto = 11 - (suma % 11);
  const digitoEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  if (digitoIngresado !== digitoEsperado) return null;

  return `${cuerpo}-${digitoEsperado}`;
}
