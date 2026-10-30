import Decimal from "decimal.js";

export type Moneda = "ARS" | "USD";

const SIMBOLOS: Record<Moneda, string> = { ARS: "$", USD: "US$" };

/** Tope de numeric(14,2). */
const MONTO_MAXIMO = new Decimal("999999999999.99");

/** Con separador de miles en punto: 1.234.567 o 1.234.567,89 */
const CON_MILES = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
/** Sin separador de miles: 1234 o 1234,5 */
const SIN_MILES = /^\d+(,\d{1,2})?$/;
/** Punto decimal, frecuente en teclados de celular: 1234.56 */
const PUNTO_DECIMAL = /^\d+\.\d{1,2}$/;

export function aDecimal(valor: Decimal.Value): Decimal {
  return new Decimal(valor);
}

export function redondear(valor: Decimal.Value): Decimal {
  return new Decimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** 1234567.89 -> "1.234.567,89" */
export function formatearNumero(valor: Decimal.Value): string {
  const absoluto = redondear(valor).abs().toFixed(2);
  const [enteros = "0", decimales = "00"] = absoluto.split(".");
  const conMiles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = redondear(valor).isNegative() && !redondear(valor).isZero() ? "-" : "";
  return `${signo}${conMiles},${decimales}`;
}

/**
 * 1234567.89 -> "$ 1.234.567,89".
 * Formato propio en vez de Intl: el resultado es igual en server y cliente,
 * sin depender de la versión de ICU, y no pasa el monto por un float.
 */
export function formatearMonto(valor: Decimal.Value, moneda: Moneda = "ARS"): string {
  const numero = formatearNumero(valor);
  const negativo = numero.startsWith("-");
  return `${negativo ? "-" : ""}${SIMBOLOS[moneda]} ${negativo ? numero.slice(1) : numero}`;
}

/** Interpreta lo que escribe el usuario en formato es-AR. Devuelve null si no es un monto válido. */
export function parsearMonto(texto: string): Decimal | null {
  const limpio = texto.replace(/\s|\$|US\$/g, "");
  if (limpio === "") return null;

  let normalizado: string;
  if (CON_MILES.test(limpio)) {
    normalizado = limpio.replaceAll(".", "").replace(",", ".");
  } else if (SIN_MILES.test(limpio)) {
    normalizado = limpio.replace(",", ".");
  } else if (PUNTO_DECIMAL.test(limpio)) {
    normalizado = limpio;
  } else {
    return null;
  }

  const monto = new Decimal(normalizado);
  return monto.greaterThan(MONTO_MAXIMO) ? null : monto;
}

/**
 * Conversión para enviar a la base. Solo para ese límite: numeric(14,2) tiene
 * como mucho 14 dígitos significativos, y un double los representa sin pérdida.
 */
export function aNumeroDb(valor: Decimal): number {
  return redondear(valor).toNumber();
}
