import { WarningCircleIcon } from "@phosphor-icons/react/ssr";

export function ErrorDeCampo({ id, mensaje }: { id?: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-destructive">
      <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" weight="bold" />
      {mensaje}
    </p>
  );
}
