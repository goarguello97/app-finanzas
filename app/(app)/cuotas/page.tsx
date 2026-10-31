import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearMonto, type Moneda } from "@/lib/dinero";
import { agruparCuotas } from "@/lib/cuotas/proyeccion";
import { hoyBuenosAires, mesDe, nombreMes } from "@/lib/fechas";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cuotas" };

const MONEDAS: Moneda[] = ["ARS", "USD"];

export default async function CuotasPage() {
  await requireUser();
  const supabase = await crearClienteServer();
  const [cuotas, cuentas, categorias, movimientos] = await Promise.all([
    supabase.from("cuotas_proyectadas").select("movimiento_id, cuenta_id, nro_cuota, cuotas, mes, monto_cuota"),
    supabase.from("cuentas").select("id, nombre, moneda, tipo"),
    supabase.from("categorias").select("id, nombre"),
    supabase.from("movimientos").select("id, nota, categoria_id, cuenta_id, tipo").eq("tipo", "gasto"),
  ]);
  const error = cuotas.error ?? cuentas.error ?? categorias.error ?? movimientos.error;
  if (error) throw new Error(`Leer cuotas: ${error.message}`);

  const monedaDe = new Map((cuentas.data ?? []).map((c) => [c.id, c.moneda]));
  const cuentaDe = new Map((cuentas.data ?? []).map((c) => [c.id, c.nombre]));
  const categoriaDe = new Map((categorias.data ?? []).map((c) => [c.id, c.nombre]));
  const movimientoDe = new Map((movimientos.data ?? []).map((m) => [m.id, m]));
  const meses = agruparCuotas(cuotas.data ?? [], monedaDe, mesDe(hoyBuenosAires()));
  const hayTarjetas = (cuentas.data ?? []).some((c) => c.tipo === "tarjeta");

  return (
    <>
      <Encabezado titulo="Cuotas" descripcion="Lo que ya está comprometido en tus tarjetas para los próximos meses." />

      {meses.length === 0 ? (
        <EstadoVacio
          titulo="No tenés cuotas por pagar"
          descripcion={hayTarjetas ? "Cuando cargues una compra en cuotas con tarjeta, aparece acá mes a mes." : "Se usan con cuentas de tipo tarjeta. Lo que hoy le debés a una tarjeta se carga como deuda."}
        >
          {!hayTarjetas && (
            <Button asChild variant="outline">
              <Link href="/deudas">Ir a Deudas</Link>
            </Button>
          )}
        </EstadoVacio>
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          {meses.map((m) => (
            <section key={m.mes} aria-label={nombreMes(m.mes)} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-medium first-letter:uppercase">{nombreMes(m.mes)}</h2>
                <p className="text-right font-semibold">
                  {MONEDAS.filter((moneda) => !m.totales[moneda].isZero()).map((moneda) => (
                    <span key={moneda} className="block">
                      {formatearMonto(m.totales[moneda], moneda)}
                    </span>
                  ))}
                </p>
              </div>
              <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
                {m.cuotas.map((c) => {
                  const movimiento = movimientoDe.get(c.movimientoId);
                  const categoria = movimiento?.categoria_id ? categoriaDe.get(movimiento.categoria_id) : null;
                  return (
                    <li key={`${c.movimientoId}-${c.numero}`}>
                      <Link
                        href={`/movimientos/${c.movimientoId}`}
                        className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-accent active:bg-accent"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{movimiento?.nota ?? categoria ?? "Sin categoría"}</span>
                          <span className="truncate text-sm text-muted-foreground">
                            {cuentaDe.get(c.cuentaId)}, cuota {c.numero} de {c.total}
                          </span>
                        </span>
                        <span className="font-medium whitespace-nowrap">{formatearMonto(c.monto, c.moneda)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
