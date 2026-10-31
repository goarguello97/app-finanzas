import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { actualizarMeta, eliminarMeta } from "@/actions/metas";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { FormMeta } from "@/components/metas/form-meta";
import { requireUser } from "@/lib/auth/sesion";
import { formatearNumero } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar meta" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditarMetaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await crearClienteServer();
  const [meta, aportes] = await Promise.all([
    supabase.from("metas").select("nombre, moneda, objetivo, fecha_objetivo").eq("id", id).maybeSingle(),
    supabase.from("aportes_meta").select("id", { count: "exact", head: true }).eq("meta_id", id),
  ]);
  if (meta.error) throw new Error(`Leer meta: ${meta.error.message}`);
  if (aportes.error) throw new Error(`Contar aportes: ${aportes.error.message}`);
  if (!meta.data) notFound();

  const m = meta.data;
  return (
    <>
      <EnlaceVolver href={`/metas/${id}`} etiqueta={m.nombre} />
      <Encabezado titulo="Editar meta" />
      <FormMeta
        accion={actualizarMeta.bind(null, id)}
        etiquetaGuardar="Guardar cambios"
        monedaBloqueada={(aportes.count ?? 0) > 0}
        inicial={{ nombre: m.nombre, moneda: m.moneda, objetivo: formatearNumero(String(m.objetivo)), fecha_objetivo: m.fecha_objetivo ?? "" }}
      />

      <section aria-labelledby="titulo-eliminar" className="flex max-w-md flex-col items-start gap-4 border-t pt-6">
        <h2 id="titulo-eliminar" className="text-lg font-medium">
          Eliminar
        </h2>
        <BotonConfirmar
          etiqueta="Eliminar meta"
          confirmacion="¿Eliminar esta meta y sus aportes? La plata de tus cuentas no cambia. No se puede deshacer."
          etiquetaConfirmar="Sí, eliminar"
          variante="destructive"
          accion={eliminarMeta.bind(null, id)}
        />
      </section>
    </>
  );
}
