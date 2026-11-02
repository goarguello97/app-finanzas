import type Decimal from "decimal.js";
import Link from "next/link";
import { ArrowDownLeftIcon, ArrowUpRightIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { EstadoVacio } from "@/components/estado-vacio";
import { ExtraDelMes } from "@/components/resumen/extra-del-mes";
import { GastosPorCategoria } from "@/components/resumen/gastos-por-categoria";
import { SelectorMes } from "@/components/selector-mes";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearMonto, formatearNumero, type Moneda } from "@/lib/dinero";
import { esMesValido, formatearFecha, hoyBuenosAires, mesDe, nombreMes, rangoMes, sumarMeses } from "@/lib/fechas";
import { urlListado } from "@/lib/movimientos/listado";
import {
  convertir,
  cotizacionVencida,
  elegirCotizacion,
  enMoneda,
  estadoExtra,
  gastosPorCategoria,
  resumenDelMes,
  totalesDeCuentas,
  type Cotizacion,
} from "@/lib/resumen/calculos";
import { crearClienteServer } from "@/lib/supabase/server";

function SinConvertir({ monto, moneda }: { monto: Decimal; moneda: Moneda }) {
  if (monto.isZero()) return null;
  return <p className="text-sm text-muted-foreground">Más {formatearMonto(monto, moneda)} sin convertir</p>;
}

