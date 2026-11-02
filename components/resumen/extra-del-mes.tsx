import Link from "next/link";
import { CheckCircleIcon, HourglassMediumIcon } from "@phosphor-icons/react/ssr";
import { formatearMonto } from "@/lib/dinero";
import type { EstadoExtra } from "@/lib/resumen/calculos";

export function ExtraDelMes({ estado }: { estado: EstadoExtra }) {
  if (!estado.conMinimo) {
    return (
      <p className="text-sm text-muted-foreground">
        Definí tu ingreso mínimo en{" "}
        <Link href="/ajustes" className="text-foreground underline underline-offset-4">
          Ajustes
        </Link>{" "}
        para ver cuánto te queda de extra para deudas o ahorro.
      </p>
    );
  }

  const hayExtra = estado.extra.greaterThan(0);
  const cubierto = estado.faltante.isZero();
  const Icono = cubierto ? CheckCircleIcon : HourglassMediumIcon;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Icono aria-hidden className="size-5 shrink-0 text-muted-foreground" weight="bold" />
        {cubierto ? formatearMonto(estado.extra) : formatearMonto(estado.faltante)}
      </p>
      <p className="text-sm text-muted-foreground">
        {hayExtra ? "de extra para deudas o ahorro" : cubierto ? "Llegaste justo al mínimo" : "te faltan para llegar al mínimo"}
      </p>
      <div
        role="meter"
        aria-label="Ingresos en pesos respecto del mínimo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(estado.proporcion * 100)}
        className="mt-1 h-1.5 overflow-hidden rounded-[4px] bg-muted"
      >
        <div className="h-full rounded-r-[4px] bg-ahorro" style={{ width: `${estado.proporcion * 100}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">
        Ingresaron {formatearMonto(estado.ingresos)} de {formatearMonto(estado.minimo)}
      </p>
    </div>
  );
}
