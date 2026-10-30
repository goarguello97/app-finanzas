export default function Cargando() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-4">
      <div className="h-8 w-40 animate-pulse rounded-control bg-muted" />
      <div className="h-5 w-64 max-w-full animate-pulse rounded-control bg-muted" />
      <div className="mt-2 h-40 animate-pulse rounded-superficie bg-muted" />
    </div>
  );
}
