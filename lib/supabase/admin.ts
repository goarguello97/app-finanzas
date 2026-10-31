import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envSupabase } from "@/lib/env";
import type { Database } from "./database.types";

/** Cliente con service role: saltea RLS. Solo para tareas de servidor sin usuario, como el cron. */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY. Revisá .env.example.");
  return createClient<Database>(envSupabase().url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
