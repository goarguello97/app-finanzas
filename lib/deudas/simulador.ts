import Decimal from "decimal.js";
import { sumarMeses } from "@/lib/fechas";

export type Estrategia = "bola_de_nieve" | "avalancha";

export interface DeudaSimulada {
  id: string;
  nombre: string;
  saldo: Decimal.Value;
  /** Tasa nominal anual en porcentaje: 60 significa 60%. */
  tna: Decimal.Value;
  pagoMinimo: Decimal.Value;
}

export interface EntradaSimulador {
  deudas: readonly DeudaSimulada[];
  /** Todo lo que se destina a deudas por mes: mínimos más extra. */
  montoMensual: Decimal.Value;
  /** Mes del primer pago, como YYYY-MM. */
  mesInicio: string;
}

export interface MovimientoDeudaMes {
  id: string;
  saldoInicial: Decimal;
  interes: Decimal;
  pago: Decimal;
  saldoFinal: Decimal;
}

export interface MesCronograma {
  numero: number;
  mes: string;
  deudas: MovimientoDeudaMes[];
  interes: Decimal;
  pago: Decimal;
  saldoFinal: Decimal;
}

export interface ResultadoDeuda {
  id: string;
  nombre: string;
  mesCancelacion: string;
  meses: number;
  intereses: Decimal;
  pagado: Decimal;
}

export interface ResultadoEstrategia {
  estrategia: Estrategia;
  deudas: ResultadoDeuda[];
  mesLibertad: string;
  meses: number;
  intereses: Decimal;
  pagado: Decimal;
  cronograma: MesCronograma[];
}

export type ErrorSimulador =
  | { codigo: "sin_deudas"; mensaje: string }
  | { codigo: "datos_invalidos"; mensaje: string; deudaId?: string }
  | { codigo: "fondos_insuficientes"; mensaje: string; minimos: Decimal; faltante: Decimal }
  | { codigo: "deuda_no_baja"; mensaje: string; deudaIds: string[] };

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ErrorSimulador };

const MESES_MAXIMOS = 1200;
const CERO = new Decimal(0);

