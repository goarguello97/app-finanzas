export function EstadoVacio({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-superficie border border-dashed p-6">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{titulo}</p>
        {descripcion && <p className="max-w-[65ch] text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </div>
  );
}
