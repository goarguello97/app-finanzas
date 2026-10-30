import { esMesValido, mesDe } from "@/lib/fechas";

export const SIN_CATEGORIA = "ninguna";

export interface FiltrosListado {
  mes: string;
  cuenta: string | null;
  categoria: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lee los filtros de la URL. Lo inválido se ignora, para que un link viejo no rompa la pantalla. */
export function parsearFiltros(
  parametros: { mes?: string | string[]; cuenta?: string | string[]; categoria?: string | string[] },
  hoy: string,
): FiltrosListado {
  const unico = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : undefined);
  const mes = unico(parametros.mes);
  const cuenta = unico(parametros.cuenta);
  const categoria = unico(parametros.categoria);

  return {
    mes: mes && esMesValido(mes) ? mes : mesDe(hoy),
    cuenta: cuenta && UUID.test(cuenta) ? cuenta : null,
    categoria: categoria && (categoria === SIN_CATEGORIA || UUID.test(categoria)) ? categoria : null,
  };
}

/** Arma la query de la URL, sin los filtros vacíos. */
export function urlListado(filtros: FiltrosListado): string {
  const parametros = new URLSearchParams({ mes: filtros.mes });
  if (filtros.cuenta) parametros.set("cuenta", filtros.cuenta);
  if (filtros.categoria) parametros.set("categoria", filtros.categoria);
  return `/movimientos?${parametros.toString()}`;
}

/** Agrupa por fecha, conservando el orden en que llegan. */
export function agruparPorDia<T extends { fecha: string }>(movimientos: readonly T[]): { fecha: string; movimientos: T[] }[] {
  const dias: { fecha: string; movimientos: T[] }[] = [];
  for (const movimiento of movimientos) {
    const ultimo = dias.at(-1);
    if (ultimo?.fecha === movimiento.fecha) ultimo.movimientos.push(movimiento);
    else dias.push({ fecha: movimiento.fecha, movimientos: [movimiento] });
  }
  return dias;
}