function centavos(valor: Decimal): Decimal {
  return valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function validar(entrada: EntradaSimulador): ErrorSimulador | null {
  if (entrada.deudas.length === 0) return { codigo: "sin_deudas", mensaje: "No hay deudas para simular." };

  const monto = new Decimal(entrada.montoMensual);
  if (monto.isNaN() || monto.isNegative()) return { codigo: "datos_invalidos", mensaje: "El monto mensual no es válido." };

  for (const d of entrada.deudas) {
    const saldo = new Decimal(d.saldo);
    const tna = new Decimal(d.tna);
    const minimo = new Decimal(d.pagoMinimo);
    if (saldo.isNaN() || saldo.lessThanOrEqualTo(0)) {
      return { codigo: "datos_invalidos", mensaje: `${d.nombre}: el saldo tiene que ser mayor a cero.`, deudaId: d.id };
    }
    if (tna.isNaN() || tna.isNegative()) {
      return { codigo: "datos_invalidos", mensaje: `${d.nombre}: la TNA no puede ser negativa.`, deudaId: d.id };
    }
    if (minimo.isNaN() || minimo.isNegative()) {
      return { codigo: "datos_invalidos", mensaje: `${d.nombre}: el pago mínimo no puede ser negativo.`, deudaId: d.id };
    }
  }

  const minimos = entrada.deudas.reduce((suma, d) => suma.plus(d.pagoMinimo), CERO);
  if (monto.lessThan(minimos)) {
    return {
      codigo: "fondos_insuficientes",
      mensaje: "El monto mensual no cubre los pagos mínimos.",
      minimos,
      faltante: minimos.minus(monto),
    };
  }
  return null;
}

/** La deuda hacia la que va el sobrante del mes. Empates: se decide con el otro criterio y, al final, por orden de carga. */
function ordenar(estado: { indice: number; saldo: Decimal; tna: Decimal }[], estrategia: Estrategia) {
  return [...estado].sort((a, b) => {
    const porSaldo = a.saldo.comparedTo(b.saldo);
    const porTasa = b.tna.comparedTo(a.tna);
    const [primero, segundo] = estrategia === "avalancha" ? [porTasa, porSaldo] : [porSaldo, porTasa];
    return primero || segundo || a.indice - b.indice;
  });
}

export function simular(entrada: EntradaSimulador, estrategia: Estrategia): Resultado<ResultadoEstrategia> {
  const error = validar(entrada);
  if (error) return { ok: false, error };

  const montoMensual = new Decimal(entrada.montoMensual);
  const estado = entrada.deudas.map((d, indice) => ({
    indice,
    id: d.id,
    nombre: d.nombre,
    saldo: centavos(new Decimal(d.saldo)),
    tna: new Decimal(d.tna),
    minimo: new Decimal(d.pagoMinimo),
    intereses: CERO,
    pagado: CERO,
    mesCancelacion: null as number | null,
  }));

  const cronograma: MesCronograma[] = [];

  for (let numero = 1; estado.some((d) => d.saldo.greaterThan(0)); numero++) {
    if (numero > MESES_MAXIMOS) return { ok: false, error: errorNoBaja(estado.filter((d) => d.saldo.greaterThan(0))) };

    const activas = estado.filter((d) => d.saldo.greaterThan(0));
    const saldoAnterior = activas.reduce((suma, d) => suma.plus(d.saldo), CERO);
    // El orden se decide con el saldo del inicio del mes, antes de intereses y pagos.
    const orden = ordenar(activas, estrategia);
    const detalle = new Map<number, MovimientoDeudaMes>();

    for (const d of activas) {
      const interes = centavos(d.saldo.times(d.tna).dividedBy(100).dividedBy(12));
      detalle.set(d.indice, { id: d.id, saldoInicial: d.saldo, interes, pago: CERO, saldoFinal: CERO });
      d.saldo = d.saldo.plus(interes);
      d.intereses = d.intereses.plus(interes);
    }

    let disponible = montoMensual;
    const pagar = (d: (typeof estado)[number], monto: Decimal) => {
      const pago = Decimal.min(monto, d.saldo, disponible);
      d.saldo = d.saldo.minus(pago);
      d.pagado = d.pagado.plus(pago);
      disponible = disponible.minus(pago);
      const fila = detalle.get(d.indice);
      if (fila) fila.pago = fila.pago.plus(pago);
    };

    for (const d of activas) pagar(d, d.minimo);
    // Las canceladas ya no toman su mínimo: esa plata queda en el sobrante y va a la siguiente.
    for (const { indice } of orden) {
      const d = estado[indice];
      if (d && disponible.greaterThan(0)) pagar(d, disponible);
    }

    for (const d of activas) {
      const fila = detalle.get(d.indice);
      if (fila) fila.saldoFinal = d.saldo;
      if (d.saldo.isZero()) d.mesCancelacion = numero;
    }

    const saldoActual = activas.reduce((suma, d) => suma.plus(d.saldo), CERO);
    if (saldoActual.greaterThanOrEqualTo(saldoAnterior)) {
      const estancadas = activas.filter((d) => {
        const fila = detalle.get(d.indice);
        return fila && d.saldo.greaterThanOrEqualTo(fila.saldoInicial);
      });
      return { ok: false, error: errorNoBaja(estancadas.length > 0 ? estancadas : activas) };
    }

    const filas = [...detalle.values()];
    cronograma.push({
      numero,
      mes: sumarMeses(entrada.mesInicio, numero - 1),
      deudas: filas,
      interes: filas.reduce((suma, f) => suma.plus(f.interes), CERO),
      pago: filas.reduce((suma, f) => suma.plus(f.pago), CERO),
      saldoFinal: saldoActual,
    });
  }

  const meses = cronograma.length;
  return {
    ok: true,
    valor: {
      estrategia,
      meses,
      mesLibertad: sumarMeses(entrada.mesInicio, meses - 1),
      intereses: estado.reduce((suma, d) => suma.plus(d.intereses), CERO),
      pagado: estado.reduce((suma, d) => suma.plus(d.pagado), CERO),
      cronograma,
      deudas: estado.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        meses: d.mesCancelacion ?? 0,
        mesCancelacion: sumarMeses(entrada.mesInicio, (d.mesCancelacion ?? 1) - 1),
        intereses: d.intereses,
        pagado: d.pagado,
      })),
    },
  };
}

function errorNoBaja(deudas: { id: string; nombre: string }[]): ErrorSimulador {
  return {
    codigo: "deuda_no_baja",
    mensaje: `Con ese monto la deuda no baja: los intereses crecen tanto o más que los pagos (${deudas.map((d) => d.nombre).join(", ")}).`,
    deudaIds: deudas.map((d) => d.id),
  };
}

export interface Comparacion {
  bolaDeNieve: ResultadoEstrategia;
  avalancha: ResultadoEstrategia;
  /** Intereses de bola de nieve menos los de avalancha. */
  ahorroAvalancha: Decimal;
}

export function comparar(entrada: EntradaSimulador): Resultado<Comparacion> {
  const bola = simular(entrada, "bola_de_nieve");
  if (!bola.ok) return bola;
  const avalancha = simular(entrada, "avalancha");
  if (!avalancha.ok) return avalancha;
  return {
    ok: true,
    valor: {
      bolaDeNieve: bola.valor,
      avalancha: avalancha.valor,
      ahorroAvalancha: bola.valor.intereses.minus(avalancha.valor.intereses),
    },
  };
}
