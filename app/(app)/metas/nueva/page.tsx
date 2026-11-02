import type { Metadata } from "next";
import { crearMeta } from "@/actions/metas";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { FormMeta } from "@/components/metas/form-meta";
import { requireUser } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Nueva meta" };

export default async function NuevaMetaPage() {
  await requireUser();
  return (
    <>
      <EnlaceVolver href="/metas" etiqueta="Metas" />
      <Encabezado titulo="Nueva meta" />
      <FormMeta accion={crearMeta} etiquetaGuardar="Crear meta" inicial={{ nombre: "", moneda: "USD", objetivo: "", fecha_objetivo: "" }} />
    </>
  );
}
