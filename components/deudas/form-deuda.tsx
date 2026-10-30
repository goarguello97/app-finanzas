"use client";

import { startTransition, useActionState, useState } from "react";
import type { EstadoDeuda } from "@/actions/deudas";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { OpcionesRadio } from "@/components/opciones-radio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ValoresDeuda {
  tipo: string;
  acreedor: string;
  descripcion: string;
  moneda: string;
  monto_total: string;
  tasa_anual: string;
  pago_minimo: string;
  cuotas_total: string;
  monto_cuota: string;
  dia_vencimiento: string;
  fecha_inicio: string;
}

const OPCIONES_TIPO = [
  { valor: "tarjeta", etiqueta: "Tarjeta" },
  { valor: "prestamo", etiqueta: "Préstamo" },
];
const OPCIONES_MONEDA = [
  { valor: "ARS", etiqueta: "Pesos (ARS)" },
  { valor: "USD", etiqueta: "Dólares (USD)" },
];

function Campo({
  nombre,
  etiqueta,
  ayuda,
  error,
  ...props
}: {
  nombre: keyof ValoresDeuda;
  etiqueta: string;
  ayuda?: string;
  error?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Input
        id={nombre}
        name={nombre}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={`${nombre}-ayuda ${nombre}-error`}
        {...props}
      />
      {ayuda && (
        <p id={`${nombre}-ayuda`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      <ErrorDeCampo id={`${nombre}-error`} mensaje={error} />
    </div>
  );
}

export function FormDeuda({
  inicial,
  accion,
  monedaBloqueada = false,
  etiquetaGuardar,
}: {
  inicial: ValoresDeuda;
  accion: (anterior: EstadoDeuda, formData: FormData) => Promise<EstadoDeuda>;
  monedaBloqueada?: boolean;
  etiquetaGuardar: string;
}) {
  const [estado, despachar, pendiente] = useActionState(accion, {});
  const errores = estado.errores ?? {};
  const [tipo, setTipo] = useState(inicial.tipo);
  const [moneda, setMoneda] = useState(inicial.moneda);
  const esPrestamo = tipo === "prestamo";

  // Sin `action={...}`: React resetearía el formulario al terminar y se perderían los radios.
  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  };

  return (
    <form onSubmit={enviar} className="flex max-w-md flex-col gap-5" noValidate>
      <OpcionesRadio leyenda="Tipo" nombre="tipo" opciones={OPCIONES_TIPO} valor={tipo} onChange={setTipo} error={<ErrorDeCampo mensaje={errores.tipo} />} />

      <Campo
        nombre="acreedor"
        etiqueta="A quién le debés"
        defaultValue={inicial.acreedor}
        error={errores.acreedor}
        ayuda={esPrestamo ? "Por ejemplo, Préstamo Mercado Pago." : "Por ejemplo, Visa Galicia."}
      />

      {monedaBloqueada ? (
        <div className="flex flex-col gap-1">
          <input type="hidden" name="moneda" value={moneda} />
          <p className="text-sm font-medium">Moneda</p>
          <p>{moneda}</p>
          <p className="text-sm text-muted-foreground">No se puede cambiar porque la deuda ya tiene pagos.</p>
        </div>
      ) : (
        <OpcionesRadio
          leyenda="Moneda"
          nombre="moneda"
          opciones={OPCIONES_MONEDA}
          valor={moneda}
          onChange={setMoneda}
          error={<ErrorDeCampo mensaje={errores.moneda} />}
        />
      )}

      <Campo
        nombre="monto_total"
        etiqueta="Saldo al cargarla"
        inputMode="decimal"
        defaultValue={inicial.monto_total}
        error={errores.monto_total}
        ayuda="Lo que debés hoy, sin los intereses futuros."
      />

      <Campo
        nombre="tasa_anual"
        etiqueta="TNA (%)"
        inputMode="decimal"
        defaultValue={inicial.tasa_anual}
        error={errores.tasa_anual}
        ayuda="Tasa nominal anual. Sin interés, poné 0. Está en el resumen o en el contrato."
      />

      {esPrestamo && (
        <div className="grid grid-cols-2 gap-3">
          <Campo nombre="monto_cuota" etiqueta="Cuota por mes" inputMode="decimal" defaultValue={inicial.monto_cuota} error={errores.monto_cuota} />
          <Campo nombre="cuotas_total" etiqueta="Cuotas restantes" inputMode="numeric" defaultValue={inicial.cuotas_total} error={errores.cuotas_total} />
        </div>
      )}

      <Campo
        nombre="pago_minimo"
        etiqueta={esPrestamo ? "Pago mínimo por mes (opcional)" : "Pago mínimo por mes"}
        inputMode="decimal"
        defaultValue={inicial.pago_minimo}
        error={errores.pago_minimo}
        ayuda={esPrestamo ? "Si lo dejás vacío, se usa la cuota." : undefined}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo nombre="dia_vencimiento" etiqueta="Día de vencimiento" inputMode="numeric" defaultValue={inicial.dia_vencimiento} error={errores.dia_vencimiento} />
        <Campo nombre="fecha_inicio" etiqueta="Fecha de carga" type="date" defaultValue={inicial.fecha_inicio} error={errores.fecha_inicio} />
      </div>

      <Campo nombre="descripcion" etiqueta="Nota (opcional)" defaultValue={inicial.descripcion} error={errores.descripcion} />

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
