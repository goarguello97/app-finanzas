import Link from "next/link";
import { formatearMonto, type Moneda } from "@/lib/dinero";
import { SIN_CATEGORIA, urlListado } from "@/lib/movimientos/listado";
import type { FilaCategoria } from "@/lib/resumen/calculos";

/** Barras ordenadas. Cada fila ya trae nombre, monto y porcentaje en texto, así que no dependen de la barra. */
export function GastosPorCategoria({ filas, moneda, mes }: { filas: FilaCategoria[]; moneda: Moneda; mes: string }) {
  return (
    <ul className="flex flex-col">
      {filas.map((fila) => (
        <li key={fila.id ?? SIN_CATEGORIA}>
          <Link
            href={urlListado({ mes, cuenta: null, categoria: fila.id ?? SIN_CATEGORIA })}
            className="-mx-2 flex min-h-14 flex-col justify-center gap-1.5 rounded-control px-2 py-2 transition-colors hover:bg-accent active:bg-accent"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{fila.nombre}</span>
              <span className="whitespace-nowrap">
                <span className="font-medium">{formatearMonto(fila.total, moneda)}</span>
                <span className="ml-2 inline-block w-11 text-right text-sm text-muted-foreground">
                  {fila.porcentaje.toDecimalPlaces(0).toString()}%
                </span>
              </span>
            </span>
            <span aria-hidden className="block h-1.5 rounded-r-[4px] bg-gasto" style={{ width: `${Math.max(fila.proporcion * 100, 1)}%` }} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
