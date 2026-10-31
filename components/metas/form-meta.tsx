"use client";

import { startTransition, useActionState, useState } from "react";
import type { EstadoMeta } from "@/actions/metas";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { OpcionesRadio } from "@/components/opciones-radio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OPCIONES_MONEDA = [
  { valor: "USD", etiqueta: "Dólares (USD)" },
  { valor: "ARS", etiqueta: "Pesos (ARS)" },
];

export function FormMeta({
  inicial,
  accion,
  monedaBloqueada = false,
  etiquetaGuardar,
}: {
  inicial: { nombre: string; moneda: string; objetivo: string; fecha_objetivo: string };
  accion: (anterior: EstadoMeta, formData: FormData) => Promise<EstadoMeta>;
  monedaBloqueada?: boolean;
  etiquetaGuardar: string;
}) {
  const [estado, despachar, pendiente] = useActionState(accion, {});
  const errores = estado.errores ?? {};
  const [moneda, setMoneda] = useState(inicial.moneda);

  // Sin `action={...}`: React resetearía el formulario al terminar y se perderían los radios.
  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  };

  return (
    <form onSubmit={enviar} className="flex max-w-md flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={inicial.nombre} aria-invalid={Boolean(errores.nombre)} aria-describedby="nombre-error" />
        <ErrorDeCampo id="nombre-error" mensaje={errores.nombre} />
      </div>

      {monedaBloqueada ? (
        <div className="flex flex-col gap-1">
          <input type="hidden" name="moneda" value={moneda} />
          <p className="text-sm font-medium">Moneda</p>
          <p>{moneda}</p>
          <p className="text-sm text-muted-foreground">No se puede cambiar porque la meta ya tiene aportes.</p>
        </div>
      ) : (
        <OpcionesRadio leyenda="Moneda" nombre="moneda" opciones={OPCIONES_MONEDA} valor={moneda} onChange={setMoneda} error={<ErrorDeCampo mensaje={errores.moneda} />} />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="objetivo">Objetivo</Label>
        <Input id="objetivo" name="objetivo" inputMode="decimal" autoComplete="off" defaultValue={inicial.objetivo} aria-invalid={Boolean(errores.objetivo)} aria-describedby="objetivo-error" />
        <ErrorDeCampo id="objetivo-error" mensaje={errores.objetivo} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha_objetivo">Fecha objetivo (opcional)</Label>
        <Input
          id="fecha_objetivo"
          name="fecha_objetivo"
          type="date"
          defaultValue={inicial.fecha_objetivo}
          aria-invalid={Boolean(errores.fecha_objetivo)}
          aria-describedby="fecha_objetivo-error"
        />
        <ErrorDeCampo id="fecha_objetivo-error" mensaje={errores.fecha_objetivo} />
      </div>

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
