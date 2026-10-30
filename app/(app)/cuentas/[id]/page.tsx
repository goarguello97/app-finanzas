import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { actualizarCuenta, cambiarArchivoCuenta, eliminarCuenta } from "@/actions/cuentas";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { FormCuenta } from "@/components/cuentas/form-cuenta";
import { Encabezado } from "@/components/encabezado";
import { EnlaceVolver } from "@/components/enlace-volver";
import { requireUser } from "@/lib/auth/sesion";
import { formatearNumero } from "@/lib/dinero";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar cuenta" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditarCuentaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await crearClienteServer();
  const [cuenta, movimientos] = await Promise.all([
    supabase.from("cuentas").select("*").eq("id", id).maybeSingle(),
    supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("cuenta_id", id),
  ]);
  if (cuenta.error) throw new Error(`Leer cuenta: ${cuenta.error.message}`);
  if (movimientos.error) throw new Error(`Contar movimientos: ${movimientos.error.message}`);
  if (!cuenta.data) notFound();

  const c = cuenta.data;
  const tieneMovimientos = (movimientos.count ?? 0) > 0;

  return (
    <>
      <EnlaceVolver href="/cuentas" etiqueta="Cuentas" />
      <Encabezado titulo={c.nombre} />
      <FormCuenta
        accion={actualizarCuenta.bind(null, id)}
        etiquetaGuardar="Guardar cambios"
        tipoYMonedaBloqueados={tieneMovimientos}
        inicial={{
          nombre: c.nombre,
          tipo: c.tipo,
          moneda: c.moneda,
          saldo_inicial: formatearNumero(String(c.saldo_inicial)),
          dia_cierre: c.dia_cierre?.toString() ?? "",
          dia_vencimiento: c.dia_vencimiento?.toString() ?? "",
          limite: c.limite != null ? formatearNumero(String(c.limite)) : "",
        }}
      />

      <section aria-labelledby="titulo-zona" className="flex max-w-md flex-col items-start gap-4 border-t pt-6">
        <h2 id="titulo-zona" className="text-lg font-medium">
          {tieneMovimientos ? "Archivar" : "Eliminar"}
        </h2>
        {tieneMovimientos ? (
          <>
            <p className="text-sm text-muted-foreground">
              {c.archivada
                ? "Esta cuenta está archivada: no aparece al cargar movimientos."
                : "Tiene movimientos, así que no se puede eliminar. Si la archivás, deja de aparecer al cargar y conservás el historial."}
            </p>
            <BotonConfirmar
              etiqueta={c.archivada ? "Reactivar cuenta" : "Archivar cuenta"}
              confirmacion={c.archivada ? "¿Reactivar esta cuenta?" : "¿Archivar esta cuenta?"}
              etiquetaConfirmar={c.archivada ? "Sí, reactivar" : "Sí, archivar"}
              accion={cambiarArchivoCuenta.bind(null, id, !c.archivada)}
            />
          </>
        ) : (
          <BotonConfirmar
            etiqueta="Eliminar cuenta"
            confirmacion="¿Eliminar esta cuenta? No se puede deshacer."
            etiquetaConfirmar="Sí, eliminar"
            variante="destructive"
            accion={eliminarCuenta.bind(null, id)}
          />
        )}
      </section>
    </>
  );
}
