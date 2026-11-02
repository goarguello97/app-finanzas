"use client";

import { useState, useTransition } from "react";
import { registrarPago } from "@/actions/deudas";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { hoyBuenosAires } from "@/lib/fechas";

export function FormPago({
  deudaId,
  cuentas,
  categorias,
  categoriaInicial,
  montoSugerido,
  fechaInicial,
}: {
  deudaId: string;
  cuentas: { id: string; nombre: string }[];
  categorias: { id: string; nombre: string }[];
  categoriaInicial: string;
  montoSugerido: string;
  fechaInicial: string;
}) {
  const inicial = { monto: montoSugerido, interes: "", fecha: fechaInicial, cuenta_id: cuentas[0]?.id ?? "", categoria_id: categoriaInicial };
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string>();
  const [exito, setExito] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (campo: keyof typeof valores, valor: string) => {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setExito(false);
  };

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    iniciar(async () => {
      setMensaje(undefined);
      setExito(false);
      try {
        const resultado = await registrarPago(deudaId, valores);
        if (resultado.ok) {
          setErrores({});
          setValores({ ...inicial, fecha: hoyBuenosAires() });
          setExito(true);
          return;
        }
        setErrores(resultado.errores ?? {});
        setMensaje(resultado.mensaje);
      } catch {
        setMensaje("No pudimos registrar el pago. Revisá tu conexión y probá de nuevo.");
      }
    });
  };

  return (
    <form onSubmit={enviar} className="flex max-w-md flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="pago-monto">Monto pagado</Label>
          <Input
            id="pago-monto"
            inputMode="decimal"
            autoComplete="off"
            value={valores.monto}
            onChange={(e) => cambiar("monto", e.target.value)}
            aria-invalid={Boolean(errores.monto)}
            aria-describedby="pago-monto-error"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="pago-fecha">Fecha</Label>
          <Input
            id="pago-fecha"
            type="date"
            value={valores.fecha}
            onChange={(e) => cambiar("fecha", e.target.value)}
            aria-invalid={Boolean(errores.fecha)}
            aria-describedby="pago-fecha-error"
          />
        </div>
      </div>
      <ErrorDeCampo id="pago-monto-error" mensaje={errores.monto} />
      <ErrorDeCampo id="pago-fecha-error" mensaje={errores.fecha} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="pago-interes">De eso, intereses (opcional)</Label>
        <Input
          id="pago-interes"
          inputMode="decimal"
          autoComplete="off"
          value={valores.interes}
          onChange={(e) => cambiar("interes", e.target.value)}
          aria-invalid={Boolean(errores.interes)}
          aria-describedby="pago-interes-ayuda pago-interes-error"
        />
        <p id="pago-interes-ayuda" className="text-sm text-muted-foreground">
          Sale del resumen o del detalle de la cuota. Solo lo demás baja el saldo; si lo dejás vacío, baja todo el pago.
        </p>
        <ErrorDeCampo id="pago-interes-error" mensaje={errores.interes} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pago-cuenta">Registrar como gasto en</Label>
        <SelectNativo
          id="pago-cuenta"
          value={valores.cuenta_id}
          onChange={(e) => cambiar("cuenta_id", e.target.value)}
          aria-invalid={Boolean(errores.cuenta_id)}
          aria-describedby="pago-cuenta-error"
        >
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
          <option value="">No registrar gasto</option>
        </SelectNativo>
        <ErrorDeCampo id="pago-cuenta-error" mensaje={errores.cuenta_id} />
      </div>

      {valores.cuenta_id && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="pago-categoria">Categoría del gasto</Label>
          <SelectNativo id="pago-categoria" value={valores.categoria_id} onChange={(e) => cambiar("categoria_id", e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </SelectNativo>
        </div>
      )}

      <div className="flex flex-col items-start gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar pago"}
        </Button>
        <div aria-live="polite">
          {exito && <p className="text-sm">Pago registrado.</p>}
          <ErrorDeCampo mensaje={mensaje} />
        </div>
      </div>
    </form>
  );
}
