import { NextResponse, type NextRequest } from "next/server";
import { URL_CRIPTOYA } from "@/lib/cotizacion/criptoya";
import { actualizarCotizacion, autorizado } from "@/lib/cotizacion/cron";
import { hoyBuenosAires } from "@/lib/fechas";
import { crearClienteAdmin } from "@/lib/supabase/admin";

const TIEMPO_MAXIMO_MS = 15_000;

/** Vercel Cron lo llama con GET y el encabezado Authorization: Bearer CRON_SECRET. También se puede correr a mano. */
export async function GET(request: NextRequest) {
  if (!autorizado(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const resultado = await actualizarCotizacion({
    async leerExchange() {
      const { data, error } = await crearClienteAdmin().from("configuracion").select("exchange_cotizacion").limit(1).maybeSingle();
      if (error) throw new Error(`Leer configuración: ${error.message}`);
      return data?.exchange_cotizacion ?? null;
    },
    async pedirCotizaciones() {
      const respuesta = await fetch(URL_CRIPTOYA, { cache: "no-store", signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
      if (!respuesta.ok) throw new Error(`CriptoYa respondió HTTP ${respuesta.status}`);
      return respuesta.text();
    },
    async guardar({ fuente, compra, venta }) {
      // Upsert: si se corre dos veces el mismo día, queda el último valor.
      const { error } = await crearClienteAdmin()
        .from("cotizaciones")
        .upsert({ fecha: hoyBuenosAires(), activo: "USDC", fuente, compra, venta, created_at: new Date().toISOString() }, { onConflict: "fecha,activo,fuente" });
      if (error) throw new Error(`Guardar cotización: ${error.message}`);
    },
  });

  if (!resultado.ok) {
    console.error("[cron/cotizacion] No se actualizó la cotización:", resultado.error);
    return NextResponse.json({ ok: false, error: resultado.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, cotizacion: resultado.cotizacion });
}
