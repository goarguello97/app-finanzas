import Decimal from "decimal.js";
import { aDecimal, redondear, type Moneda } from "@/lib/dinero";

export interface Cotizacion {
  fuente: string;
  compra: number;
  venta: number;
  fecha: string;
  created_at: string;
}

export type PorMoneda = Record<Moneda, Decimal>;

const HORAS_VIGENCIA = 48;

/** dolarapp se renombró a arq: según lo que devuelva CriptoYa, la fila puede venir con cualquiera de las dos. */
const ALIAS_EXCHANGE: Record<string, string[]> = { dolarapp: ["dolarapp", "arq"], arq: ["arq", "dolarapp"] };

function vacio(): PorMoneda {
  return { ARS: new Decimal(0), USD: new Decimal(0) };
}

/** La más reciente del exchange configurado. Nunca toma otro exchange: daría un total engañoso. */
export function elegirCotizacion(filas: readonly Cotizacion[], exchange: string | null): Cotizacion | null {
  if (!exchange) return null;
  const fuentes = ALIAS_EXCHANGE[exchange] ?? [exchange];
  const validas = filas.filter((c) => fuentes.includes(c.fuente) && c.compra > 0 && c.venta > 0);
  return [...validas].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function cotizacionVencida(cotizacion: Cotizacion, ahora: Date = new Date()): boolean {
  const horas = (ahora.getTime() - new Date(cotizacion.created_at).getTime()) / 3_600_000;
  return horas > HORAS_VIGENCIA;
}

/**
 * Convierte con el lado conservador: al pasar USD a ARS, lo que se recibiría al vender (venta);
 * al pasar ARS a USD, lo que costaría comprar (compra).
 */
export function convertir(monto: Decimal, de: Moneda, a: Moneda, cotizacion: Cotizacion | null): Decimal | null {
  if (de === a) return monto;
  if (!cotizacion) return null;
  return de === "USD" ? monto.times(String(cotizacion.venta)) : monto.dividedBy(String(cotizacion.compra));
}

/** Expresa un total por moneda en una sola. Si falta cotización, separa lo que no se pudo convertir. */
export function enMoneda(
  montos: PorMoneda,
  moneda: Moneda,
  cotizacion: Cotizacion | null,
): { total: Decimal; sinConvertir: Decimal } {
  const otra: Moneda = moneda === "ARS" ? "USD" : "ARS";
  const convertido = convertir(montos[otra], otra, moneda, cotizacion);
  return {
    total: redondear(convertido ? montos[moneda].plus(convertido) : montos[moneda]),
    sinConvertir: convertido ? new Decimal(0) : montos[otra],
  };
}

/** Suma los saldos por moneda. Las cuentas archivadas no cuentan, porque salieron de uso. */
export function totalesDeCuentas(
  saldos: readonly { moneda: string | null; saldo_actual: number | null; archivada: boolean | null }[],
): PorMoneda {
  const totales = vacio();
  for (const { moneda, saldo_actual, archivada } of saldos) {
    if (archivada || saldo_actual == null || (moneda !== "ARS" && moneda !== "USD")) continue;
    totales[moneda] = totales[moneda].plus(String(saldo_actual));
  }
  return totales;
}

export function resumenDelMes(
  filas: readonly { moneda: string | null; tipo: string | null; total: number | null }[],
): { ingresos: PorMoneda; gastos: PorMoneda } {
  const ingresos = vacio();
  const gastos = vacio();
  for (const { moneda, tipo, total } of filas) {
    if (total == null || (moneda !== "ARS" && moneda !== "USD")) continue;
    if (tipo === "ingreso") ingresos[moneda] = ingresos[moneda].plus(String(total));
    if (tipo === "gasto") gastos[moneda] = gastos[moneda].plus(String(total));
  }
  return { ingresos, gastos };
}

export interface FilaCategoria {
  id: string | null;
  nombre: string;
  total: Decimal;
  /** Sobre el total de gastos, con un decimal. */
  porcentaje: Decimal;
  /** Largo de la barra, entre 0 y 1, respecto de la mayor. Solo para dibujar. */
  proporcion: number;
}

/** Gastos por categoría en una moneda. Lo que no se puede convertir queda aparte, para no mezclarlo. */
export function gastosPorCategoria(
  movimientos: readonly { categoria_id: string | null; monto: number; moneda: string }[],
  categorias: readonly { id: string; nombre: string; excluye_totales: boolean }[],
  moneda: Moneda,
  cotizacion: Cotizacion | null,
): { filas: FilaCategoria[]; total: Decimal; sinConvertir: Decimal } {
  const categoriaDe = new Map(categorias.map((c) => [c.id, c]));
  const acumulado = new Map<string | null, Decimal>();
  let sinConvertir = new Decimal(0);

  for (const m of movimientos) {
    if (m.categoria_id && categoriaDe.get(m.categoria_id)?.excluye_totales) continue;
    const monto = convertir(aDecimal(String(m.monto)), m.moneda as Moneda, moneda, cotizacion);
    if (!monto) {
      sinConvertir = sinConvertir.plus(String(m.monto));
      continue;
    }
    // Una categoría borrada deja el movimiento con categoria_id null: va a "Sin categoría".
    acumulado.set(m.categoria_id, (acumulado.get(m.categoria_id) ?? new Decimal(0)).plus(monto));
  }

  const total = [...acumulado.values()].reduce((suma, v) => suma.plus(v), new Decimal(0));
  const mayor = Decimal.max(0, ...acumulado.values());

  const filas = [...acumulado.entries()]
    .map(([id, valor]) => ({
      id,
      nombre: id ? (categoriaDe.get(id)?.nombre ?? "Sin categoría") : "Sin categoría",
      total: redondear(valor),
      porcentaje: total.isZero() ? new Decimal(0) : valor.dividedBy(total).times(100).toDecimalPlaces(1),
      proporcion: mayor.isZero() ? 0 : valor.dividedBy(mayor).toNumber(),
    }))
    .sort((a, b) => b.total.comparedTo(a.total));

  return { filas, total: redondear(total), sinConvertir };
}

export type EstadoExtra =
  | { conMinimo: false }
  | { conMinimo: true; ingresos: Decimal; minimo: Decimal; extra: Decimal; faltante: Decimal; proporcion: number };

/** Ingresos en pesos del mes contra el ingreso mínimo seguro. */
export function estadoExtra(ingresosArs: Decimal, ingresoMinimo: number | null): EstadoExtra {
  if (ingresoMinimo == null || ingresoMinimo <= 0) return { conMinimo: false };
  const minimo = aDecimal(String(ingresoMinimo));
  const diferencia = ingresosArs.minus(minimo);
  return {
    conMinimo: true,
    ingresos: ingresosArs,
    minimo,
    extra: Decimal.max(diferencia, 0),
    faltante: Decimal.max(diferencia.negated(), 0),
    proporcion: Decimal.min(ingresosArs.dividedBy(minimo), 1).toNumber(),
  };
}
