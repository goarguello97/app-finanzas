import { timingSafeEqual } from "node:crypto";
import { leerCotizacion, type CotizacionLeida } from "./criptoya";

/** Sin CRON_SECRET configurado no se autoriza a nadie. */
export function autorizado(encabezado: string | null, secreto: string | undefined): boolean {
  if (!secreto || !encabezado) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(encabezado);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

export interface DependenciasCron {
  leerExchange(): Promise<string | null>;
  pedirCotizaciones(): Promise<string>;
  guardar(cotizacion: CotizacionLeida): Promise<void>;
}

export type ResultadoCron = { ok: true; cotizacion: CotizacionLeida } | { ok: false; error: string };

const EXCHANGE_POR_DEFECTO = "dolarapp";

/** Si algo falla, informa el error y no guarda nada. */
export async function actualizarCotizacion(dependencias: DependenciasCron): Promise<ResultadoCron> {
  try {
    const exchange = (await dependencias.leerExchange()) ?? EXCHANGE_POR_DEFECTO;
    const lectura = leerCotizacion(await dependencias.pedirCotizaciones(), exchange);
    if (!lectura.ok) return lectura;
    await dependencias.guardar(lectura.cotizacion);
    return { ok: true, cotizacion: lectura.cotizacion };
  } catch (causa) {
    return { ok: false, error: causa instanceof Error ? causa.message : String(causa) };
  }
}
