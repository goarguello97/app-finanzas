"use client";

import { useEffect } from "react";
import "./globals.css";

/** Último recurso: reemplaza el layout raíz si falla, así que trae su propio html y estilos. */
export default function ErrorGlobal({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es-AR">
      <body>
        <main role="alert" className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-4">
          <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
          <p className="text-muted-foreground">Recargá la página. Si sigue pasando, probá de nuevo en unos minutos.</p>
          <button
            type="button"
            onClick={reset}
            className="h-11 self-start rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
