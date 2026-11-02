import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { actualizarDeuda, eliminarDeuda } from "@/actions/deudas";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { FormDeuda } from "@/components/deudas/form-deuda";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { requireUser } from "@/lib/auth/sesion";
import { formatearNumero } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar deuda" };

const UUID = /^[0-9a-f-]{36}$/i;
const montoATexto = (valor: number | null) => (valor != null ? formatearNumero(String(valor)) : "");

export default async function EditarDeudaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await crearClienteServer();
  const { data: d, error } = await supabase.from("deudas_saldo").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Leer deuda: ${error.message}`);
  if (!d) notFound();

  return (
    <>
      <EnlaceVolver href={`/deudas/${id}`} etiqueta={d.acreedor ?? "Deuda"} />
      <Encabezado titulo="Editar deuda" />
      <FormDeuda
        accion={actualizarDeuda.bind(null, id)}
        etiquetaGuardar="Guardar cambios"
        monedaBloqueada={(d.pagos_realizados ?? 0) > 0}
        inicial={{
          tipo: d.tipo ?? "tarjeta",
          acreedor: d.acreedor ?? "",
          descripcion: d.descripcion ?? "",
          moneda: d.moneda ?? "ARS",
          monto_total: montoATexto(d.monto_total),
          tasa_anual: d.tasa_anual != null ? String(d.tasa_anual).replace(".", ",") : "",
          pago_minimo: montoATexto(d.pago_minimo),
          cuotas_total: d.cuotas_total?.toString() ?? "",
          monto_cuota: montoATexto(d.monto_cuota),
          dia_vencimiento: d.dia_vencimiento?.toString() ?? "",
          fecha_inicio: d.fecha_inicio ?? "",
        }}
      />

      <section aria-labelledby="titulo-eliminar" className="flex max-w-md flex-col items-start gap-4 border-t pt-6">
        <h2 id="titulo-eliminar" className="text-lg font-medium">
          Eliminar
        </h2>
        <BotonConfirmar
          etiqueta="Eliminar deuda"
          confirmacion="¿Eliminar esta deuda y sus pagos? Los gastos que generaron siguen en Movimientos. No se puede deshacer."
          etiquetaConfirmar="Sí, eliminar"
          variante="destructive"
          accion={eliminarDeuda.bind(null, id)}
        />
      </section>
    </>
  );
}
