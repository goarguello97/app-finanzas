"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServer } from "@/lib/supabase/server";

export async function entrarConGoogle() {
  const supabase = await crearClienteServer();
  const origen = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origen}/auth/callback` },
  });

  if (error) {
    console.error("[auth] No se pudo iniciar el login con Google:", error.message);
    redirect("/login?error=auth");
  }

  redirect(data.url);
}

export async function cerrarSesion() {
  const supabase = await crearClienteServer();
  await supabase.auth.signOut();
  redirect("/login");
}
