import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envSupabase } from "@/lib/env";
import type { Database } from "./database.types";

export async function crearClienteServer() {
  const cookieStore = await cookies();
  const { url, anonKey } = envSupabase();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesASetear) => {
        try {
          for (const { name, value, options } of cookiesASetear) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // En un Server Component no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}
