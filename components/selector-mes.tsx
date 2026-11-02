import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { nombreMes } from "@/lib/fechas";

export function SelectorMes({ mes, anterior, siguiente }: { mes: string; anterior: string; siguiente: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-control border bg-card">
      <Button asChild variant="ghost" size="icon" aria-label="Mes anterior">
        <Link href={anterior} scroll={false}>
          <CaretLeftIcon aria-hidden className="size-5" />
        </Link>
      </Button>
      <p className="font-medium first-letter:uppercase" aria-live="polite">
        {nombreMes(mes)}
      </p>
      <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente">
        <Link href={siguiente} scroll={false}>
          <CaretRightIcon aria-hidden className="size-5" />
        </Link>
      </Button>
    </div>
  );
}
