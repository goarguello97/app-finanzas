import Decimal from "decimal.js";
import { z } from "zod";

export const URL_CRIPTOYA = "https://criptoya.com/api/usdc/ars/1";

/** dolarapp se renombró a arq: se prueba el configurado y, si no aparece, el otro nombre. */
const ALIAS: Record<string, string[]> = { dolarapp: ["dolarapp", "arq"], arq: ["arq", "dolarapp"] };

const precios = z.object({ ask: z.number().positive(), bid: z.number().positive() });

export interface CotizacionLeida {
  fuente: string;
  compra: number;
  venta: number;
}

export type ResultadoLectura = { ok: true; cotizacion: CotizacionLeida } | { ok: false; error: string };

const aDosDecimales = (valor: number) => new Decimal(String(valor)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

/**
 * Interpreta la respuesta de CriptoYa. Puede devolver texto plano ("Invalid pair") con HTTP 200,
 * y algunos exchanges traen precios en cero: nada de eso se acepta como cotización.
 */
export function leerCotizacion(texto: string, exchange: string): ResultadoLectura {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: `La respuesta no es JSON: ${texto.slice(0, 100)}` };
  }
  if (typeof datos !== "object" || datos === null) {
    return { ok: false, error: `La respuesta no es un objeto: ${texto.slice(0, 100)}` };
  }

  const fuentes = ALIAS[exchange] ?? [exchange];
  const fuente = fuentes.find((clave) => clave in datos);
  if (!fuente) return { ok: false, error: `No aparece el exchange ${fuentes.join(" ni ")} en la respuesta.` };

  const resultado = precios.safeParse((datos as Record<string, unknown>)[fuente]);
  if (!resultado.success) return { ok: false, error: `Precios inválidos para ${fuente}.` };

  // compra: lo que cuesta comprar 1 USDC (ask). venta: lo que se recibe al venderlo (bid).
  const compra = aDosDecimales(resultado.data.ask);
  const venta = aDosDecimales(resultado.data.bid);
  if (compra <= 0 || venta <= 0) return { ok: false, error: `Precios inválidos para ${fuente}.` };

  return { ok: true, cotizacion: { fuente, compra, venta } };
}
