"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/sesion";
import { aNumeroDb } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";
import { configuracionSchema } from "@/lib/validaciones/configuracion";

export interface EstadoConfiguracion {
  estado: "inicial" | "ok" | "error";
  mensaje?: string;
  errores?: Partial<Record<"ingreso_minimo" | "moneda_base" | "exchange_cotizacion", string>>;
  valores?: { ingreso_minimo: string; moneda_base: string; exchange_cotizacion: string };
}

export async function guardarConfiguracion(
  _anterior: EstadoConfiguracion,
  formData: FormData,
): Promise<EstadoConfiguracion> {
  await requireUser();

  const valores = {
    ingreso_minimo: String(formData.get("ingreso_minimo") ?? ""),
    moneda_base: String(formData.get("moneda_base") ?? ""),
    exchange_cotizacion: String(formData.get("exchange_cotizacion") ?? ""),
  };

  const resultado = configuracionSchema.safeParse(valores);
  if (!resultado.success) {
    const errores: EstadoConfiguracion["errores"] = {};
    for (const problema of resultado.error.issues) {
      const campo = problema.path[0] as keyof NonNullable<EstadoConfiguracion["errores"]>;
      errores[campo] ??= problema.message;
    }
    return { estado: "error", errores, valores };
  }

  const { ingreso_minimo, moneda_base, exchange_cotizacion } = resultado.data;
  const supabase = await crearClienteServer();
  const { error } = await supabase.from("configuracion").upsert(
    {
      ingreso_minimo: ingreso_minimo ? aNumeroDb(ingreso_minimo) : null,
      moneda_base,
      exchange_cotizacion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[ajustes] No se pudo guardar la configuración:", error.message);
    return { estado: "error", mensaje: "No pudimos guardar los cambios. Probá de nuevo.", valores };
  }

  revalidatePath("/ajustes");
  return { estado: "ok", mensaje: "Cambios guardados." };
}