export default async function InicioPage({ searchParams }: { searchParams: Promise<{ mes?: string | string[] }> }) {
  await requireUser();
  const hoy = hoyBuenosAires();
  const { mes: mesPedido } = await searchParams;
  const mes = typeof mesPedido === "string" && esMesValido(mesPedido) ? mesPedido : mesDe(hoy);
  const { desde, hasta } = rangoMes(mes);

  const supabase = await crearClienteServer();
  const [configuracion, saldos, resumen, movimientos, cuentas, categorias, cotizaciones] = await Promise.all([
    supabase.from("configuracion").select("ingreso_minimo, moneda_base, exchange_cotizacion").maybeSingle(),
    supabase.from("saldos_cuentas").select("id, nombre, moneda, saldo_actual, archivada").order("created_at"),
    supabase.from("resumen_mensual").select("moneda, tipo, total").eq("mes", desde),
    supabase.from("movimientos").select("categoria_id, monto, cuenta_id").eq("tipo", "gasto").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("cuentas").select("id, moneda"),
    supabase.from("categorias").select("id, nombre, excluye_totales"),
    supabase.from("cotizacion_actual").select("fuente, compra, venta, fecha, created_at"),
  ]);
  const error =
    configuracion.error ?? saldos.error ?? resumen.error ?? movimientos.error ?? cuentas.error ?? categorias.error ?? cotizaciones.error;
  if (error) throw new Error(`Leer resumen: ${error.message}`);

  const monedaBase: Moneda = configuracion.data?.moneda_base === "USD" ? "USD" : "ARS";
  const otraMoneda: Moneda = monedaBase === "ARS" ? "USD" : "ARS";
  const cotizacion = elegirCotizacion((cotizaciones.data ?? []) as Cotizacion[], configuracion.data?.exchange_cotizacion ?? null);
  const vencida = cotizacion ? cotizacionVencida(cotizacion) : false;

  const activas = (saldos.data ?? []).filter((c) => !c.archivada);
  const totales = totalesDeCuentas(saldos.data ?? []);
  const total = enMoneda(totales, monedaBase, cotizacion);
  const totalEnOtra = convertir(total.total, monedaBase, otraMoneda, cotizacion);

  const { ingresos, gastos } = resumenDelMes(resumen.data ?? []);
  const ingresosBase = enMoneda(ingresos, monedaBase, cotizacion);
  const gastosBase = enMoneda(gastos, monedaBase, cotizacion);
  const balance = ingresosBase.total.minus(gastosBase.total);

  const monedaDe = new Map((cuentas.data ?? []).map((c) => [c.id, c.moneda]));
  const porCategoria = gastosPorCategoria(
    (movimientos.data ?? []).map((m) => ({ categoria_id: m.categoria_id, monto: m.monto, moneda: monedaDe.get(m.cuenta_id) ?? "ARS" })),
    categorias.data ?? [],
    monedaBase,
    cotizacion,
  );
  const extra = estadoExtra(ingresos.ARS, configuracion.data?.ingreso_minimo ?? null);

  if (activas.length === 0) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Inicio</h1>
        <EstadoVacio titulo="Empezá por crear una cuenta" descripcion="Con una cuenta y su saldo ya podés cargar movimientos y ver tu resumen.">
          <Button asChild>
            <Link href="/cuentas/nueva">Crear cuenta</Link>
          </Button>
        </EstadoVacio>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Inicio</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-12">
        <section aria-labelledby="titulo-total" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="titulo-total" className="text-sm text-muted-foreground">
              Total en cuentas
            </h2>
            <p className="text-4xl font-semibold tracking-tight lg:text-5xl">{formatearMonto(total.total, monedaBase)}</p>
            {totalEnOtra && <p className="text-muted-foreground">Equivale a {formatearMonto(totalEnOtra, otraMoneda)}</p>}
            <SinConvertir monto={total.sinConvertir} moneda={otraMoneda} />

            {cotizacion ? (
              <p className={vencida ? "mt-2 flex items-start gap-1.5 text-sm" : "mt-2 text-sm text-muted-foreground"}>
                {vencida && <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" weight="bold" />}
                {vencida ? (
                  `La cotización es del ${formatearFecha(cotizacion.fecha)}: tiene más de 48 horas y los montos convertidos pueden estar desactualizados.`
                ) : (
                  <>
                    USDC en {cotizacion.fuente}: <span className="whitespace-nowrap">compra $ {formatearNumero(String(cotizacion.compra))},</span>{" "}
                    <span className="whitespace-nowrap">venta $ {formatearNumero(String(cotizacion.venta))}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Todavía no hay cotización de USDC para convertir entre monedas.</p>
            )}
          </div>

          <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
            {activas.map((c) => (
              <li key={c.id}>
                <Link
                  href={urlListado({ mes, cuenta: c.id, categoria: null })}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-accent active:bg-accent"
                >
                  <span className="min-w-0 truncate">{c.nombre}</span>
                  <span className="font-medium whitespace-nowrap">{formatearMonto(String(c.saldo_actual ?? 0), c.moneda as Moneda)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-8">
          <SelectorMes mes={mes} anterior={`/?mes=${sumarMeses(mes, -1)}`} siguiente={`/?mes=${sumarMeses(mes, 1)}`} />

          <section aria-labelledby="titulo-mes" className="flex flex-col gap-4">
            <h2 id="titulo-mes" className="sr-only">
              Ingresos y gastos de {nombreMes(mes)}
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="flex min-w-0 flex-col gap-1">
                <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ArrowDownLeftIcon aria-hidden className="size-3.5 text-ingreso" weight="bold" />
                  Ingresos
                </dt>
                <dd className="text-xl font-semibold tracking-tight lg:text-2xl">{formatearMonto(ingresosBase.total, monedaBase)}</dd>
                <SinConvertir monto={ingresosBase.sinConvertir} moneda={otraMoneda} />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ArrowUpRightIcon aria-hidden className="size-3.5 text-gasto" weight="bold" />
                  Gastos
                </dt>
                <dd className="text-xl font-semibold tracking-tight lg:text-2xl">{formatearMonto(gastosBase.total, monedaBase)}</dd>
                <SinConvertir monto={gastosBase.sinConvertir} moneda={otraMoneda} />
              </div>
              <div className="col-span-2 flex items-baseline justify-between gap-3 border-t pt-3">
                <dt className="text-sm text-muted-foreground">{balance.isNegative() ? "Gastaste de más" : "Te queda del mes"}</dt>
                <dd className="font-medium">{formatearMonto(balance.abs(), monedaBase)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="titulo-extra" className="flex flex-col gap-3">
            <h2 id="titulo-extra" className="text-lg font-medium">
              Extra del mes
            </h2>
            <ExtraDelMes estado={extra} />
          </section>

          <section aria-labelledby="titulo-categorias" className="flex flex-col gap-3">
            <h2 id="titulo-categorias" className="text-lg font-medium">
              Gastos por categoría
            </h2>
            {porCategoria.filas.length === 0 && porCategoria.sinConvertir.isZero() ? (
              <p className="text-sm text-muted-foreground">Sin gastos en {nombreMes(mes)}.</p>
            ) : (
              <GastosPorCategoria filas={porCategoria.filas} moneda={monedaBase} mes={mes} />
            )}
            <SinConvertir monto={porCategoria.sinConvertir} moneda={otraMoneda} />
          </section>
        </div>
      </div>
    </>
  );
}
