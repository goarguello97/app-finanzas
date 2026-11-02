import type { Metadata } from "next";
import { crearCuenta } from "@/actions/cuentas";
import { FormCuenta } from "@/components/cuentas/form-cuenta";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { requireUser } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Nueva cuenta" };

export default async function NuevaCuentaPage() {
  await requireUser();
  return (
    <>
      <EnlaceVolver href="/cuentas" etiqueta="Cuentas" />
      <Encabezado titulo="Nueva cuenta" />
      <FormCuenta
        accion={crearCuenta}
        etiquetaGuardar="Crear cuenta"
        inicial={{ nombre: "", tipo: "banco", moneda: "ARS", saldo_inicial: "", dia_cierre: "", dia_vencimiento: "", limite: "" }}
      />
    </>
  );
}
