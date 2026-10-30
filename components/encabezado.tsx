export function Encabezado({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
      {descripcion && <p className="max-w-[65ch] text-muted-foreground">{descripcion}</p>}
    </header>
  );
}
