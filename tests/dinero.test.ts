import { describe, expect, it } from "vitest";
import { aDecimal, aNumeroDb, formatearMonto, formatearNumero, parsearMonto, redondear } from "@/lib/dinero";

describe("formatearMonto", () => {
  it("usa el formato es-AR", () => {
    expect(formatearMonto("1234567.89")).toBe("$ 1.234.567,89");
    expect(formatearMonto("1234567.89", "USD")).toBe("US$ 1.234.567,89");
  });

  it("completa decimales y no agrupa de menos", () => {
    expect(formatearMonto(0)).toBe("$ 0,00");
    expect(formatearMonto("999")).toBe("$ 999,00");
    expect(formatearMonto("1000")).toBe("$ 1.000,00");
  });

  it("pone el signo antes del símbolo", () => {
    expect(formatearMonto("-1500.5")).toBe("-$ 1.500,50");
  });

  it("no muestra -0,00", () => {
    expect(formatearNumero("-0.001")).toBe("0,00");
  });
});

describe("redondear", () => {
  it("redondea medio hacia arriba, sin el error de los float", () => {
    expect(redondear("1.005").toFixed(2)).toBe("1.01");
    expect(redondear("2.675").toFixed(2)).toBe("2.68");
  });

  it("suma sin error de punto flotante", () => {
    expect(aDecimal("0.1").plus("0.2").toFixed(2)).toBe("0.30");
  });
});

describe("parsearMonto", () => {
  it.each([
    ["1.234.567,89", "1234567.89"],
    ["1.234", "1234"],
    ["1234,5", "1234.5"],
    ["1234", "1234"],
    ["0,50", "0.5"],
    ["1234.56", "1234.56"],
    ["1.23", "1.23"],
    ["$ 1.500,00", "1500"],
    ["US$ 20", "20"],
    ["  300  ", "300"],
  ])("interpreta %s", (entrada, esperado) => {
    expect(parsearMonto(entrada)?.toString()).toBe(esperado);
  });

  it.each(["", "   ", "abc", "1,2,3", "1,234", "12.34.56", "1.2345", "-100", "1e5", "1000000000000"])(
    "rechaza %j",
    (entrada) => {
      expect(parsearMonto(entrada)).toBeNull();
    },
  );

  it("acepta el máximo de numeric(14,2)", () => {
    expect(parsearMonto("999999999999,99")?.toFixed(2)).toBe("999999999999.99");
  });
});

describe("aNumeroDb", () => {
  it("conserva el valor exacto en el tope de numeric(14,2)", () => {
    expect(String(aNumeroDb(aDecimal("999999999999.99")))).toBe("999999999999.99");
  });
});
