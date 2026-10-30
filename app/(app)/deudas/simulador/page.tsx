import type Decimal from "decimal.js";
import type { Metadata } from "next";
import Link from "next/link";
import { ElegirEstrategia } from "@/components/deudas/elegir-estrategia";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/sesion";
import { aDecimal, formatearMonto, formatearNumero, parsearMonto } from "@/lib/dinero";
import { prepararDeudas } from "@/lib/deudas/preparar";
import { comparar, type Estrategia, type ResultadoEstrategia } from "@/lib/deudas/simulador";
import { hoyBuenosAires, mesDe, nombreMes, rangoMes, sumarMeses } from "@/lib/fechas";
import { elegirCotizacion, estadoExtra, resumenDelMes, type Cotizacion } from "@/lib/resumen/calculos";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Comparar estrategias" };

const MESES_EN_CRONOGRAMA = 120;

const NOMBRES: Record<Estrategia, { titulo: string; descripcion: string }> = {
  bola_de_nieve: { titulo: "Bola de nieve", descripcion: "Primero la de menor saldo" },
  avalancha: { titulo: "Avalancha", descripcion: "Primero la de mayor TNA" },
};

function textoMeses(meses: number): string {
  return meses === 1 ? "1 mes" : `${meses} meses`;
}

function Columna({ resultado, elegida }: { resultado: ResultadoEstrategia; elegida: boolean }) {
  const { titulo, descripcion } = NOMBRES[resultado.estrategia];
  return (
    <section aria-label={titulo} className="flex min-w-0 flex-col gap-4 rounded-superficie border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>

      <dl className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Sin deudas en</dt>
          <dd className="font-semibold first-letter:uppercase sm:text-lg">{nombreMes(resultado.mesLibertad)}</dd>
          <dd className="text-sm text-muted-foreground">{textoMeses(resultado.meses)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Intereses</dt>
          <dd className="font-semibold break-words sm:text-lg">{formatearMonto(resultado.intereses)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">Total a pagar</dt>
          <dd className="font-medium break-words">{formatearMonto(resultado.pagado)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-muted-foreground">Se cancela cada una en</h3>
        <ol className="flex flex-col gap-1.5 text-sm">
          {[...resultado.deudas]
            .sort((a, b) => a.meses - b.meses)
            .map((d) => (
              <li key={d.id} className="flex flex-col">
                <span className="truncate font-medium">{d.nombre}</span>
                <span className="text-muted-foreground first-letter:uppercase">{nombreMes(d.mesCancelacion)}</span>
              </li>
            ))}
        </ol>
      </div>

      <div className="mt-auto">
        <ElegirEstrategia estrategia={resultado.estrategia} elegida={elegida} />
      </div>
    </section>
  );
}

function Cronograma({ resultado }: { resultado: ResultadoEstrategia }) {
  const filas = resultado.cronograma.slice(0, MESES_EN_CRONOGRAMA);
  const nombres = new Map(resultado.deudas.map((d) => [d.id, d.nombre]));
  return (
    <details className="group rounded-superficie border bg-card">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium">Cronograma de {NOMBRES[resultado.estrategia].titulo.toLowerCase()}</summary>
      <ol className="flex flex-col divide-y border-t">
        {filas.map((mes) => (
          <li key={mes.numero} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium first-letter:uppercase">{nombreMes(mes.mes)}</span>
              <span className="text-sm whitespace-nowrap">Paga {formatearMonto(mes.pago)}</span>
            </div>
            <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
              {mes.deudas.map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{nombres.get(d.id)}</span>
                  <span className="whitespace-nowrap">
                    {formatearMonto(d.pago)}, queda {formatearMonto(d.saldoFinal)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {resultado.cronograma.length > filas.length && (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">Se muestran los primeros {MESES_EN_CRONOGRAMA} meses.</p>
      )}
    </details>
  );
}

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<{ extra?: string | string[] }> }) {
  await requireUser();
  const hoy = hoyBuenosAires();
  const mesActual = mesDe(hoy);
  const supabase = await crearClienteServer();

  const [deudas, configuracion, resumen, cotizaciones] = await Promise.all([
    supabase.from("deudas_saldo").select("id, acreedor, moneda, pendiente, tasa_anual, pago_minimo").eq("estado", "activa").order("created_at"),
    supabase.from("configuracion").select("ingreso_minimo, exchange_cotizacion, estrategia_deudas").maybeSingle(),
    supabase.from("resumen_mensual").select("moneda, tipo, total").eq("mes", rangoMes(mesActual).desde),
    supabase.from("cotizacion_actual").select("fuente, compra, venta, fecha, created_at"),
  ]);
  const error = deudas.error ?? configuracion.error ?? resumen.error ?? cotizaciones.error;
  if (error) throw new Error(`Leer simulador: ${error.message}`);

  const cotizacion = elegirCotizacion((cotizaciones.data ?? []) as Cotizacion[], configuracion.data?.exchange_cotizacion ?? null);
  const preparacion = prepararDeudas(deudas.data ?? [], cotizacion);
  const elegida = configuracion.data?.estrategia_deudas;

  // Por defecto, el extra de este mes. Se puede cambiar para probar otros escenarios.
  const { ingresos } = resumenDelMes(resumen.data ?? []);
  const estadoDelMes = estadoExtra(ingresos.ARS, configuracion.data?.ingreso_minimo ?? null);
  const extraSugerido: Decimal = estadoDelMes.conMinimo ? estadoDelMes.extra : aDecimal(0);

  const { extra: extraPedido } = await searchParams;
  const extraTexto = typeof extraPedido === "string" ? extraPedido : formatearNumero(extraSugerido);
  const extra = extraTexto.trim() === "" ? aDecimal(0) : parsearMonto(extraTexto);

  const montoMensual = extra ? preparacion.minimos.plus(extra) : null;
  const resultado =
    montoMensual && preparacion.deudas.length > 0
      ? comparar({ deudas: preparacion.deudas, montoMensual, mesInicio: sumarMeses(mesActual, 1) })
      : null;

  return (
    <>
      <EnlaceVolver href="/deudas" etiqueta="Deudas" />
      <Encabezado titulo="Comparar estrategias" descripcion="Cómo salir de tus deudas según a cuál le ponés primero lo que sobra de cada mes." />

      {preparacion.incompletas.length > 0 && (
        <div role="status" className="flex max-w-xl flex-col gap-1 text-sm">
          <p>Estas deudas no entran en la comparación porque les falta la TNA o el pago mínimo:</p>
          <ul className="flex flex-wrap gap-x-3">
            {preparacion.incompletas.map((d) => (
              <li key={d.id}>
                <Link href={`/deudas/${d.id}/editar`} className="underline underline-offset-4">
                  {d.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {preparacion.faltaCotizacion && (
        <p role="status" className="max-w-xl text-sm">
          Tus deudas en dólares no entran en la comparación porque todavía no hay cotización de USDC para pasarlas a pesos.
        </p>
      )}

      {preparacion.deudas.length === 0 ? (
        <EstadoVacio titulo="No hay deudas para comparar" descripcion="Cargá una deuda activa con su TNA y su pago mínimo.">
          <Button asChild>
            <Link href="/deudas/nueva">Cargar deuda</Link>
          </Button>
        </EstadoVacio>
      ) : (
        <>
          <form className="flex max-w-xl flex-col gap-3" method="get">
            <div className="flex flex-col gap-2">
              <Label htmlFor="extra">Extra por mes, además de los mínimos</Label>
              <div className="flex gap-2">
                <Input
                  id="extra"
                  name="extra"
                  inputMode="decimal"
                  autoComplete="off"
                  defaultValue={extraTexto}
                  key={extraTexto}
                  aria-invalid={!extra}
                  aria-describedby="extra-ayuda extra-error"
                />
                <Button type="submit" variant="outline">
                  Simular
                </Button>
              </div>
              <p id="extra-ayuda" className="text-sm text-muted-foreground">
                Mínimos: {formatearMonto(preparacion.minimos)} por mes
                {montoMensual ? `. Total: ${formatearMonto(montoMensual)}.` : "."}
              </p>
              <ErrorDeCampo id="extra-error" mensaje={extra ? undefined : "Escribí un monto válido, por ejemplo 150.000,50."} />
            </div>
            {preparacion.hayEnDolares && cotizacion && (
              <p className="text-sm text-muted-foreground">
                Las deudas en dólares se pasan a pesos a {formatearMonto(String(cotizacion.venta))}. La comparación supone que la cotización no cambia.
              </p>
            )}
          </form>

          {resultado && !resultado.ok && (
            <div role="alert" className="flex max-w-xl flex-col gap-1">
              <ErrorDeCampo mensaje={resultado.error.mensaje} />
              {resultado.error.codigo === "fondos_insuficientes" && (
                <p className="text-sm text-muted-foreground">Te faltan {formatearMonto(resultado.error.faltante)} por mes.</p>
              )}
            </div>
          )}

          {resultado?.ok && (
            <>
              <p className="max-w-xl">
                {resultado.valor.ahorroAvalancha.isZero()
                  ? "Con estos datos, las dos estrategias pagan los mismos intereses."
                  : `Avalancha paga ${formatearMonto(resultado.valor.ahorroAvalancha.abs())} ${resultado.valor.ahorroAvalancha.isNegative() ? "más" : "menos"} de intereses que bola de nieve.`}
              </p>

              <div className="grid grid-cols-2 gap-3 lg:gap-6">
                <Columna resultado={resultado.valor.bolaDeNieve} elegida={elegida === "bola_de_nieve"} />
                <Columna resultado={resultado.valor.avalancha} elegida={elegida === "avalancha"} />
              </div>

              <p className="text-sm text-muted-foreground">
                Es una proyección: supone que la TNA y lo que pagás por mes no cambian, y que el primer pago es en {nombreMes(sumarMeses(mesActual, 1))}.
              </p>

              <div className="flex flex-col gap-3">
                <Cronograma resultado={resultado.valor.bolaDeNieve} />
                <Cronograma resultado={resultado.valor.avalancha} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
