import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { Encabezado } from "@/components/encabezado";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearMonto, type Moneda } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";
import { ETIQUETAS_TIPO_CUENTA } from "@/lib/validaciones/cuentas";

export const metadata: Metadata = { title: "Cuentas" };

export default async function CuentasPage() {
  await requireUser();
  const supabase = await crearClienteServer();
  const [cuentas, saldos] = await Promise.all([
    supabase.from("cuentas").select("id, nombre, tipo, moneda, archivada").order("archivada").order("created_at"),
    supabase.from("saldos_cuentas").select("id, saldo_actual"),
  ]);
  if (cuentas.error) throw new Error(`Leer cuentas: ${cuentas.error.message}`);
  if (saldos.error) throw new Error(`Leer saldos: ${saldos.error.message}`);

  const saldoDe = new Map(saldos.data.map((s) => [s.id, s.saldo_actual]));
  const activas = cuentas.data.filter((c) => !c.archivada);
  const archivadas = cuentas.data.filter((c) => c.archivada);

  const fila = (c: (typeof cuentas.data)[number]) => {
    const saldo = saldoDe.get(c.id);
    return (
      <li key={c.id}>
        <Link href={`/cuentas/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent active:bg-accent">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{c.nombre}</span>
            <span className="text-sm text-muted-foreground">
              {ETIQUETAS_TIPO_CUENTA[c.tipo]} en {c.moneda}
            </span>
          </span>
          <span className="text-right font-medium">
            {c.tipo === "tarjeta" || saldo == null ? (
              <span className="text-sm font-normal text-muted-foreground">Sin saldo</span>
            ) : (
              formatearMonto(String(saldo), c.moneda as Moneda)
            )}
          </span>
          <CaretRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <Encabezado titulo="Cuentas" />
        <Button asChild variant="outline">
          <Link href="/cuentas/nueva">
            <PlusIcon aria-hidden weight="bold" />
            Nueva
          </Link>
        </Button>
      </div>

      {cuentas.data.length === 0 ? (
        <EstadoVacio titulo="Todavía no tenés cuentas" descripcion="Creá una para empezar a cargar gastos e ingresos.">
          <Button asChild>
            <Link href="/cuentas/nueva">Crear cuenta</Link>
          </Button>
        </EstadoVacio>
      ) : (
        activas.length > 0 && <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">{activas.map(fila)}</ul>
      )}

      {archivadas.length > 0 && (
        <section aria-labelledby="titulo-archivadas" className="flex flex-col gap-3">
          <h2 id="titulo-archivadas" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArchiveIcon aria-hidden className="size-4" />
            Archivadas
          </h2>
          <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">{archivadas.map(fila)}</ul>
        </section>
      )}
    </>
  );
}
