"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorDeSeccion({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">No pudimos cargar esta pantalla</h1>
      <p className="text-muted-foreground">Revisá tu conexión y probá de nuevo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
