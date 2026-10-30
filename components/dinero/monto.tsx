import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import { formatearMonto, type Moneda } from "@/lib/dinero";
import { cn } from "@/lib/utils";

/** Monto de un movimiento: el sentido se lee por signo e ícono, además del color. */
export function MontoMovimiento({
  monto,
  moneda,
  tipo,
  className,
}: {
  monto: number | string;
  moneda: Moneda;
  tipo: "ingreso" | "gasto";
  className?: string;
}) {
  const esIngreso = tipo === "ingreso";
  const Icono = esIngreso ? ArrowDownLeftIcon : ArrowUpRightIcon;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium whitespace-nowrap", esIngreso ? "text-ingreso" : "text-gasto", className)}>
      <Icono aria-hidden className="size-3.5 shrink-0" weight="bold" />
      <span>
        {esIngreso ? "+" : "-"}
        {formatearMonto(String(monto), moneda)}
      </span>
    </span>
  );
}
