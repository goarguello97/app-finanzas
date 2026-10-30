import { z } from "zod";

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, "Escribí un nombre.").max(40, "Usá hasta 40 caracteres."),
  tipo: z.enum(["ingreso", "gasto"], { error: "Elegí un tipo." }),
  excluye_totales: z.boolean(),
});

export type CategoriaValidada = z.output<typeof categoriaSchema>;
