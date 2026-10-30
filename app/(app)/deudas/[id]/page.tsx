import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircleIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";
import { eliminarPago } from "@/actions/deudas";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { FormPago } from "@/components/deudas/form-pago";
import { EnlaceVolver } from "@/components/enlace-volver";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearMonto, formatearNumero, type Moneda } from "@/lib/dinero";
import { etiquetaDia, hoyBuenosAires } from "@/lib/fechas";
import { crearClienteServer } from "@/lib/supabase/server";
import { ETIQUETAS_TIPO_DEUDA } from "@/lib/validaciones/deudas";

export const metadata: Metadata = { title: "Deuda" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function DeudaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await crearClienteServer();
  const [deuda, pagos, cuentas, categorias] = await Promise.all([
    supabase.from("deudas_saldo").select("*").eq("id", id).maybeSingle(),
    supabase.from("pagos_deuda").select("id, monto, interes, fecha, movimiento_id").eq("deuda_id", id).order("fecha", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("cuentas").select("id, nombre, moneda, tipo").eq("archivada", false).order("created_at"),
    supabase.from("categorias").select("id, nombre").eq("tipo", "gasto").order("nombre"),
  ]);
  if (deuda.error) throw new Error(`Leer deuda: ${deuda.error.message}`);
  if (pagos.error) throw new Error(`Leer pagos: ${pagos.error.message}`);
  if (cuentas.error) throw new Error(`Leer cuentas: ${cuentas.error.message}`);
  if (categorias.error) throw new Error(`Leer categorías: ${categorias.error.message}`);
  if (!deuda.data) notFound();

  const d = deuda.data;
  const moneda = d.moneda as Moneda;
  const hoy = hoyBuenosAires();
  const saldada = d.estado === "saldada";
  // Las tarjetas no tienen saldo propio, y pagar desde otra moneda requeriría una conversión.
  const cuentasPago = cuentas.data.filter((c) => c.moneda === d.moneda && c.tipo !== "tarjeta");
  const categoriaPago = categorias.data.find((c) => c.nombre === "Pago de deudas")?.id ?? "";
  const cuota = d.monto_cuota ?? d.pago_minimo;
  const montoSugerido = cuota ? formatearNumero(String(cuota)) : "";

  return (
    <>
      <EnlaceVolver href="/deudas" etiqueta="Deudas" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{d.acreedor}</h1>
          <p className="text-muted-foreground">
            {ETIQUETAS_TIPO_DEUDA[d.tipo ?? ""]} en {d.moneda}
            {d.descripcion && `, ${d.descripcion}`}
          </p>
        </div>
        <Button asChild variant="outline" size="icon" aria-label="Editar deuda">
          <Link href={`/deudas/${id}/editar`}>
            <PencilSimpleIcon aria-hidden className="size-5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {saldada && <CheckCircleIcon aria-hidden className="size-4" weight="bold" />}
              {saldada ? "Saldada" : "Te queda por pagar"}
            </p>
            <p className="text-3xl font-semibold tracking-tight lg:text-4xl">{formatearMonto(String(d.pendiente ?? 0), moneda)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Saldo al cargarla</dt>
              <dd className="font-medium">{formatearMonto(String(d.monto_total ?? 0), moneda)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Capital pagado</dt>
              <dd className="font-medium">{formatearMonto(String(d.capital_pagado ?? 0), moneda)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Intereses pagados</dt>
              <dd className="font-medium">{formatearMonto(String(d.interes_pagado ?? 0), moneda)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">TNA</dt>
              <dd className="font-medium">{d.tasa_anual != null ? `${String(d.tasa_anual).replace(".", ",")}%` : "Sin cargar"}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Pago mínimo</dt>
              <dd className="font-medium">{d.pago_minimo != null ? formatearMonto(String(d.pago_minimo), moneda) : "Sin cargar"}</dd>
            </div>
            {d.cuotas_total != null && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Pagos hechos</dt>
                <dd className="font-medium">
                  {d.pagos_realizados} de {d.cuotas_total} cuotas
                </dd>
              </div>
            )}
          </dl>

          <section aria-labelledby="titulo-pagos" className="flex flex-col gap-3">
            <h2 id="titulo-pagos" className="text-lg font-medium">
              Pagos
            </h2>
            {pagos.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no registraste pagos.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {pagos.data.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{etiquetaDia(p.fecha, hoy)}</span>
                      <span className="font-medium">{formatearMonto(String(p.monto), moneda)}</span>
                    </div>
                    {(p.interes > 0 || !p.movimiento_id) && (
                      <p className="text-sm text-muted-foreground">
                        {p.interes > 0 && `Incluye ${formatearMonto(String(p.interes), moneda)} de intereses. `}
                        {!p.movimiento_id && "Sin gasto asociado."}
                      </p>
                    )}
                    <div>
                      <BotonConfirmar
                        etiqueta="Eliminar pago"
                        confirmacion={
                          p.movimiento_id ? "¿Eliminar este pago y su gasto? El saldo de la cuenta y de la deuda se corrigen." : "¿Eliminar este pago?"
                        }
                        etiquetaConfirmar="Sí, eliminar"
                        variante="destructive"
                        accion={eliminarPago.bind(null, p.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {!saldada && (
          <section aria-labelledby="titulo-registrar" className="flex min-w-0 flex-col gap-4">
            <h2 id="titulo-registrar" className="text-lg font-medium">
              Registrar un pago
            </h2>
            {cuentasPago.length === 0 && (
              <p className="max-w-md text-sm text-muted-foreground">
                No tenés cuentas activas en {d.moneda}, así que este pago no se puede registrar como gasto.{" "}
                <Link href="/cuentas/nueva" className="text-foreground underline underline-offset-4">
                  Crear una cuenta
                </Link>
              </p>
            )}
            <FormPago
              deudaId={id}
              cuentas={cuentasPago}
              categorias={categorias.data}
              categoriaInicial={categoriaPago}
              montoSugerido={montoSugerido}
              fechaInicial={hoy}
            />
          </section>
        )}
      </div>
    </>
  );
}
