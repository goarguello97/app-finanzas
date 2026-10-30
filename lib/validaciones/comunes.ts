import type Decimal from "decimal.js";
import { z } from "zod";
import { parsearMonto } from "@/lib/dinero";

const MENSAJE_MONTO = "Escribí un monto válido, por ejemplo 1.500,50.";

/** Monto obligatorio, mayor a cero. */
export const montoPositivo = z.string().trim().transform((texto, ctx): Decimal => {
  const monto = parsearMonto(texto);
  if (!monto || monto.isZero()) {
    ctx.addIssue({ code: "custom", message: texto === "" ? "Escribí un monto." : MENSAJE_MONTO });
    return z.NEVER;
  }
  return monto;
});

/** Monto opcional, cero o más. Vacío da null. */
export const montoOpcional = z.string().trim().transform((texto, ctx): Decimal | null => {
  if (texto === "") return null;
  const monto = parsearMonto(texto);
  if (!monto) {
    ctx.addIssue({ code: "custom", message: MENSAJE_MONTO });
    return z.NEVER;
  }
  return monto;
});

/** Pasa los problemas de Zod a un mensaje por campo: el primero de cada uno. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? "formulario");
    errores[campo] ??= problema.message;
  }
  return errores;
}
