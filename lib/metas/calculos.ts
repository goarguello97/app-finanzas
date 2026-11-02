import Decimal from "decimal.js";
import { aDecimal } from "@/lib/dinero";
import { mesDe, sumarMeses } from "@/lib/fechas";

export interface ProgresoMeta {
  aportado: Decimal;
  objetivo: Decimal;
  falta: Decimal;
  /** Entre 0 y 1, para dibujar la barra. */
  proporcion: number;
  /** Porcentaje entero que se muestra: no llega a 100 hasta completar. */
  porcentaje: number;
  cumplida: boolean;
}

export function progresoMeta(aportado: number | string, objetivo: number | string): ProgresoMeta {
  const a = aDecimal(String(aportado));
  const o = aDecimal(String(objetivo));
  const cumplida = a.greaterThanOrEqualTo(o);
  const proporcion = Decimal.max(Decimal.min(a.dividedBy(o), 1), 0);
  const porcentaje = cumplida ? 100 : Math.min(proporcion.times(100).floor().toNumber(), 99);
  return { aportado: a, objetivo: o, falta: Decimal.max(o.minus(a), 0), proporcion: proporcion.toNumber(), porcentaje, cumplida };
}

/** Cuántos meses quedan para aportar, contando el actual. Fecha pasada o sin fecha: null. */
export function mesesRestantes(fechaObjetivo: string | null, hoy: string): number | null {
  if (!fechaObjetivo || fechaObjetivo < hoy) return null;
  const mesObjetivo = mesDe(fechaObjetivo);
  let meses = 1;
  for (let mes = mesDe(hoy); mes < mesObjetivo; mes = sumarMeses(mes, 1)) meses++;
  return meses;
}

/** Aporte por mes para llegar a tiempo, redondeado hacia arriba a centavos. */
export function aporteMensualNecesario(falta: Decimal, fechaObjetivo: string | null, hoy: string): Decimal | null {
  const meses = mesesRestantes(fechaObjetivo, hoy);
  if (meses === null || falta.isZero()) return null;
  return falta.dividedBy(meses).toDecimalPlaces(2, Decimal.ROUND_UP);
}
