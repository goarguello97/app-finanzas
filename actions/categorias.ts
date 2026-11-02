"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/sesion";
import { crearClienteServer } from "@/lib/supabase/server";
import { categoriaSchema } from "@/lib/validaciones/categorias";
import { erroresPorCampo } from "@/lib/validaciones/comunes";

export interface EstadoCategoria {
  mensaje?: string;
  errores?: Record<string, string>;
  valores?: { nombre: string; tipo: string; excluye_totales: boolean };
}

const MENSAJE_DUPLICADA = "Ya tenés una categoría con ese nombre.";

function leerFormulario(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    excluye_totales: formData.get("excluye_totales") === "on",
  };
}

export async function crearCategoria(_anterior: EstadoCategoria, formData: FormData): Promise<EstadoCategoria> {
  await requireUser();
  const valores = leerFormulario(formData);
  const resultado = categoriaSchema.safeParse(valores);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const supabase = await crearClienteServer();
  const { error } = await supabase.from("categorias").insert(resultado.data);
  if (error) {
    if (error.code === "23505") return { errores: { nombre: MENSAJE_DUPLICADA }, valores };
    console.error("[categorias] No se pudo crear:", error.message);
    return { mensaje: "No pudimos guardar la categoría. Probá de nuevo.", valores };
  }

  revalidatePath("/", "layout");
  redirect("/categorias");
}

export async function actualizarCategoria(
  id: string,
  _anterior: EstadoCategoria,
  formData: FormData,
): Promise<EstadoCategoria> {
  await requireUser();
  const valores = leerFormulario(formData);
  const resultado = categoriaSchema.safeParse(valores);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const supabase = await crearClienteServer();

  // Cambiar el tipo dejaría movimientos con una categoría del tipo contrario.
  const { tipo, ...editables } = resultado.data;
  const { error } = await supabase.from("categorias").update(editables).eq("id", id);
  if (error) {
    if (error.code === "23505") return { errores: { nombre: MENSAJE_DUPLICADA }, valores: { ...valores, tipo } };
    console.error("[categorias] No se pudo actualizar:", error.message);
    return { mensaje: "No pudimos guardar la categoría. Probá de nuevo.", valores };
  }

  revalidatePath("/", "layout");
  redirect("/categorias");
}

export async function eliminarCategoria(id: string): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) {
    console.error("[categorias] No se pudo eliminar:", error.message);
    return { mensaje: "No pudimos eliminar la categoría. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  redirect("/categorias");
}
