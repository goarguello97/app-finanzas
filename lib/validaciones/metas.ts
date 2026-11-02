import { z } from "zod";
import { esFechaValida } from "@/lib/fechas";
import { montoPositivo } from "./comunes";

export const metaSchema = z.object({
  nombre: z.string().trim().min(1, "Escribí un nombre.").max(60, "Usá hasta 60 caracteres."),
  moneda: z.enum(["ARS", "USD"], { error: "Elegí una moneda." }),
  objetivo: montoPositivo,
  fecha_objetivo: z
    .string()
    .trim()
    .refine((texto) => texto === "" || esFechaValida(texto), "Elegí una fecha válida.")
    .transform((texto) => texto || null),
});

export const aporteSchema = z.object({
  sentido: z.enum(["aporte", "retiro"], { error: "Elegí aportar o retirar." }),
  monto: montoPositivo,
  fecha: z.string().refine(esFechaValida, "Elegí una fecha válida."),
});

export type EntradaAporte = z.input<typeof aporteSchema>;
