"use client";

import { useSyncExternalStore } from "react";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPCIONES = [
  { valor: "system", etiqueta: "Sistema", icono: DesktopIcon },
  { valor: "light", etiqueta: "Claro", icono: SunIcon },
  { valor: "dark", etiqueta: "Oscuro", icono: MoonIcon },
];

const suscribirNada = () => () => {};

export function SelectorTema() {
  const { theme, setTheme } = useTheme();
  // El tema guardado solo se conoce en el navegador: en el server no se marca ninguna opción.
  const montado = useSyncExternalStore(suscribirNada, () => true, () => false);

  return (
    <fieldset>
      <legend className="sr-only">Tema</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map(({ valor, etiqueta, icono: Icono }) => (
          <label
            key={valor}
            className={cn(
              "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-input bg-card text-sm transition-colors",
              "has-checked:border-primary has-checked:bg-accent has-checked:font-medium has-checked:text-accent-foreground",
              "has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
            )}
          >
            <input
              type="radio"
              name="tema"
              value={valor}
              checked={montado && theme === valor}
              onChange={() => setTheme(valor)}
              className="sr-only"
            />
            <Icono aria-hidden className="size-4" />
            {etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
