import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlmacenInicializacion } from "@/lib/auth/inicializar";
import type { Database } from "@/lib/supabase/database.types";

export function almacenSupabase(supabase: SupabaseClient<Database>): AlmacenInicializacion {
  return {
    async existeConfiguracion() {
      const { data, error } = await supabase.from("configuracion").select("user_id").maybeSingle();
      if (error) throw new Error(`Leer configuración: ${error.message}`);
      return data !== null;
    },
    async crearCategorias(categorias) {
      const { error } = await supabase
        .from("categorias")
        .upsert([...categorias], { onConflict: "user_id,nombre,tipo", ignoreDuplicates: true });
      if (error) throw new Error(`Crear categorías: ${error.message}`);
    },
    async crearConfiguracion() {
      const { error } = await supabase
        .from("configuracion")
        .upsert({ moneda_base: "ARS" }, { onConflict: "user_id", ignoreDuplicates: true });
      if (error) throw new Error(`Crear configuración: ${error.message}`);
    },
  };
}
