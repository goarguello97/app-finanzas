import { CargaRapida } from "@/components/carga-rapida/carga-rapida";
import { hoyBuenosAires, sumarDias } from "@/lib/fechas";
import { cuentaPorDefecto, ordenarPorUso } from "@/lib/movimientos/carga";
import { crearClienteServer } from "@/lib/supabase/server";

const DIAS_DE_HISTORIAL = 90;

/** Trae los datos de antemano, para que el panel abra al instante. */
export async function CargaRapidaServidor() {
  const supabase = await crearClienteServer();
  const [cuentas, categorias, recientes] = await Promise.all([
    supabase.from("cuentas").select("id, nombre, moneda, tipo").eq("archivada", false).order("created_at"),
    // Las que no cuentan en los totales son de uso ocasional: sin historial van al final.
    supabase.from("categorias").select("id, nombre, tipo").order("excluye_totales").order("nombre"),
    supabase
      .from("movimientos")
      .select("cuenta_id, categoria_id")
      .gte("fecha", sumarDias(hoyBuenosAires(), -DIAS_DE_HISTORIAL))
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const error = cuentas.error ?? categorias.error ?? recientes.error;
  if (error) console.error("[carga-rapida] No se pudieron leer los datos:", error.message);

  const listaCuentas = cuentas.data ?? [];
  const listaRecientes = recientes.data ?? [];

  return (
    <CargaRapida
      cuentas={listaCuentas}
      categorias={ordenarPorUso(categorias.data ?? [], listaRecientes)}
      cuentaInicial={cuentaPorDefecto(listaCuentas.map((c) => c.id), listaRecientes)}
      errorDeCarga={Boolean(error)}
    />
  );
}
