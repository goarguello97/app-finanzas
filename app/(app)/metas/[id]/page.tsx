import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircleIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";
import { eliminarAporte } from "@/actions/metas";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EnlaceVolver } from "@/components/enlace-volver";
import { FormAporte } from "@/components/metas/form-aporte";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearMonto, type Moneda } from "@/lib/dinero";
import { etiquetaDia, formatearFecha, hoyBuenosAires } from "@/lib/fechas";
import { aporteMensualNecesario, progresoMeta } from "@/lib/metas/calculos";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meta" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function MetaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await crearClienteServer();
  const [meta, aportes] = await Promise.all([
    supabase.from("metas_progreso").select("*").eq("id", id).maybeSingle(),
    supabase.from("aportes_meta").select("id, monto, fecha").eq("meta_id", id).order("fecha", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (meta.error) throw new Error(`Leer meta: ${meta.error.message}`);
  if (aportes.error) throw new Error(`Leer aportes: ${aportes.error.message}`);
  if (!meta.data) notFound();

  const m = meta.data;
  const moneda = m.moneda as Moneda;
  const hoy = hoyBuenosAires();
  const p = progresoMeta(m.aportado ?? 0, m.objetivo ?? 1);
  const mensual = aporteMensualNecesario(p.falta, m.fecha_objetivo, hoy);
  const vencida = Boolean(m.fecha_objetivo && m.fecha_objetivo < hoy && !p.cumplida);

  return (
    <>
      <EnlaceVolver href="/metas" etiqueta="Metas" />

      <div className="flex items-start justify-between gap-4">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight lg:text-3xl">{m.nombre}</h1>
        <Button asChild variant="outline" size="icon" aria-label="Editar meta">
          <Link href={`/metas/${id}/editar`}>
            <PencilSimpleIcon aria-hidden className="size-5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {p.cumplida && <CheckCircleIcon aria-hidden className="size-4" weight="bold" />}
              {p.cumplida ? "Meta cumplida" : "Llevás ahorrado"}
            </p>
            <p className="text-3xl font-semibold tracking-tight lg:text-4xl">{formatearMonto(p.aportado, moneda)}</p>
            <div
              role="meter"
              aria-label="Avance de la meta"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={p.porcentaje}
              className="h-1.5 overflow-hidden rounded-[4px] bg-muted"
            >
              <div className="h-full rounded-r-[4px] bg-ahorro" style={{ width: `${p.proporcion * 100}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">
              {p.porcentaje}% de {formatearMonto(p.objetivo, moneda)}
            </p>
          </div>

          {!p.cumplida && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Te falta</dt>
                <dd className="font-medium">{formatearMonto(p.falta, moneda)}</dd>
              </div>
              {m.fecha_objetivo && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Fecha objetivo</dt>
                  <dd className="font-medium">
                    {formatearFecha(m.fecha_objetivo)}
                    {vencida && ", ya pasó"}
                  </dd>
                </div>
              )}
              {mensual && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Para llegar, por mes</dt>
                  <dd className="font-medium">{formatearMonto(mensual, moneda)}</dd>
                </div>
              )}
            </dl>
          )}

          <section aria-labelledby="titulo-aportes" className="flex flex-col gap-3">
            <h2 id="titulo-aportes" className="text-lg font-medium">
              Aportes
            </h2>
            {aportes.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no registraste aportes.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {aportes.data.map((a) => (
                  <li key={a.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{etiquetaDia(a.fecha, hoy)}</span>
                      <span className="font-medium">
                        {a.monto > 0 ? "+" : ""}
                        {formatearMonto(String(a.monto), moneda)}
                      </span>
                    </div>
                    <div>
                      <BotonConfirmar
                        etiqueta="Eliminar"
                        confirmacion="¿Eliminar este registro?"
                        etiquetaConfirmar="Sí, eliminar"
                        variante="destructive"
                        accion={eliminarAporte.bind(null, a.id, id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="titulo-registrar" className="flex min-w-0 flex-col gap-4">
          <h2 id="titulo-registrar" className="text-lg font-medium">
            Registrar
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">Es plata que ya está en tus cuentas: reservarla acá no cambia sus saldos.</p>
          <FormAporte metaId={id} fechaInicial={hoy} simbolo={m.moneda ?? "USD"} />
        </section>
      </div>
    </>
  );
}
