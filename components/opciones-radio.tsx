import { cn } from "@/lib/utils";

interface Opcion {
  valor: string;
  etiqueta: string;
}

const COLUMNAS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" };

export const CLASE_OPCION = cn(
  "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-input bg-card px-2 text-sm transition-colors",
  "has-checked:border-primary has-checked:bg-accent has-checked:font-medium has-checked:text-accent-foreground",
  "has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
);

/** Radios como botones. Sin estado propio: `onChange` es opcional, para formularios que necesitan reaccionar. */
export function OpcionesRadio({
  leyenda,
  nombre,
  opciones,
  valor,
  onChange,
  error,
}: {
  leyenda: string;
  nombre: string;
  opciones: readonly Opcion[];
  valor: string;
  onChange?: (valor: string) => void;
  error?: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{leyenda}</legend>
      <div className={cn("grid gap-2", COLUMNAS[opciones.length] ?? "grid-cols-2")}>
        {opciones.map((opcion) => (
          <label key={opcion.valor} className={CLASE_OPCION}>
            <input
              type="radio"
              name={nombre}
              value={opcion.valor}
              defaultChecked={onChange ? undefined : valor === opcion.valor}
              checked={onChange ? valor === opcion.valor : undefined}
              onChange={onChange ? () => onChange(opcion.valor) : undefined}
              className="sr-only"
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
      {error}
    </fieldset>
  );
}
