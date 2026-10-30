import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarMovimiento } from "@/actions/movimientos";
import { Button } from "@/components/ui/button";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { FormMovimiento } from "@/components/movimientos/form-movimiento";
import { requireUser } from "@/lib/auth/sesion";
import { formatearNumero } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar movimiento" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditarMovimientoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string | string[] }>;
}) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { volver } = await searchParams;
  // Solo rutas internas del listado, para que el parámetro no pueda redirigir afuera.
  const volverA = typeof volver === "string" && volver.startsWith("/movimientos") ? volver : "/movimientos";

  const supabase = await crearClienteServer();
  const [movimiento, cuentas, categorias] = await Promise.all([
    supabase.from("movimientos").select("*").eq("id", id).maybeSingle(),
    supabase.from("cuentas").select("id, nombre, tipo, archivada").order("created_at"),
    supabase.from("categorias").select("id, nombre, tipo").order("nombre"),
  ]);
  if (movimiento.error) throw new Error(`Leer movimiento: ${movimiento.error.message}`);
  if (cuentas.error) throw new Error(`Leer cuentas: ${cuentas.error.message}`);
  if (categorias.error) throw new Error(`Leer categorías: ${categorias.error.message}`);
  if (!movimiento.data) notFound();

  const m = movimiento.data;

  const pago = await supabase.from("pagos_deuda").select("deuda_id").eq("movimiento_id", id).maybeSingle();
  if (pago.error) throw new Error(`Leer pago: ${pago.error.message}`);
  if (pago.data) {
    return (
      <>
        <EnlaceVolver href={volverA} etiqueta="Movimientos" />
        <Encabezado titulo="Pago de deuda" descripcion="Este gasto se generó al registrar un pago. Para cambiarlo o eliminarlo, hacelo desde la deuda." />
        <Button asChild className="self-start">
          <Link href={`/deudas/${pago.data.deuda_id}`}>Ir a la deuda</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <EnlaceVolver href={volverA} etiqueta="Movimientos" />
      <Encabezado titulo="Editar movimiento" />
      <FormMovimiento
        id={id}
        volverA={volverA}
        cuentas={cuentas.data}
        categorias={categorias.data}
        inicial={{
          tipo: m.tipo,
          monto: formatearNumero(String(m.monto)),
          cuenta_id: m.cuenta_id,
          categoria_id: m.categoria_id ?? "",
          fecha: m.fecha,
          nota: m.nota ?? "",
          cuotas: String(m.cuotas),
        }}
      />

      <section aria-labelledby="titulo-eliminar" className="flex max-w-md flex-col items-start gap-4 border-t pt-6">
        <h2 id="titulo-eliminar" className="text-lg font-medium">
          Eliminar
        </h2>
        <BotonConfirmar
          etiqueta="Eliminar movimiento"
          confirmacion="¿Eliminar este movimiento? No se puede deshacer."
          etiquetaConfirmar="Sí, eliminar"
          variante="destructive"
          accion={eliminarMovimiento.bind(null, id, volverA)}
        />
      </section>
    </>
  );
}
