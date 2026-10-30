import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { emailPermitido } from "@/lib/auth/allowlist";
import type { Database } from "@/lib/supabase/database.types";
import { envSupabase } from "@/lib/env";

const RUTAS_PUBLICAS = ["/login", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = envSupabase();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesASetear, headers) => {
        for (const { name, value } of cookiesASetear) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesASetear) response.cookies.set(name, value, options);
        for (const [clave, valor] of Object.entries(headers)) response.headers.set(clave, valor);
      },
    },
  });

  // Copia cookies y headers de sesión: si no, un refresh de token se perdería en el redirect.
  const redirigirA = (destino: URL) => {
    const redirect = NextResponse.redirect(destino);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((valor, clave) => {
      if (clave.toLowerCase() !== "x-middleware-next") redirect.headers.set(clave, valor);
    });
    return redirect;
  };

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.includes(pathname);

  if (!claims) {
    if (esPublica) return response;
    return redirigirA(new URL("/login", request.url));
  }

  if (!emailPermitido(claims.email, process.env.ALLOWED_EMAIL)) {
    await supabase.auth.signOut();
    const destino = new URL("/login", request.url);
    destino.searchParams.set("error", "no_autorizado");
    return redirigirA(destino);
  }

  if (pathname === "/login") return redirigirA(new URL("/", request.url));
  return response;
}

export const config = {
  // /api/cron se protege con CRON_SECRET; el resto de las exclusiones son archivos estáticos.
  matcher: ["/((?!_next/static|_next/image|api/cron|icons/|sw\\.js|manifest\\.webmanifest|favicon\\.ico).*)"],
};
