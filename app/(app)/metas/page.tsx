import type { Metadata } from "next";
import Link from "next/link";
import { CaretRightIcon, CheckCircleIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { Encabezado } from "@/components/encabezado";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearMonto, type Moneda } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import { progresoMeta } from "@/lib/metas/calculos";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Metas" };

export default async function MetasPage() {
  await requireUser();
  const supabase = await crearClienteServer();
  const { data, error } = await supabase.from("metas_progreso").select("*").order("created_at");
  if (error) throw new Error(`Leer metas: ${error.message}`);

  const activas = data.filter((m) => !m.completada);
  const completadas = data.filter((m) => m.completada);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <Encabezado titulo="Metas" />
        <Button asChild variant="outline">
          <Link href="/metas/nueva">
            <PlusIcon aria-hidden weight="bold" />
            Nueva
          </Link>
        </Button>
      </div>

      {data.length === 0 && (
        <EstadoVacio titulo="Todavía no tenés metas" descripcion="Definí para qué estás ahorrando y seguí cuánto te falta.">
          <Button asChild>
            <Link href="/metas/nueva">Crear meta</Link>
          </Button>
        </EstadoVacio>
      )}

      {activas.length > 0 && (
        <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
          {activas.map((m) => {
            const p = progresoMeta(m.aportado ?? 0, m.objetivo ?? 1);
            const moneda = m.moneda as Moneda;
            return (
              <li key={m.id}>
                <Link href={`/metas/${m.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent active:bg-accent">
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">{m.nombre}</span>
                      <span className="text-sm text-muted-foreground">{p.porcentaje}%</span>
                    </span>
                    <span aria-hidden className="block h-1.5 overflow-hidden rounded-[4px] bg-muted">
                      <span className="block h-full rounded-r-[4px] bg-ahorro" style={{ width: `${p.proporcion * 100}%` }} />
                    </span>
                    <span className="flex justify-between gap-3 text-sm text-muted-foreground">
                      <span className="truncate">
                        {formatearMonto(p.aportado, moneda)} de {formatearMonto(p.objetivo, moneda)}
                      </span>
                      {m.fecha_objetivo && <span className="whitespace-nowrap">{formatearFecha(m.fecha_objetivo)}</span>}
                    </span>
                  </span>
                  <CaretRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {completadas.length > 0 && (
        <section aria-labelledby="titulo-completadas" className="flex flex-col gap-3">
          <h2 id="titulo-completadas" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircleIcon aria-hidden className="size-4" weight="bold" />
            Completadas
          </h2>
          <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
            {completadas.map((m) => (
              <li key={m.id}>
                <Link href={`/metas/${m.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-accent active:bg-accent">
                  <span className="min-w-0 truncate">{m.nombre}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium whitespace-nowrap">{formatearMonto(String(m.aportado ?? 0), m.moneda as Moneda)}</span>
                    <CaretRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
