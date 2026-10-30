import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { emailPermitido } from "@/lib/auth/allowlist";
import { crearClienteServer } from "@/lib/supabase/server";

export interface Usuario {
  id: string;
  email: string;
}

/**
 * Exige sesión válida del email permitido. Repite el control del proxy para que
 * ninguna página ni Server Action dependa solo del matcher.
 * El proxy es quien cierra la sesión del usuario rechazado al llegar a /login.
 */
export const requireUser = cache(async (): Promise<Usuario> => {
  const supabase = await crearClienteServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) redirect("/login");
  if (!emailPermitido(claims.email, process.env.ALLOWED_EMAIL)) redirect("/login?error=no_autorizado");

  return { id: claims.sub, email: claims.email ?? "" };
});
