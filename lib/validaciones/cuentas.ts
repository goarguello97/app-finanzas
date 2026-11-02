import Decimal from "decimal.js";
import { z } from "zod";
import { aNumeroDb, parsearMonto } from "@/lib/dinero";
import { montoOpcional } from "./comunes";

export const TIPOS_CUENTA = ["efectivo", "banco", "billetera", "tarjeta"] as const;

export const ETIQUETAS_TIPO_CUENTA: Record<string, string> = {
  efectivo: "Efectivo",
  banco: "Banco",
  billetera: "Billetera",
  tarjeta: "Tarjeta",
};

/** Puede ser negativo: una cuenta bancaria puede arrancar en descubierto. */
const saldoInicial = z.string().trim().transform((texto, ctx): Decimal => {
  if (texto === "") return new Decimal(0);
  const negativo = texto.startsWith("-");
  const monto = parsearMonto(negativo ? texto.slice(1) : texto);
  if (!monto) {
    ctx.addIssue({ code: "custom", message: "Escribí un monto válido, por ejemplo 1.500,50." });
    return z.NEVER;
  }
  return negativo ? monto.negated() : monto;
});

const diaDelMes = z.string().trim().transform((texto, ctx): number | null => {
  if (texto === "") return null;
  const dia = Number(texto);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    ctx.addIssue({ code: "custom", message: "Escribí un día entre 1 y 31." });
    return z.NEVER;
  }
  return dia;
});

export const cuentaSchema = z.object({
  nombre: z.string().trim().min(1, "Escribí un nombre.").max(60, "Usá hasta 60 caracteres."),
  tipo: z.enum(TIPOS_CUENTA, { error: "Elegí un tipo." }),
  moneda: z.enum(["ARS", "USD"], { error: "Elegí una moneda." }),
  saldo_inicial: saldoInicial,
  dia_cierre: diaDelMes,
  dia_vencimiento: diaDelMes,
  limite: montoOpcional,
});

export type CuentaValidada = z.output<typeof cuentaSchema>;

/**
 * Fila para la base. Los campos de tarjeta solo valen en tarjetas (lo exige un check de la tabla),
 * y una tarjeta no tiene saldo propio: lo que se le debe se carga como deuda.
 */
export function aFilaCuenta(cuenta: CuentaValidada) {
  const esTarjeta = cuenta.tipo === "tarjeta";
  return {
    nombre: cuenta.nombre,
    tipo: cuenta.tipo,
    moneda: cuenta.moneda,
    saldo_inicial: esTarjeta ? 0 : aNumeroDb(cuenta.saldo_inicial),
    dia_cierre: esTarjeta ? cuenta.dia_cierre : null,
    dia_vencimiento: esTarjeta ? cuenta.dia_vencimiento : null,
    limite: esTarjeta && cuenta.limite ? aNumeroDb(cuenta.limite) : null,
  };
}
