"use client";

import { useActionState } from "react";
import type { EstadoCategoria } from "@/actions/categorias";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { OpcionesRadio } from "@/components/opciones-radio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OPCIONES_TIPO = [
  { valor: "gasto", etiqueta: "Gasto" },
  { valor: "ingreso", etiqueta: "Ingreso" },
];

export function FormCategoria({
  inicial,
  accion,
  tipoBloqueado = false,
  etiquetaGuardar,
}: {
  inicial: { nombre: string; tipo: string; excluye_totales: boolean };
  accion: (anterior: EstadoCategoria, formData: FormData) => Promise<EstadoCategoria>;
  tipoBloqueado?: boolean;
  etiquetaGuardar: string;
}) {
  const [estado, despachar, pendiente] = useActionState(accion, {});
  const valores = estado.valores ?? inicial;
  const errores = estado.errores ?? {};

  return (
    <form action={despachar} className="flex max-w-md flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          autoComplete="off"
          defaultValue={valores.nombre}
          aria-invalid={Boolean(errores.nombre)}
          aria-describedby="nombre-error"
        />
        <ErrorDeCampo id="nombre-error" mensaje={errores.nombre} />
      </div>

      {tipoBloqueado ? (
        <input type="hidden" name="tipo" value={valores.tipo} />
      ) : (
        <OpcionesRadio
          leyenda="Tipo"
          nombre="tipo"
          opciones={OPCIONES_TIPO}
          valor={valores.tipo}
          error={<ErrorDeCampo mensaje={errores.tipo} />}
        />
      )}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="excluye_totales"
          defaultChecked={valores.excluye_totales}
          className="mt-0.5 size-5 shrink-0 accent-primary"
          aria-describedby="excluye_totales-ayuda"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">No contar en los totales</span>
          <span id="excluye_totales-ayuda" className="text-sm text-muted-foreground">
            Mueve el saldo de la cuenta, pero no suma en los gastos e ingresos del mes. Sirve para comprar o vender dólares.
          </span>
        </span>
      </label>

      <div className="flex flex-col items-start gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : etiquetaGuardar}
        </Button>
        <div aria-live="polite">
          <ErrorDeCampo mensaje={estado.mensaje} />
        </div>
      </div>
    </form>
  );
}
