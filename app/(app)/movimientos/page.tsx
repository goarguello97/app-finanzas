import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { MontoMovimiento } from "@/components/dinero/monto";
import { Encabezado } from "@/components/encabezado";
import { EstadoVacio } from "@/components/estado-vacio";
import { FiltrosMovimientos } from "@/components/movimientos/filtros";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import type { Moneda } from "@/lib/dinero";
import { etiquetaDia, hoyBuenosAires, nombreMes, rangoMes, sumarMeses } from "@/lib/fechas";
import { agruparPorDia, parsearFiltros, SIN_CATEGORIA, urlListado } from "@/lib/movimientos/listado";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[]; cuenta?: string | string[]; categoria?: string | string[] }>;
}) {
  await requireUser();
  const hoy = hoyBuenosAires();
  const filtros = parsearFiltros(await searchParams, hoy);
  const { desde, hasta } = rangoMes(filtros.mes);

  const supabase = await crearClienteServer();
  let consulta = supabase
    .from("movimientos")
    .select("id, tipo, monto, fecha, nota, cuotas, cuenta_id, categoria_id")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (filtros.cuenta) consulta = consulta.eq("cuenta_id", filtros.cuenta);
  if (filtros.categoria === SIN_CATEGORIA) consulta = consulta.is("categoria_id", null);
  else if (filtros.categoria) consulta = consulta.eq("categoria_id", filtros.categoria);

  const [movimientos, cuentas, categorias] = await Promise.all([
    consulta,
    supabase.from("cuentas").select("id, nombre, moneda").order("created_at"),
    supabase.from("categorias").select("id, nombre, tipo").order("nombre"),
  ]);
  if (movimientos.error) throw new Error(`Leer movimientos: ${movimientos.error.message}`);
  if (cuentas.error) throw new Error(`Leer cuentas: ${cuentas.error.message}`);
  if (categorias.error) throw new Error(`Leer categorías: ${categorias.error.message}`);

  const cuentaDe = new Map(cuentas.data.map((c) => [c.id, c]));
  const categoriaDe = new Map(categorias.data.map((c) => [c.id, c.nombre]));
  const dias = agruparPorDia(movimientos.data);
  const hayFiltros = Boolean(filtros.cuenta || filtros.categoria);
  const volverA = urlListado(filtros);

  return (
    <>
      <Encabezado titulo="Movimientos" />

      <div className="flex items-center justify-between gap-2 rounded-control border bg-card lg:max-w-xl">
        <Button asChild variant="ghost" size="icon" aria-label="Mes anterior">
          <Link href={urlListado({ ...filtros, mes: sumarMeses(filtros.mes, -1) })}>
            <CaretLeftIcon aria-hidden className="size-5" />
          </Link>
        </Button>
        <p className="font-medium first-letter:uppercase" aria-live="polite">
          {nombreMes(filtros.mes)}
        </p>
        <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente">
          <Link href={urlListado({ ...filtros, mes: sumarMeses(filtros.mes, 1) })}>
            <CaretRightIcon aria-hidden className="size-5" />
          </Link>
        </Button>
      </div>

      <FiltrosMovimientos filtros={filtros} cuentas={cuentas.data} categorias={categorias.data} />

      {dias.length === 0 ? (
        <EstadoVacio
          titulo={hayFiltros ? "Nada con esos filtros" : `Sin movimientos en ${nombreMes(filtros.mes)}`}
          descripcion={hayFiltros ? undefined : "Usá el botón + para cargar el primero."}
        >
          {hayFiltros && (
            <Button asChild variant="outline">
              <Link href={urlListado({ mes: filtros.mes, cuenta: null, categoria: null })}>Quitar filtros</Link>
            </Button>
          )}
        </EstadoVacio>
      ) : (
        <div className="flex flex-col gap-5">
          {dias.map((dia) => (
            <section key={dia.fecha} aria-label={etiquetaDia(dia.fecha, hoy)} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">{etiquetaDia(dia.fecha, hoy)}</h2>
              <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
                {dia.movimientos.map((m) => {
                  const cuenta = cuentaDe.get(m.cuenta_id);
                  const detalle = [cuenta?.nombre, m.nota].filter(Boolean).join(", ");
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/movimientos/${m.id}?volver=${encodeURIComponent(volverA)}`}
                        className="flex min-h-16 items-center gap-3 px-4 py-2 transition-colors hover:bg-accent active:bg-accent"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">
                            {m.categoria_id ? (categoriaDe.get(m.categoria_id) ?? "Sin categoría") : "Sin categoría"}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {detalle}
                            {m.cuotas > 1 && `, ${m.cuotas} cuotas`}
                          </span>
                        </span>
                        <MontoMovimiento
                          monto={m.monto}
                          moneda={(cuenta?.moneda ?? "ARS") as Moneda}
                          tipo={m.tipo as "ingreso" | "gasto"}
                        />
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
