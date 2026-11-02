import type { Metadata } from "next";
import Link from "next/link";
import { CaretRightIcon, ChartLineDownIcon, CheckCircleIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { Encabezado } from "@/components/encabezado";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { aDecimal, formatearMonto, type Moneda } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";
import { ETIQUETAS_TIPO_DEUDA } from "@/lib/validaciones/deudas";

export const metadata: Metadata = { title: "Deudas" };

function textoTasa(tasa: number | null): string {
  return tasa == null ? "Sin TNA" : `TNA ${String(tasa).replace(".", ",")}%`;
}

export default async function DeudasPage() {
  await requireUser();
  const supabase = await crearClienteServer();
  const { data, error } = await supabase.from("deudas_saldo").select("*").order("created_at");
  if (error) throw new Error(`Leer deudas: ${error.message}`);

  const activas = data.filter((d) => d.estado === "activa");
  const saldadas = data.filter((d) => d.estado === "saldada");
  const totalDe = (moneda: Moneda) =>
    activas.filter((d) => d.moneda === moneda).reduce((suma, d) => suma.plus(String(d.pendiente ?? 0)), aDecimal(0));
  const totalArs = totalDe("ARS");
  const totalUsd = totalDe("USD");

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <Encabezado titulo="Deudas" />
        <Button asChild variant="outline">
          <Link href="/deudas/nueva">
            <PlusIcon aria-hidden weight="bold" />
            Nueva
          </Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <EstadoVacio titulo="No cargaste deudas" descripcion="Cargá tus tarjetas y préstamos para comparar cómo salir de ellas más rápido.">
          <Button asChild>
            <Link href="/deudas/nueva">Cargar deuda</Link>
          </Button>
        </EstadoVacio>
      ) : (
        <>
          {activas.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">Te queda por pagar</p>
              {!totalArs.isZero() && <p className="text-3xl font-semibold tracking-tight lg:text-4xl">{formatearMonto(totalArs, "ARS")}</p>}
              {!totalUsd.isZero() && <p className="text-3xl font-semibold tracking-tight lg:text-4xl">{formatearMonto(totalUsd, "USD")}</p>}
              <Button asChild className="mt-3 w-full sm:w-fit">
                <Link href="/deudas/simulador">
                  <ChartLineDownIcon aria-hidden weight="bold" className="size-5" />
                  Comparar estrategias
                </Link>
              </Button>
            </div>
          )}

          {activas.length > 0 && (
            <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
              {activas.map((d) => {
                const total = d.monto_total ?? 0;
                const pagado = total > 0 ? Math.min(((d.capital_pagado ?? 0) / total) * 100, 100) : 0;
                return (
                  <li key={d.id}>
                    <Link href={`/deudas/${d.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent active:bg-accent">
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate font-medium">{d.acreedor}</span>
                          <span className="font-medium whitespace-nowrap">{formatearMonto(String(d.pendiente ?? 0), d.moneda as Moneda)}</span>
                        </span>
                        <span aria-hidden className="block h-1.5 overflow-hidden rounded-[4px] bg-muted">
                          <span className="block h-full rounded-r-[4px] bg-deuda" style={{ width: `${pagado}%` }} />
                        </span>
                        <span className="flex justify-between gap-3 text-sm text-muted-foreground">
                          <span className="truncate">
                            {ETIQUETAS_TIPO_DEUDA[d.tipo ?? ""]}, {textoTasa(d.tasa_anual)}
                          </span>
                          <span className="whitespace-nowrap">{Math.round(pagado)}% pagado</span>
                        </span>
                      </span>
                      <CaretRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {saldadas.length > 0 && (
            <section aria-labelledby="titulo-saldadas" className="flex flex-col gap-3">
              <h2 id="titulo-saldadas" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircleIcon aria-hidden className="size-4" weight="bold" />
                Saldadas
              </h2>
              <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
                {saldadas.map((d) => (
                  <li key={d.id}>
                    <Link href={`/deudas/${d.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-accent active:bg-accent">
                      <span className="min-w-0 truncate">{d.acreedor}</span>
                      <CaretRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
