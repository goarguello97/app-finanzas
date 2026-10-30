import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { actualizarCategoria, eliminarCategoria } from "@/actions/categorias";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { FormCategoria } from "@/components/categorias/form-categoria";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { requireUser } from "@/lib/auth/sesion";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar categoría" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await crearClienteServer();
  const { data, error } = await supabase.from("categorias").select("nombre, tipo, excluye_totales").eq("id", id).maybeSingle();
  if (error) throw new Error(`Leer categoría: ${error.message}`);
  if (!data) notFound();

  return (
    <>
      <EnlaceVolver href="/categorias" etiqueta="Categorías" />
      <Encabezado titulo={data.nombre} descripcion={data.tipo === "gasto" ? "Categoría de gastos" : "Categoría de ingresos"} />
      <FormCategoria accion={actualizarCategoria.bind(null, id)} etiquetaGuardar="Guardar cambios" tipoBloqueado inicial={data} />

      <section aria-labelledby="titulo-eliminar" className="flex max-w-md flex-col items-start gap-4 border-t pt-6">
        <h2 id="titulo-eliminar" className="text-lg font-medium">
          Eliminar
        </h2>
        <BotonConfirmar
          etiqueta="Eliminar categoría"
          confirmacion="¿Eliminar esta categoría? Sus movimientos se conservan, pero quedan sin categoría."
          etiquetaConfirmar="Sí, eliminar"
          variante="destructive"
          accion={eliminarCategoria.bind(null, id)}
        />
      </section>
    </>
  );
}
