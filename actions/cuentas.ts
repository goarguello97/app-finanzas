"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/sesion";
import { crearClienteServer } from "@/lib/supabase/server";
import { erroresPorCampo } from "@/lib/validaciones/comunes";
import { aFilaCuenta, cuentaSchema } from "@/lib/validaciones/cuentas";

export interface EstadoCuenta {
  mensaje?: string;
  errores?: Record<string, string>;
  valores?: Record<string, string>;
}

function leerFormulario(formData: FormData) {
  const campo = (nombre: string) => String(formData.get(nombre) ?? "");
  return {
    nombre: campo("nombre"),
    tipo: campo("tipo"),
    moneda: campo("moneda"),
    saldo_inicial: campo("saldo_inicial"),
    dia_cierre: campo("dia_cierre"),
    dia_vencimiento: campo("dia_vencimiento"),
    limite: campo("limite"),
  };
}

export async function crearCuenta(_anterior: EstadoCuenta, formData: FormData): Promise<EstadoCuenta> {
  await requireUser();
  const valores = leerFormulario(formData);
  const resultado = cuentaSchema.safeParse(valores);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const supabase = await crearClienteServer();
  const { error } = await supabase.from("cuentas").insert(aFilaCuenta(resultado.data));
  if (error) {
    console.error("[cuentas] No se pudo crear:", error.message);
    return { mensaje: "No pudimos guardar la cuenta. Probá de nuevo.", valores };
  }

  revalidatePath("/", "layout");
  redirect("/cuentas");
}

export async function actualizarCuenta(id: string, _anterior: EstadoCuenta, formData: FormData): Promise<EstadoCuenta> {
  await requireUser();
  const valores = leerFormulario(formData);
  const resultado = cuentaSchema.safeParse(valores);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const supabase = await crearClienteServer();
  const fila = aFilaCuenta(resultado.data);

  // Con movimientos, cambiar tipo o moneda reinterpretaría montos ya cargados.
  const { count, error: errorConteo } = await supabase
    .from("movimientos")
    .select("id", { count: "exact", head: true })
    .eq("cuenta_id", id);
  if (errorConteo) {
    console.error("[cuentas] No se pudieron contar movimientos:", errorConteo.message);
    return { mensaje: "No pudimos guardar la cuenta. Probá de nuevo.", valores };
  }

  const { tipo, moneda, ...editables } = fila;
  const { error } = await supabase
    .from("cuentas")
    .update(count ? editables : { ...editables, tipo, moneda })
    .eq("id", id);
  if (error) {
    console.error("[cuentas] No se pudo actualizar:", error.message);
    return { mensaje: "No pudimos guardar la cuenta. Probá de nuevo.", valores };
  }

  revalidatePath("/", "layout");
  redirect("/cuentas");
}

export async function cambiarArchivoCuenta(id: string, archivada: boolean): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("cuentas").update({ archivada }).eq("id", id);
  if (error) {
    console.error("[cuentas] No se pudo archivar:", error.message);
    return { mensaje: "No pudimos actualizar la cuenta. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  redirect("/cuentas");
}

export async function eliminarCuenta(id: string): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("cuentas").delete().eq("id", id);
  if (error) {
    // 23503: la cuenta tiene movimientos, y la tabla impide borrarla.
    if (error.code === "23503") return { mensaje: "Esta cuenta tiene movimientos. Podés archivarla." };
    console.error("[cuentas] No se pudo eliminar:", error.message);
    return { mensaje: "No pudimos eliminar la cuenta. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  redirect("/cuentas");
}
