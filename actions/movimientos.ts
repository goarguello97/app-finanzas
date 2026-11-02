"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/sesion";
import { aNumeroDb } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";
import { erroresPorCampo } from "@/lib/validaciones/comunes";
import {
  movimientoSchema,
  validarRelaciones,
  type EntradaMovimiento,
  type MovimientoValidado,
} from "@/lib/validaciones/movimientos";

export type ResultadoMovimiento =
  | { ok: true; id: string }
  | { ok: false; mensaje?: string; errores?: Record<string, string> };

const MENSAJE_FALLO = "No pudimos guardar el movimiento. Probá de nuevo.";

type Cliente = Awaited<ReturnType<typeof crearClienteServer>>;

async function revisarRelaciones(supabase: Cliente, movimiento: MovimientoValidado) {
  const [cuenta, categoria] = await Promise.all([
    supabase.from("cuentas").select("tipo").eq("id", movimiento.cuenta_id).maybeSingle(),
    movimiento.categoria_id
      ? supabase.from("categorias").select("tipo").eq("id", movimiento.categoria_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (cuenta.error || categoria.error) {
    throw new Error(cuenta.error?.message ?? categoria.error?.message);
  }
  return validarRelaciones(movimiento, cuenta.data, categoria.data);
}

function aFila(m: MovimientoValidado) {
  return {
    tipo: m.tipo,
    monto: aNumeroDb(m.monto),
    cuenta_id: m.cuenta_id,
    categoria_id: m.categoria_id,
    fecha: m.fecha,
    nota: m.nota,
    cuotas: m.cuotas,
  };
}

async function guardar(
  entrada: EntradaMovimiento,
  operacion: (supabase: Cliente, fila: ReturnType<typeof aFila>) => Promise<{ id?: string; error: string | null }>,
): Promise<ResultadoMovimiento> {
  await requireUser();
  const resultado = movimientoSchema.safeParse(entrada);
  if (!resultado.success) return { ok: false, errores: erroresPorCampo(resultado.error) };

  const supabase = await crearClienteServer();
  try {
    const errores = await revisarRelaciones(supabase, resultado.data);
    if (Object.keys(errores).length > 0) return { ok: false, errores };
  } catch (causa) {
    console.error("[movimientos] No se pudieron revisar las relaciones:", causa);
    return { ok: false, mensaje: MENSAJE_FALLO };
  }

  const { id, error } = await operacion(supabase, aFila(resultado.data));
  if (error || !id) {
    console.error("[movimientos] No se pudo guardar:", error);
    return { ok: false, mensaje: MENSAJE_FALLO };
  }

  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function crearMovimiento(entrada: EntradaMovimiento): Promise<ResultadoMovimiento> {
  return guardar(entrada, async (supabase, fila) => {
    const { data, error } = await supabase.from("movimientos").insert(fila).select("id").single();
    return { id: data?.id, error: error?.message ?? null };
  });
}

const MENSAJE_PAGO = "Este gasto es un pago de deuda. Cambialo desde la deuda.";

/** Un gasto generado por un pago se maneja desde la deuda, para que no se desincronicen. */
async function esPagoDeDeuda(supabase: Cliente, id: string): Promise<boolean> {
  const { count, error } = await supabase.from("pagos_deuda").select("id", { count: "exact", head: true }).eq("movimiento_id", id);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function actualizarMovimiento(id: string, entrada: EntradaMovimiento): Promise<ResultadoMovimiento> {
  await requireUser();
  if (await esPagoDeDeuda(await crearClienteServer(), id)) return { ok: false, mensaje: MENSAJE_PAGO };
  return guardar(entrada, async (supabase, fila) => {
    const { data, error } = await supabase.from("movimientos").update(fila).eq("id", id).select("id").single();
    return { id: data?.id, error: error?.message ?? null };
  });
}

/** Para deshacer: borra y deja al usuario donde está. */
export async function deshacerMovimiento(id: string): Promise<{ ok: boolean }> {
  await requireUser();
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("movimientos").delete().eq("id", id);
  if (error) {
    console.error("[movimientos] No se pudo deshacer:", error.message);
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarMovimiento(id: string, volverA: string): Promise<{ mensaje?: string }> {
  await requireUser();
  if (await esPagoDeDeuda(await crearClienteServer(), id)) return { mensaje: MENSAJE_PAGO };
  const { ok } = await deshacerMovimiento(id);
  if (!ok) return { mensaje: "No pudimos eliminar el movimiento. Probá de nuevo." };
  redirect(volverA.startsWith("/movimientos") ? volverA : "/movimientos");
}
