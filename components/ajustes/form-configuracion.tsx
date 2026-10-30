"use client";

import { useActionState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { guardarConfiguracion, type EstadoConfiguracion } from "@/actions/configuracion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Valores {
  ingreso_minimo: string;
  moneda_base: string;
  exchange_cotizacion: string;
}

const ESTADO_INICIAL: EstadoConfiguracion = { estado: "inicial" };
const MONEDAS = ["ARS", "USD"];

function ErrorDeCampo({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-destructive">
      <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" weight="bold" />
      {mensaje}
    </p>
  );
}

export function FormConfiguracion({ inicial }: { inicial: Valores }) {
  const [estado, accion, pendiente] = useActionState(guardarConfiguracion, ESTADO_INICIAL);
  const valores = estado.valores ?? inicial;
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ingreso_minimo">Ingreso mínimo seguro en pesos (opcional)</Label>
        <Input
          id="ingreso_minimo"
          name="ingreso_minimo"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={valores.ingreso_minimo}
          aria-invalid={Boolean(errores.ingreso_minimo)}
          aria-describedby="ingreso_minimo-ayuda ingreso_minimo-error"
        />
        <p id="ingreso_minimo-ayuda" className="text-sm text-muted-foreground">
          Lo que entre por encima de este monto cuenta como extra para deudas o ahorro.
        </p>
        <ErrorDeCampo id="ingreso_minimo-error" mensaje={errores.ingreso_minimo} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Moneda base</legend>
        <div className="grid grid-cols-2 gap-2">
          {MONEDAS.map((moneda) => (
            <label
              key={moneda}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-control border border-input bg-card text-sm transition-colors",
                "has-checked:border-primary has-checked:bg-accent has-checked:font-medium has-checked:text-accent-foreground",
                "has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
              )}
            >
              <input
                type="radio"
                name="moneda_base"
                value={moneda}
                defaultChecked={valores.moneda_base === moneda}
                className="sr-only"
              />
              {moneda}
            </label>
          ))}
        </div>
        <ErrorDeCampo id="moneda_base-error" mensaje={errores.moneda_base} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="exchange_cotizacion">Exchange de la cotización USDC</Label>
        <Input
          id="exchange_cotizacion"
          name="exchange_cotizacion"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={valores.exchange_cotizacion}
          aria-invalid={Boolean(errores.exchange_cotizacion)}
          aria-describedby="exchange_cotizacion-ayuda exchange_cotizacion-error"
        />
        <p id="exchange_cotizacion-ayuda" className="text-sm text-muted-foreground">
          El nombre que usa CriptoYa, por ejemplo dolarapp.
        </p>
        <ErrorDeCampo id="exchange_cotizacion-error" mensaje={errores.exchange_cotizacion} />
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Guardar cambios"}
        </Button>
        <div aria-live="polite">
          {estado.estado === "ok" && (
            <p className="flex items-center gap-1.5 text-sm text-ingreso">
              <CheckCircleIcon aria-hidden className="size-4" weight="bold" />
              {estado.mensaje}
            </p>
          )}
          {estado.estado === "error" && estado.mensaje && <ErrorDeCampo id="form-error" mensaje={estado.mensaje} />}
        </div>
      </div>
    </form>
  );
}
