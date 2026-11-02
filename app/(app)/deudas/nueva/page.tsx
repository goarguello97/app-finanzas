import type { Metadata } from "next";
import { crearDeuda } from "@/actions/deudas";
import { FormDeuda } from "@/components/deudas/form-deuda";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { requireUser } from "@/lib/auth/sesion";
import { hoyBuenosAires } from "@/lib/fechas";

export const metadata: Metadata = { title: "Nueva deuda" };

export default async function NuevaDeudaPage() {
  await requireUser();
  return (
    <>
      <EnlaceVolver href="/deudas" etiqueta="Deudas" />
      <Encabezado titulo="Nueva deuda" />
      <FormDeuda
        accion={crearDeuda}
        etiquetaGuardar="Cargar deuda"
        inicial={{
          tipo: "tarjeta",
          acreedor: "",
          descripcion: "",
          moneda: "ARS",
          monto_total: "",
          tasa_anual: "",
          pago_minimo: "",
          cuotas_total: "",
          monto_cuota: "",
          dia_vencimiento: "",
          fecha_inicio: hoyBuenosAires(),
        }}
      />
    </>
  );
}
