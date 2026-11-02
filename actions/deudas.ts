"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/sesion";
import { aNumeroDb } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";
import { erroresPorCampo } from "@/lib/validaciones/comunes";
import { aFilaDeuda, deudaSchema, pagoSchema, type EntradaPago } from "@/lib/validaciones/deudas";

export interface EstadoDeuda {
  mensaje?: string;
  errores?: Record<string, string>;
}

export type ResultadoPago = { ok: true } | { ok: false; mensaje?: string; errores?: Record<string, string> };

const CAMPOS_DEUDA = [
  "tipo",
  "acreedor",
  "descripcion",
  "moneda",
  "monto_total",
  "tasa_anual",
  "pago_minimo",
  "cuotas_total",
  "monto_cuota",
  "dia_vencimiento",
  "fecha_inicio",
] as const;

function leerDeuda(formData: FormData) {
  return Object.fromEntries(CAMPOS_DEUDA.map((campo) => [campo, String(formData.get(campo) ?? "")]));
}

export async function crearDeuda(_anterior: EstadoDeuda, formData: FormData): Promise<EstadoDeuda> {
  await requireUser();
  const resultado = deudaSchema.safeParse(leerDeuda(formData));
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error) };

  const supabase = await crearClienteServer();
  const { data, error } = await supabase.from("deudas").insert(aFilaDeuda(resultado.data)).select("id").single();
  if (error) {
    console.error("[deudas] No se pudo crear:", error.message);
    return { mensaje: "No pudimos guardar la deuda. Probá de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect(`/deudas/${data.id}`);
}

export async function actualizarDeuda(id: string, _anterior: EstadoDeuda, formData: FormData): Promise<EstadoDeuda> {
  await requireUser();
  const resultado = deudaSchema.safeParse(leerDeuda(formData));
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error) };

  const supabase = await crearClienteServer();
  const { data: saldo, error: errorSaldo } = await supabase.from("deudas_saldo").select("capital_pagado, pagos_realizados").eq("id", id).maybeSingle();
  if (errorSaldo || !saldo) {
    console.error("[deudas] No se pudo leer el saldo:", errorSaldo?.message);
    return { mensaje: "No pudimos guardar la deuda. Probá de nuevo." };
  }

  const { moneda, ...editables } = aFilaDeuda(resultado.data);
  // Con pagos cargados, cambiar la moneda reinterpretaría lo ya pagado.
  const fila = saldo.pagos_realizados ? editables : { ...editables, moneda };
  const saldada = (saldo.capital_pagado ?? 0) >= fila.monto_total;

  const { error } = await supabase
    .from("deudas")
    .update({ ...fila, estado: saldada ? "saldada" : "activa" })
    .eq("id", id);
  if (error) {
    console.error("[deudas] No se pudo actualizar:", error.message);
    return { mensaje: "No pudimos guardar la deuda. Probá de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect(`/deudas/${id}`);
}

export async function eliminarDeuda(id: string): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("deudas").delete().eq("id", id);
  if (error) {
    console.error("[deudas] No se pudo eliminar:", error.message);
    return { mensaje: "No pudimos eliminar la deuda. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  redirect("/deudas");
}

export async function registrarPago(deudaId: string, entrada: EntradaPago): Promise<ResultadoPago> {
  await requireUser();
  const resultado = pagoSchema.safeParse(entrada);
  if (!resultado.success) return { ok: false, errores: erroresPorCampo(resultado.error) };

  const { monto, interes, fecha, cuenta_id, categoria_id } = resultado.data;
  const supabase = await crearClienteServer();

  const { data: deuda, error: errorDeuda } = await supabase.from("deudas_saldo").select("pendiente").eq("id", deudaId).maybeSingle();
  if (errorDeuda || !deuda) {
    console.error("[deudas] No se pudo leer el saldo:", errorDeuda?.message);
    return { ok: false, mensaje: "No pudimos registrar el pago. Probá de nuevo." };
  }

  const capital = interes ? monto.minus(interes) : monto;
  if (capital.greaterThan(String(deuda.pendiente ?? 0))) {
    return { ok: false, errores: { monto: "El pago supera lo que queda por pagar. Si incluye intereses, indicalos abajo." } };
  }

  const { error } = await supabase.rpc("registrar_pago_deuda", {
    p_deuda_id: deudaId,
    p_monto: aNumeroDb(monto),
    p_fecha: fecha,
    p_interes: interes ? aNumeroDb(interes) : 0,
    ...(cuenta_id ? { p_cuenta_id: cuenta_id } : {}),
    ...(categoria_id ? { p_categoria_id: categoria_id } : {}),
  });
  if (error) {
    // 22023: la cuenta está en otra moneda que la deuda.
    if (error.code === "22023") return { ok: false, errores: { cuenta_id: "La cuenta tiene que estar en la misma moneda que la deuda." } };
    console.error("[deudas] No se pudo registrar el pago:", error.message);
    return { ok: false, mensaje: "No pudimos registrar el pago. Probá de nuevo." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarPago(pagoId: string): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.rpc("eliminar_pago_deuda", { p_pago_id: pagoId });
  if (error) {
    console.error("[deudas] No se pudo eliminar el pago:", error.message);
    return { mensaje: "No pudimos eliminar el pago. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function elegirEstrategia(estrategia: "bola_de_nieve" | "avalancha"): Promise<{ mensaje?: string }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase
    .from("configuracion")
    .upsert({ estrategia_deudas: estrategia, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("[deudas] No se pudo guardar la estrategia:", error.message);
    return { mensaje: "No pudimos guardar tu elección. Probá de nuevo." };
  }
  revalidatePath("/deudas", "layout");
  return {};
}
