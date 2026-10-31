import Decimal from "decimal.js";
import type { Moneda } from "@/lib/dinero";

export interface CuotaProyectada {
  movimiento_id: string | null;
  cuenta_id: string | null;
  nro_cuota: number | null;
  cuotas: number | null;
  mes: string | null;
  monto_cuota: number | null;
}

export interface CuotaDelMes {
  movimientoId: string;
  cuentaId: string;
  numero: number;
  total: number;
  monto: Decimal;
  moneda: Moneda;
}

export interface MesDeCuotas {
  mes: string;
  totales: Record<Moneda, Decimal>;
  cuotas: CuotaDelMes[];
}

/** Agrupa por mes lo comprometido desde `mesDesde` en adelante. Los meses pasados ya no comprometen nada. */
export function agruparCuotas(filas: readonly CuotaProyectada[], monedaDe: ReadonlyMap<string, string>, mesDesde: string): MesDeCuotas[] {
  const meses = new Map<string, MesDeCuotas>();

  for (const f of filas) {
    if (!f.mes || !f.movimiento_id || !f.cuenta_id || f.monto_cuota == null) continue;
    const mes = f.mes.slice(0, 7);
    if (mes < mesDesde) continue;

    const moneda: Moneda = monedaDe.get(f.cuenta_id) === "USD" ? "USD" : "ARS";
    const monto = new Decimal(String(f.monto_cuota));
    const grupo = meses.get(mes) ?? { mes, totales: { ARS: new Decimal(0), USD: new Decimal(0) }, cuotas: [] };
    grupo.totales[moneda] = grupo.totales[moneda].plus(monto);
    grupo.cuotas.push({ movimientoId: f.movimiento_id, cuentaId: f.cuenta_id, numero: f.nro_cuota ?? 1, total: f.cuotas ?? 1, monto, moneda });
    meses.set(mes, grupo);
  }

  return [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}
