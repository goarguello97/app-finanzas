export interface CategoriaCarga {
  id: string;
  nombre: string;
  tipo: string;
}

export interface MovimientoReciente {
  cuenta_id: string;
  categoria_id: string | null;
}

/** Las más usadas primero, para que la habitual quede a un toque. Las empatadas mantienen el orden recibido. */
export function ordenarPorUso<T extends { id: string }>(categorias: readonly T[], recientes: readonly MovimientoReciente[]): T[] {
  const usos = new Map<string, number>();
  for (const { categoria_id } of recientes) {
    if (categoria_id) usos.set(categoria_id, (usos.get(categoria_id) ?? 0) + 1);
  }
  return [...categorias].sort((a, b) => (usos.get(b.id) ?? 0) - (usos.get(a.id) ?? 0));
}

/** La cuenta del último movimiento, si sigue activa. Si no, la primera. Espera los recientes del más nuevo al más viejo. */
export function cuentaPorDefecto(cuentasIds: readonly string[], recientes: readonly MovimientoReciente[]): string | null {
  const ultima = recientes.find((m) => cuentasIds.includes(m.cuenta_id));
  return ultima?.cuenta_id ?? cuentasIds[0] ?? null;
}
