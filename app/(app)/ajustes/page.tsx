import type { Metadata } from "next";
import { cerrarSesion } from "@/actions/auth";
import { Encabezado } from "@/components/encabezado";
import { FormConfiguracion } from "@/components/ajustes/form-configuracion";
import { SelectorTema } from "@/components/ajustes/selector-tema";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { formatearNumero } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const usuario = await requireUser();
  const supabase = await crearClienteServer();
  const { data, error } = await supabase
    .from("configuracion")
    .select("ingreso_minimo, moneda_base, exchange_cotizacion")
    .maybeSingle();

  if (error) throw new Error(`Leer configuración: ${error.message}`);

  return (
    <>
      <Encabezado titulo="Ajustes" />

      <section aria-labelledby="titulo-presupuesto" className="flex max-w-md flex-col gap-4">
        <h2 id="titulo-presupuesto" className="text-lg font-medium">
          Presupuesto y cotización
        </h2>
        <FormConfiguracion
          inicial={{
            ingreso_minimo: data?.ingreso_minimo != null ? formatearNumero(String(data.ingreso_minimo)) : "",
            moneda_base: data?.moneda_base ?? "ARS",
            exchange_cotizacion: data?.exchange_cotizacion ?? "dolarapp",
          }}
        />
      </section>

      <section aria-labelledby="titulo-apariencia" className="flex max-w-md flex-col gap-4 border-t pt-6">
        <h2 id="titulo-apariencia" className="text-lg font-medium">
          Apariencia
        </h2>
        <SelectorTema />
      </section>

      <section aria-labelledby="titulo-sesion" className="flex max-w-md flex-col items-start gap-4 border-t pt-6">
        <h2 id="titulo-sesion" className="text-lg font-medium">
          Sesión
        </h2>
        <p className="text-muted-foreground">Entraste como {usuario.email}.</p>
        <form action={cerrarSesion}>
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </section>
    </>
  );
}
