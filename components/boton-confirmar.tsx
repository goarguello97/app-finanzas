"use client";

import { useState, useTransition } from "react";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { Button } from "@/components/ui/button";

/** Acción en dos pasos, para las que no se pueden deshacer. */
export function BotonConfirmar({
  etiqueta,
  confirmacion,
  etiquetaConfirmar,
  accion,
  variante = "outline",
}: {
  etiqueta: string;
  confirmacion: string;
  etiquetaConfirmar: string;
  accion: () => Promise<{ mensaje?: string } | void>;
  variante?: "outline" | "destructive";
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  if (!confirmando) {
    return (
      <Button type="button" variant="outline" onClick={() => setConfirmando(true)}>
        {etiqueta}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={etiqueta}>
      <p className="text-sm">{confirmacion}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={variante}
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const resultado = await accion();
              if (resultado?.mensaje) setMensaje(resultado.mensaje);
            })
          }
        >
          {pendiente ? "Un momento..." : etiquetaConfirmar}
        </Button>
        <Button type="button" variant="ghost" disabled={pendiente} onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
      <ErrorDeCampo mensaje={mensaje} />
    </div>
  );
}
