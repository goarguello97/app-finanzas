"use client";

import { startTransition, useActionState, useState } from "react";
import type { EstadoCuenta } from "@/actions/cuentas";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { OpcionesRadio } from "@/components/opciones-radio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ETIQUETAS_TIPO_CUENTA, TIPOS_CUENTA } from "@/lib/validaciones/cuentas";

export interface ValoresCuenta {
  nombre: string;
  tipo: string;
  moneda: string;
  saldo_inicial: string;
  dia_cierre: string;
  dia_vencimiento: string;
  limite: string;
}

const OPCIONES_TIPO = TIPOS_CUENTA.map((valor) => ({ valor, etiqueta: ETIQUETAS_TIPO_CUENTA[valor] ?? valor }));
const OPCIONES_MONEDA = [
  { valor: "ARS", etiqueta: "Pesos (ARS)" },
  { valor: "USD", etiqueta: "Dólares (USD)" },
];

export function FormCuenta({
  inicial,
  accion,
  tipoYMonedaBloqueados = false,
  etiquetaGuardar,
}: {
  inicial: ValoresCuenta;
  accion: (anterior: EstadoCuenta, formData: FormData) => Promise<EstadoCuenta>;
  tipoYMonedaBloqueados?: boolean;
  etiquetaGuardar: string;
}) {
  const [estado, despachar, pendiente] = useActionState(accion, {});
  const valores = estado.valores ?? inicial;
  const errores = estado.errores ?? {};
  const [tipo, setTipo] = useState(valores.tipo);
  const [moneda, setMoneda] = useState(valores.moneda);
  const esTarjeta = tipo === "tarjeta";

  // Con `action={...}` React resetea el formulario al terminar: los radios controlados volverían
  // a su valor inicial sin que cambie el estado, y se enviaría un tipo distinto del que se ve.
  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  };

  return (
    <form onSubmit={enviar} className="flex max-w-md flex-col gap-5" noValidate>
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

      {tipoYMonedaBloqueados ? (
        <div className="flex flex-col gap-1">
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="moneda" value={moneda} />
          <p className="text-sm font-medium">Tipo y moneda</p>
          <p>
            {ETIQUETAS_TIPO_CUENTA[tipo]} en {moneda}
          </p>
          <p className="text-sm text-muted-foreground">No se pueden cambiar porque la cuenta ya tiene movimientos.</p>
        </div>
      ) : (
        <>
          <OpcionesRadio
            leyenda="Tipo"
            nombre="tipo"
            opciones={OPCIONES_TIPO}
            valor={tipo}
            onChange={setTipo}
            error={<ErrorDeCampo mensaje={errores.tipo} />}
          />
          <OpcionesRadio
            leyenda="Moneda"
            nombre="moneda"
            opciones={OPCIONES_MONEDA}
            valor={moneda}
            onChange={setMoneda}
            error={<ErrorDeCampo mensaje={errores.moneda} />}
          />
        </>
      )}

      {esTarjeta ? (
        <>
          <p className="text-sm text-muted-foreground">
            Lo que le debés a una tarjeta hoy se carga como deuda, no como saldo de la cuenta.
          </p>
          <input type="hidden" name="saldo_inicial" value="" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dia_cierre">Día de cierre</Label>
              <Input
                id="dia_cierre"
                name="dia_cierre"
                inputMode="numeric"
                defaultValue={valores.dia_cierre}
                aria-invalid={Boolean(errores.dia_cierre)}
                aria-describedby="dia_cierre-error"
              />
              <ErrorDeCampo id="dia_cierre-error" mensaje={errores.dia_cierre} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dia_vencimiento">Día de vencimiento</Label>
              <Input
                id="dia_vencimiento"
                name="dia_vencimiento"
                inputMode="numeric"
                defaultValue={valores.dia_vencimiento}
                aria-invalid={Boolean(errores.dia_vencimiento)}
                aria-describedby="dia_vencimiento-error"
              />
              <ErrorDeCampo id="dia_vencimiento-error" mensaje={errores.dia_vencimiento} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="limite">Límite (opcional)</Label>
            <Input
              id="limite"
              name="limite"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={valores.limite}
              aria-invalid={Boolean(errores.limite)}
              aria-describedby="limite-error"
            />
            <ErrorDeCampo id="limite-error" mensaje={errores.limite} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="saldo_inicial">Saldo inicial</Label>
          <Input
            id="saldo_inicial"
            name="saldo_inicial"
            inputMode="text"
            autoComplete="off"
            defaultValue={valores.saldo_inicial}
            aria-invalid={Boolean(errores.saldo_inicial)}
            aria-describedby="saldo_inicial-ayuda saldo_inicial-error"
          />
          <p id="saldo_inicial-ayuda" className="text-sm text-muted-foreground">
            Lo que tiene la cuenta hoy. Si está en descubierto, escribilo con un signo menos.
          </p>
          <ErrorDeCampo id="saldo_inicial-error" mensaje={errores.saldo_inicial} />
        </div>
      )}

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
