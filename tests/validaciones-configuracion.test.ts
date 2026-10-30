import { describe, expect, it } from "vitest";
import { configuracionSchema } from "@/lib/validaciones/configuracion";

const validos = { ingreso_minimo: "1.500.000,50", moneda_base: "ARS", exchange_cotizacion: "dolarapp" };

describe("configuracionSchema", () => {
  it("convierte el ingreso mínimo a decimal", () => {
    const resultado = configuracionSchema.parse(validos);
    expect(resultado.ingreso_minimo?.toFixed(2)).toBe("1500000.50");
  });

  it("toma el ingreso vacío como sin presupuesto", () => {
    expect(configuracionSchema.parse({ ...validos, ingreso_minimo: "  " }).ingreso_minimo).toBeNull();
  });

  it("rechaza un ingreso inválido con un mensaje en el campo", () => {
    const resultado = configuracionSchema.safeParse({ ...validos, ingreso_minimo: "mucho" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual(["ingreso_minimo"]);
    }
  });

  it("normaliza el exchange a minúsculas", () => {
    expect(configuracionSchema.parse({ ...validos, exchange_cotizacion: " DolarApp " }).exchange_cotizacion).toBe("dolarapp");
  });

  it.each(["", "a", "dolar app", "dolar-app"])("rechaza el exchange %j", (exchange_cotizacion) => {
    expect(configuracionSchema.safeParse({ ...validos, exchange_cotizacion }).success).toBe(false);
  });

  it("rechaza una moneda fuera de ARS y USD", () => {
    expect(configuracionSchema.safeParse({ ...validos, moneda_base: "EUR" }).success).toBe(false);
  });
});
