import Decimal from "decimal.js";
import type { DeudaSimulada } from "@/lib/deudas/simulador";
import { convertir, type Cotizacion } from "@/lib/resumen/calculos";

export interface DeudaParaSimular {
  id: string | null;
  acreedor: string | null;
  moneda: string | null;
  pendiente: number | null;
  tasa_anual: number | null;
  pago_minimo: number | null;
}

export interface Preparacion {
  deudas: DeudaSimulada[];
  /** Les falta TNA o pago mínimo: no se pueden simular. */
  incompletas: { id: string; nombre: string }[];
  hayEnDolares: boolean;
  /** Hay deudas en dólares y no hay cotización para pasarlas a pesos. */
  faltaCotizacion: boolean;
  minimos: Decimal;
}

/** Pasa las deudas activas a la entrada del simulador, todas en pesos. */
export function prepararDeudas(filas: readonly DeudaParaSimular[], cotizacion: Cotizacion | null): Preparacion {
  const deudas: DeudaSimulada[] = [];
  const incompletas: Preparacion["incompletas"] = [];
  let hayEnDolares = false;
  let faltaCotizacion = false;
  let minimos = new Decimal(0);

  for (const f of filas) {
    if (!f.id || f.pendiente == null || f.pendiente <= 0) continue;
    const nombre = f.acreedor ?? "Deuda";
    if (f.tasa_anual == null || f.pago_minimo == null) {
      incompletas.push({ id: f.id, nombre });
      continue;
    }

    const esDolares = f.moneda === "USD";
    hayEnDolares ||= esDolares;
    const saldo = convertir(new Decimal(String(f.pendiente)), esDolares ? "USD" : "ARS", "ARS", cotizacion);
    const minimo = convertir(new Decimal(String(f.pago_minimo)), esDolares ? "USD" : "ARS", "ARS", cotizacion);
    if (!saldo || !minimo) {
      faltaCotizacion = true;
      continue;
    }

    const minimoRedondeado = minimo.toDecimalPlaces(2, Decimal.ROUND_UP);
    minimos = minimos.plus(minimoRedondeado);
    deudas.push({ id: f.id, nombre, saldo: saldo.toDecimalPlaces(2), tna: String(f.tasa_anual), pagoMinimo: minimoRedondeado });
  }

  return { deudas, incompletas, hayEnDolares, faltaCotizacion, minimos };
}
