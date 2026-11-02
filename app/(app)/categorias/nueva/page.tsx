import type { Metadata } from "next";
import { crearCategoria } from "@/actions/categorias";
import { FormCategoria } from "@/components/categorias/form-categoria";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { requireUser } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Nueva categoría" };

export default async function NuevaCategoriaPage() {
  await requireUser();
  return (
    <>
      <EnlaceVolver href="/categorias" etiqueta="Categorías" />
      <Encabezado titulo="Nueva categoría" />
      <FormCategoria accion={crearCategoria} etiquetaGuardar="Crear categoría" inicial={{ nombre: "", tipo: "gasto", excluye_totales: false }} />
    </>
  );
}
