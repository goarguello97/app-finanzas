"use client";

import { useState, useTransition } from "react";
import { registrarAporte } from "@/actions/metas";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { OpcionesRadio } from "@/components/opciones-radio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hoyBuenosAires } from "@/lib/fechas";

const OPCIONES = [
  { valor: "aporte", etiqueta: "Aportar" },
  { valor: "retiro", etiqueta: "Retirar" },
];

export function FormAporte({ metaId, fechaInicial, simbolo }: { metaId: string; fechaInicial: string; simbolo: string }) {
  const [sentido, setSentido] = useState<"aporte" | "retiro">("aporte");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string>();
  const [exito, setExito] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    iniciar(async () => {
      setMensaje(undefined);
      setExito(false);
      try {
        const resultado = await registrarAporte(metaId, { sentido, monto, fecha });
        if (resultado.ok) {
          setErrores({});
          setMonto("");
          setFecha(hoyBuenosAires());
          setExito(true);
          return;
        }
        setErrores(resultado.errores ?? {});
        setMensaje(resultado.mensaje);
      } catch {
        setMensaje("No pudimos guardarlo. Revisá tu conexión y probá de nuevo.");
      }
    });
  };

  return (
    <form onSubmit={enviar} className="flex max-w-md flex-col gap-4" noValidate>
      <OpcionesRadio
        leyenda="Qué querés hacer"
        nombre="sentido"
        opciones={OPCIONES}
        valor={sentido}
        onChange={(valor) => setSentido(valor as "aporte" | "retiro")}
        error={<ErrorDeCampo mensaje={errores.sentido} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="aporte-monto">Monto en {simbolo}</Label>
          <Input
            id="aporte-monto"
            inputMode="decimal"
            autoComplete="off"
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setExito(false);
            }}
            aria-invalid={Boolean(errores.monto)}
            aria-describedby="aporte-monto-error"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="aporte-fecha">Fecha</Label>
          <Input
            id="aporte-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-invalid={Boolean(errores.fecha)}
            aria-describedby="aporte-fecha-error"
          />
        </div>
      </div>
      <ErrorDeCampo id="aporte-monto-error" mensaje={errores.monto} />
      <ErrorDeCampo id="aporte-fecha-error" mensaje={errores.fecha} />

      <div className="flex flex-col items-start gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : sentido === "aporte" ? "Registrar aporte" : "Registrar retiro"}
        </Button>
        <div aria-live="polite">
          {exito && <p className="text-sm">Listo, quedó registrado.</p>}
          <ErrorDeCampo mensaje={mensaje} />
        </div>
      </div>
    </form>
  );
}
