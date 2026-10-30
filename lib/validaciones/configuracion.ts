import type Decimal from "decimal.js";
import { z } from "zod";
import { parsearMonto } from "@/lib/dinero";

/** Campo opcional: vacío significa sin ingreso mínimo. */
const ingresoMinimo = z
  .string()
  .trim()
  .transform((texto, ctx): Decimal | null => {
    if (texto === "") return null;
    const monto = parsearMonto(texto);
    if (!monto) {
      ctx.addIssue({ code: "custom", message: "Escribí un monto válido, por ejemplo 1.500.000,00." });
      return z.NEVER;
    }
    return monto;
  });

export const configuracionSchema = z.object({
  ingreso_minimo: ingresoMinimo,
  moneda_base: z.enum(["ARS", "USD"], { error: "Elegí una moneda." }),
  exchange_cotizacion: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]{2,40}$/, "Usá el nombre del exchange en CriptoYa, por ejemplo dolarapp."),
});

export type ConfiguracionValidada = z.output<typeof configuracionSchema>;
