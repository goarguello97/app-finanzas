import { NextResponse, type NextRequest } from "next/server";
import { almacenSupabase } from "@/lib/auth/almacen-supabase";
import { emailPermitido } from "@/lib/auth/allowlist";
import { inicializarUsuario } from "@/lib/auth/inicializar";
import { crearClienteServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const irALogin = (error: string) => {
    const destino = new URL("/login", request.url);
    destino.searchParams.set("error", error);
    return NextResponse.redirect(destino);
  };

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return irALogin("auth");

  const supabase = await crearClienteServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] No se pudo canjear el código:", error.message);
    return irALogin("auth");
  }

  if (!emailPermitido(data.user.email, process.env.ALLOWED_EMAIL)) {
    await supabase.auth.signOut();
    return irALogin("no_autorizado");
  }

  try {
    await inicializarUsuario(almacenSupabase(supabase));
  } catch (causa) {
    console.error("[auth] No se pudo inicializar la cuenta:", causa);
    await supabase.auth.signOut();
    return irALogin("inicializacion");
  }

  return NextResponse.redirect(new URL("/", request.url));
}
