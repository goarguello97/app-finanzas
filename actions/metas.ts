"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/sesion";
import { aDecimal, aNumeroDb } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";
import { erroresPorCampo } from "@/lib/validaciones/comunes";
import { aporteSchema, metaSchema, type EntradaAporte } from "@/lib/validaciones/metas";

export interface EstadoMeta {
  mensaje?: string;
  errores?: Record<string, string>;
}

export type ResultadoAporte = { ok: true } | { ok: false; mensaje?: string; errores?: Record<string, string> };

type Cliente = Awaited<ReturnType<typeof crearClienteServer>>;

function leerMeta(formData: FormData) {
  const campo = (nombre: string) => String(formData.get(nombre) ?? "");
  return { nombre: campo("nombre"), moneda: campo("moneda"), objetivo: campo("objetivo"), fecha_objetivo: campo("fecha_objetivo") };
}

/** Deja `completada` acorde al total aportado, también si se aumenta el objetivo o se retira plata. */
async function sincronizarCompletada(supabase: Cliente, id: string): Promise<void> {
  const { data, error } = await supabase.from("metas_progreso").select("aportado, objetivo").eq("id", id).maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "La meta no existe");
  const completada = aDecimal(String(data.aportado ?? 0)).greaterThanOrEqualTo(String(data.objetivo ?? 0));
  const { error: errorUpdate } = await supabase.from("metas").update({ completada }).eq("id", id);
  if (errorUpdate) throw new Error(errorUpdate.message);
}

export async function crearMeta(_anterior: EstadoMeta, formData: FormData): Promise<EstadoMeta> {
  await requireUser();
  const resultado = metaSchema.safeParse(leerMeta(formData));
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error) };

  const { nombre, moneda, objetivo, fecha_objetivo } = resultado.data;
  const supabase = await crearClienteServer();
  const { data, error } = await supabase.from("metas").insert({ nombre, moneda, objetivo: aNumeroDb(objetivo), fecha_objetivo }).select("id").single();
  if (error) {
    console.error("[metas] No se pudo crear:", error.message);
    return { mensaje: "No pudimos guardar la meta. Probá de nuevo." };
  }

  revalidatePath("/metas");
  redirect(`/metas/${data.id}`);
}

export async function actualizarMeta(id: string, _anterior: EstadoMeta, formData: FormData): Promise<EstadoMeta> {
  await requireUser();
  const resultado = metaSchema.safeParse(leerMeta(formData));
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error) };

  const { nombre, moneda, objetivo, fecha_objetivo } = resultado.data;
  const supabase = await crearClienteServer();
  try {
    // Con aportes cargados, cambiar la moneda reinterpretaría lo ya ahorrado.
    const { count, error: errorConteo } = await supabase.from("aportes_meta").select("id", { count: "exact", head: true }).eq("meta_id", id);
    if (errorConteo) throw new Error(errorConteo.message);

    const editables = { nombre, objetivo: aNumeroDb(objetivo), fecha_objetivo };
    const { error } = await supabase.from("metas").update(count ? editables : { ...editables, moneda }).eq("id", id);
    if (error) throw new Error(error.message);
    await sincronizarCompletada(supabase, id);
  } catch (causa) {
    console.error("[metas] No se pudo actualizar:", causa);
    return { mensaje: "No pudimos guardar la meta. Probá de nuevo." };
  }

  revalidatePath("/metas");
  redirect(`/metas/${id}`);
}

export async function eliminarMeta(id: string): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("metas").delete().eq("id", id);
  if (error) {
    console.error("[metas] No se pudo eliminar:", error.message);
    return { mensaje: "No pudimos eliminar la meta. Probá de nuevo." };
  }
  revalidatePath("/metas");
  redirect("/metas");
}

export async function registrarAporte(metaId: string, entrada: EntradaAporte): Promise<ResultadoAporte> {
  await requireUser();
  const resultado = aporteSchema.safeParse(entrada);
  if (!resultado.success) return { ok: false, errores: erroresPorCampo(resultado.error) };

  const { sentido, monto, fecha } = resultado.data;
  const supabase = await crearClienteServer();
  try {
    if (sentido === "retiro") {
      const { data, error } = await supabase.from("metas_progreso").select("aportado").eq("id", metaId).maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "La meta no existe");
      if (monto.greaterThan(String(data.aportado ?? 0))) {
        return { ok: false, errores: { monto: "No podés retirar más de lo que aportaste." } };
      }
    }

    const valor = aNumeroDb(monto);
    const { error } = await supabase.from("aportes_meta").insert({ meta_id: metaId, monto: sentido === "retiro" ? -valor : valor, fecha });
    if (error) throw new Error(error.message);
    await sincronizarCompletada(supabase, metaId);
  } catch (causa) {
    console.error("[metas] No se pudo registrar el aporte:", causa);
    return { ok: false, mensaje: "No pudimos guardar el movimiento de la meta. Probá de nuevo." };
  }

  revalidatePath("/metas", "layout");
  return { ok: true };
}

export async function eliminarAporte(aporteId: string, metaId: string): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  try {
    const { error } = await supabase.from("aportes_meta").delete().eq("id", aporteId);
    if (error) throw new Error(error.message);
    await sincronizarCompletada(supabase, metaId);
  } catch (causa) {
    console.error("[metas] No se pudo eliminar el aporte:", causa);
    return { mensaje: "No pudimos eliminarlo. Probá de nuevo." };
  }
  revalidatePath("/metas", "layout");
  return {};
}
