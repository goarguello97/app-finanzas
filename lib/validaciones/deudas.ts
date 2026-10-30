import type Decimal from "decimal.js";
import { z } from "zod";
import { aNumeroDb, parsearMonto } from "@/lib/dinero";
import { esFechaValida } from "@/lib/fechas";
import { montoOpcional, montoPositivo } from "./comunes";

export const ETIQUETAS_TIPO_DEUDA: Record<string, string> = { tarjeta: "Tarjeta", prestamo: "Préstamo" };

const TASA_MAXIMA = 99999.99;

/** Texto libre opcional: vacío se guarda como null. */
const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Usá hasta ${maximo} caracteres.`)
    .transform((texto) => texto || null);

function enteroOpcional(minimo: number, maximo: number, mensaje: string) {
  return z.string().trim().transform((texto, ctx): number | null => {
    if (texto === "") return null;
    const valor = Number(texto);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return valor;
  });
}

const tasaAnual = z.string().trim().transform((texto, ctx): Decimal => {
  const tasa = parsearMonto(texto.replace(/%$/, ""));
  if (!tasa || tasa.greaterThan(TASA_MAXIMA)) {
    ctx.addIssue({ code: "custom", message: "Escribí la TNA en porcentaje, por ejemplo 85,5. Si no tiene interés, poné 0." });
    return z.NEVER;
  }
  return tasa;
});

export const deudaSchema = z
  .object({
    tipo: z.enum(["tarjeta", "prestamo"], { error: "Elegí un tipo." }),
    acreedor: z.string().trim().min(1, "Escribí a quién le debés.").max(80, "Usá hasta 80 caracteres."),
    descripcion: textoOpcional(200),
    moneda: z.enum(["ARS", "USD"], { error: "Elegí una moneda." }),
    monto_total: montoPositivo,
    tasa_anual: tasaAnual,
    pago_minimo: montoOpcional,
    cuotas_total: enteroOpcional(1, 600, "Escribí un número de cuotas entre 1 y 600."),
    monto_cuota: montoOpcional,
    dia_vencimiento: enteroOpcional(1, 31, "Escribí un día entre 1 y 31."),
    fecha_inicio: z.string().refine(esFechaValida, "Elegí una fecha válida."),
  })
  .superRefine((deuda, ctx) => {
    if (deuda.monto_cuota?.isZero()) {
      ctx.addIssue({ code: "custom", path: ["monto_cuota"], message: "La cuota tiene que ser mayor a cero." });
    }
    // El simulador necesita el mínimo. En préstamos sale de la cuota.
    if (!deuda.pago_minimo && !(deuda.tipo === "prestamo" && deuda.monto_cuota)) {
      ctx.addIssue({ code: "custom", path: ["pago_minimo"], message: "Escribí el pago mínimo por mes. Si no tiene, poné 0." });
    }
  });

export type DeudaValidada = z.output<typeof deudaSchema>;

export function aFilaDeuda(d: DeudaValidada) {
  const esPrestamo = d.tipo === "prestamo";
  const cuota = esPrestamo ? d.monto_cuota : null;
  const minimo = d.pago_minimo ?? cuota;
  return {
    tipo: d.tipo,
    acreedor: d.acreedor,
    descripcion: d.descripcion,
    moneda: d.moneda,
    monto_total: aNumeroDb(d.monto_total),
    tasa_anual: aNumeroDb(d.tasa_anual),
    pago_minimo: minimo ? aNumeroDb(minimo) : null,
    cuotas_total: esPrestamo ? d.cuotas_total : null,
    monto_cuota: cuota ? aNumeroDb(cuota) : null,
    dia_vencimiento: d.dia_vencimiento,
    fecha_inicio: d.fecha_inicio,
  };
}

const uuidOpcional = (mensaje: string) =>
  z
    .string()
    .trim()
    .transform((texto) => texto || null)
    .pipe(z.uuid({ error: mensaje }).nullable());

export const pagoSchema = z
  .object({
    monto: montoPositivo,
    interes: montoOpcional,
    fecha: z.string().refine(esFechaValida, "Elegí una fecha válida."),
    cuenta_id: uuidOpcional("Elegí una cuenta."),
    categoria_id: uuidOpcional("Elegí una categoría."),
  })
  .superRefine((pago, ctx) => {
    if (pago.interes?.greaterThan(pago.monto)) {
      ctx.addIssue({ code: "custom", path: ["interes"], message: "El interés no puede ser mayor que el pago." });
    }
  });

export type EntradaPago = z.input<typeof pagoSchema>;
export type PagoValidado = z.output<typeof pagoSchema>;
