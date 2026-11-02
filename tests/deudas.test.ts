import { describe, expect, it } from "vitest";
import { prepararDeudas } from "@/lib/deudas/preparar";
import { erroresPorCampo } from "@/lib/validaciones/comunes";
import { aFilaDeuda, deudaSchema, pagoSchema } from "@/lib/validaciones/deudas";
import type { Cotizacion } from "@/lib/resumen/calculos";

const COTIZACION: Cotizacion = { fuente: "dolarapp", compra: 1656.31, venta: 1650.79, fecha: "2026-10-30", created_at: "2026-10-30T12:00:00Z" };

const tarjeta = {
  tipo: "tarjeta",
  acreedor: " Visa Galicia ",
  descripcion: "",
  moneda: "ARS",
  monto_total: "1.500.000,50",
  tasa_anual: "85,5",
  pago_minimo: "120.000",
  cuotas_total: "",
  monto_cuota: "",
  dia_vencimiento: "10",
  fecha_inicio: "2026-10-30",
};

const prestamo = { ...tarjeta, tipo: "prestamo", acreedor: "Mercado Pago", pago_minimo: "", cuotas_total: "12", monto_cuota: "95.000" };

describe("deudaSchema", () => {
  it("valida una tarjeta y arma la fila", () => {
    expect(aFilaDeuda(deudaSchema.parse(tarjeta))).toEqual({
      tipo: "tarjeta",
      acreedor: "Visa Galicia",
      descripcion: null,
      moneda: "ARS",
      monto_total: 1500000.5,
      tasa_anual: 85.5,
      pago_minimo: 120000,
      cuotas_total: null,
      monto_cuota: null,
      dia_vencimiento: 10,
      fecha_inicio: "2026-10-30",
    });
  });

  it("en un préstamo, el mínimo sale de la cuota si no se escribió", () => {
    expect(aFilaDeuda(deudaSchema.parse(prestamo))).toMatchObject({ pago_minimo: 95000, monto_cuota: 95000, cuotas_total: 12 });
  });

  it("en un préstamo, respeta el mínimo si se escribió", () => {
    expect(aFilaDeuda(deudaSchema.parse({ ...prestamo, pago_minimo: "50.000" })).pago_minimo).toBe(50000);
  });

  it("en una tarjeta, descarta datos de préstamo", () => {
    expect(aFilaDeuda(deudaSchema.parse({ ...tarjeta, cuotas_total: "12", monto_cuota: "95.000" }))).toMatchObject({ cuotas_total: null, monto_cuota: null });
  });

  it("acepta TNA cero y mínimo cero", () => {
    const fila = aFilaDeuda(deudaSchema.parse({ ...tarjeta, tasa_anual: "0", pago_minimo: "0" }));
    expect(fila.tasa_anual).toBe(0);
    expect(fila.pago_minimo).toBe(0);
  });

  it("acepta la TNA con signo de porcentaje", () => {
    expect(aFilaDeuda(deudaSchema.parse({ ...tarjeta, tasa_anual: "85,5%" })).tasa_anual).toBe(85.5);
  });

  it.each([
    ["acreedor", ""],
    ["monto_total", ""],
    ["monto_total", "0"],
    ["tasa_anual", ""],
    ["tasa_anual", "abc"],
    ["tasa_anual", "100000"],
    ["pago_minimo", ""],
    ["dia_vencimiento", "32"],
    ["fecha_inicio", "ayer"],
  ])("en una tarjeta, rechaza %s con %j", (campo, valor) => {
    const r = deudaSchema.safeParse({ ...tarjeta, [campo]: valor });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(erroresPorCampo(r.error))).toContain(campo);
  });

  it("exige mínimo o cuota en un préstamo", () => {
    const r = deudaSchema.safeParse({ ...prestamo, monto_cuota: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).pago_minimo).toBeDefined();
  });

  it("rechaza una cuota en cero", () => {
    const r = deudaSchema.safeParse({ ...prestamo, monto_cuota: "0" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).monto_cuota).toBeDefined();
  });
});

describe("pagoSchema", () => {
  const UUID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
  const base = { monto: "100.000", interes: "30.000", fecha: "2026-10-30", cuenta_id: UUID, categoria_id: UUID };

  it("valida y convierte", () => {
    const p = pagoSchema.parse(base);
    expect(p.monto.toFixed(2)).toBe("100000.00");
    expect(p.interes?.toFixed(2)).toBe("30000.00");
  });

  it("el interés y la cuenta son opcionales", () => {
    const p = pagoSchema.parse({ ...base, interes: "", cuenta_id: "", categoria_id: "" });
    expect(p.interes).toBeNull();
    expect(p.cuenta_id).toBeNull();
    expect(p.categoria_id).toBeNull();
  });

  it("acepta un interés igual al pago, pero no mayor", () => {
    expect(pagoSchema.safeParse({ ...base, interes: "100.000" }).success).toBe(true);
    const r = pagoSchema.safeParse({ ...base, interes: "100.001" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).interes).toBeDefined();
  });

  it.each([
    ["monto", "0"],
    ["fecha", "ayer"],
    ["cuenta_id", "abc"],
  ])("rechaza %s con %j", (campo, valor) => {
    expect(pagoSchema.safeParse({ ...base, [campo]: valor }).success).toBe(false);
  });
});

describe("prepararDeudas", () => {
  const fila = { id: "a", acreedor: "A", moneda: "ARS", pendiente: 1000, tasa_anual: 60, pago_minimo: 100 };

  it("deja pasar las deudas en pesos sin cotización", () => {
    const p = prepararDeudas([fila], null);
    expect(p.deudas).toHaveLength(1);
    expect(p.minimos.toFixed(2)).toBe("100.00");
    expect(p.hayEnDolares).toBe(false);
    expect(p.faltaCotizacion).toBe(false);
  });

  it("convierte las de dólares con la venta: 100 x 1650,79", () => {
    const p = prepararDeudas([{ ...fila, moneda: "USD", pendiente: 100, pago_minimo: 10 }], COTIZACION);
    expect(String(p.deudas[0]?.saldo)).toBe("165079");
    expect(String(p.deudas[0]?.pagoMinimo)).toBe("16507.9");
    expect(p.hayEnDolares).toBe(true);
  });

  it("sin cotización avisa y deja afuera las de dólares", () => {
    const p = prepararDeudas([fila, { ...fila, id: "b", moneda: "USD" }], null);
    expect(p.deudas.map((d) => d.id)).toEqual(["a"]);
    expect(p.faltaCotizacion).toBe(true);
  });

  it("separa las que no tienen TNA o mínimo", () => {
    const p = prepararDeudas([{ ...fila, tasa_anual: null }, { ...fila, id: "b", pago_minimo: null }], null);
    expect(p.deudas).toEqual([]);
    expect(p.incompletas.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("ignora las que ya no tienen saldo", () => {
    expect(prepararDeudas([{ ...fila, pendiente: 0 }], null).deudas).toEqual([]);
  });
});
