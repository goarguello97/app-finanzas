import { z } from "zod";
import { esFechaValida } from "@/lib/fechas";
import { montoPositivo } from "./comunes";

const MAX_CUOTAS = 60;

export const movimientoSchema = z.object({
  tipo: z.enum(["ingreso", "gasto"], { error: "Elegí gasto o ingreso." }),
  monto: montoPositivo,
  cuenta_id: z.uuid({ error: "Elegí una cuenta." }),
  categoria_id: z
    .string()
    .trim()
    .transform((texto) => texto || null)
    .pipe(z.uuid({ error: "Elegí una categoría." }).nullable()),
  fecha: z.string().refine(esFechaValida, "Elegí una fecha válida."),
  nota: z
    .string()
    .trim()
    .max(200, "Usá hasta 200 caracteres.")
    .transform((texto) => texto || null),
  cuotas: z.string().trim().transform((texto, ctx): number => {
    if (texto === "") return 1;
    const cuotas = Number(texto);
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > MAX_CUOTAS) {
      ctx.addIssue({ code: "custom", message: `Escribí un número de cuotas entre 1 y ${MAX_CUOTAS}.` });
      return z.NEVER;
    }
    return cuotas;
  }),
});

export type EntradaMovimiento = z.input<typeof movimientoSchema>;
export type MovimientoValidado = z.output<typeof movimientoSchema>;

/** Reglas que dependen de la cuenta y la categoría elegidas. Devuelve errores por campo. */
export function validarRelaciones(
  movimiento: Pick<MovimientoValidado, "tipo" | "cuotas" | "categoria_id">,
  cuenta: { tipo: string } | null,
  categoria: { tipo: string } | null,
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!cuenta) errores.cuenta_id = "Esa cuenta ya no existe.";
  if (movimiento.categoria_id) {
    if (!categoria) errores.categoria_id = "Esa categoría ya no existe.";
    else if (categoria.tipo !== movimiento.tipo) {
      errores.categoria_id = `Esa categoría es de ${categoria.tipo === "gasto" ? "gastos" : "ingresos"}.`;
    }
  }
  if (movimiento.cuotas > 1 && (cuenta?.tipo !== "tarjeta" || movimiento.tipo !== "gasto")) {
    errores.cuotas = "Las cuotas son solo para gastos con tarjeta.";
  }
  return errores;
}
