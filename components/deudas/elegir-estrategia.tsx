"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { elegirEstrategia } from "@/actions/deudas";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { Button } from "@/components/ui/button";
import type { Estrategia } from "@/lib/deudas/simulador";

export function ElegirEstrategia({ estrategia, elegida }: { estrategia: Estrategia; elegida: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<string>();

  if (elegida) {
    return (
      <p className="flex h-11 items-center gap-1.5 text-sm font-medium">
        <CheckCircleIcon aria-hidden className="size-5 text-primary" weight="fill" />
        Tu elección
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pendiente}
        className="w-full"
        onClick={() =>
          iniciar(async () => {
            const resultado = await elegirEstrategia(estrategia).catch(() => ({ mensaje: "No pudimos guardar tu elección. Probá de nuevo." }));
            setMensaje(resultado.mensaje);
          })
        }
      >
        {pendiente ? "Guardando..." : "Elegir"}
      </Button>
      <ErrorDeCampo mensaje={mensaje} />
    </div>
  );
}
