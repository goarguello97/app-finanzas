import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  convertir,
  cotizacionVencida,
  elegirCotizacion,
  enMoneda,
  estadoExtra,
  gastosPorCategoria,
  resumenDelMes,
  totalesDeCuentas,
  type Cotizacion,
} from "@/lib/resumen/calculos";

const COTIZACION: Cotizacion = { fuente: "dolarapp", compra: 1656.31, venta: 1650.79, fecha: "2026-10-30", created_at: "2026-10-30T12:00:00Z" };
const d = (v: string) => new Decimal(v);

describe("elegirCotizacion", () => {
  const otra = { ...COTIZACION, fuente: "binance", compra: 1, venta: 1 };

  it("usa solo el exchange configurado", () => {
    expect(elegirCotizacion([otra, COTIZACION], "dolarapp")).toBe(COTIZACION);
    expect(elegirCotizacion([otra], "dolarapp")).toBeNull();
  });

  it("acepta arq como dolarapp por el cambio de nombre, y toma la más reciente", () => {
    const arq = { ...COTIZACION, fuente: "arq", created_at: "2026-10-31T12:00:00Z" };
    expect(elegirCotizacion([COTIZACION, arq], "dolarapp")).toBe(arq);
  });

  it("descarta valores en cero, que la API puede devolver", () => {
    expect(elegirCotizacion([{ ...COTIZACION, compra: 0 }], "dolarapp")).toBeNull();
  });

  it("sin exchange no hay cotización", () => {
    expect(elegirCotizacion([COTIZACION], null)).toBeNull();
  });
});

describe("cotizacionVencida", () => {
  it("vence pasadas las 48 horas, no antes", () => {
    expect(cotizacionVencida(COTIZACION, new Date("2026-11-01T12:00:00Z"))).toBe(false);
    expect(cotizacionVencida(COTIZACION, new Date("2026-11-01T12:00:01Z"))).toBe(true);
  });
});

describe("convertir", () => {
  it("USD a ARS usa venta: 100 x 1650,79", () => {
    expect(convertir(d("100"), "USD", "ARS", COTIZACION)?.toFixed(2)).toBe("165079.00");
  });

  it("ARS a USD usa compra: 165.631 / 1656,31", () => {
    expect(convertir(d("165631"), "ARS", "USD", COTIZACION)?.toFixed(2)).toBe("100.00");
  });

  it("en la misma moneda no necesita cotización", () => {
    expect(convertir(d("5"), "ARS", "ARS", null)?.toString()).toBe("5");
  });

  it("sin cotización devuelve null", () => {
    expect(convertir(d("5"), "USD", "ARS", null)).toBeNull();
  });
});

describe("enMoneda", () => {
  const montos = { ARS: d("1000"), USD: d("10") };

  it("suma lo convertido: 1000 + 10 x 1650,79", () => {
    const r = enMoneda(montos, "ARS", COTIZACION);
    expect(r.total.toFixed(2)).toBe("17507.90");
    expect(r.sinConvertir.isZero()).toBe(true);
  });

  it("en USD: 10 + 1000 / 1656,31 redondeado", () => {
    expect(enMoneda(montos, "USD", COTIZACION).total.toFixed(2)).toBe("10.60");
  });

  it("sin cotización separa lo que no pudo convertir", () => {
    const r = enMoneda(montos, "ARS", null);
    expect(r.total.toFixed(2)).toBe("1000.00");
    expect(r.sinConvertir.toFixed(2)).toBe("10.00");
  });
});

describe("totalesDeCuentas", () => {
  it("suma por moneda, sin archivadas y con saldos negativos", () => {
    const t = totalesDeCuentas([
      { moneda: "ARS", saldo_actual: 1000.5, archivada: false },
      { moneda: "ARS", saldo_actual: -200.25, archivada: false },
      { moneda: "USD", saldo_actual: 50, archivada: false },
      { moneda: "ARS", saldo_actual: 999, archivada: true },
    ]);
    expect(t.ARS.toFixed(2)).toBe("800.25");
    expect(t.USD.toFixed(2)).toBe("50.00");
  });

  it("no acumula error de punto flotante", () => {
    const t = totalesDeCuentas([
      { moneda: "ARS", saldo_actual: 0.1, archivada: false },
      { moneda: "ARS", saldo_actual: 0.2, archivada: false },
    ]);
    expect(t.ARS.toString()).toBe("0.3");
  });
});

describe("resumenDelMes", () => {
  it("separa ingresos y gastos por moneda", () => {
    const r = resumenDelMes([
      { moneda: "ARS", tipo: "ingreso", total: 800000 },
      { moneda: "ARS", tipo: "gasto", total: 34000.5 },
      { moneda: "USD", tipo: "gasto", total: 15 },
    ]);
    expect(r.ingresos.ARS.toFixed(2)).toBe("800000.00");
    expect(r.gastos.ARS.toFixed(2)).toBe("34000.50");
    expect(r.gastos.USD.toFixed(2)).toBe("15.00");
    expect(r.ingresos.USD.isZero()).toBe(true);
  });
});

describe("gastosPorCategoria", () => {
  const categorias = [
    { id: "super", nombre: "Supermercado", excluye_totales: false },
    { id: "comida", nombre: "Comida afuera", excluye_totales: false },
    { id: "cambio", nombre: "Cambio de moneda", excluye_totales: true },
  ];

  it("agrupa, ordena de mayor a menor y calcula porcentajes", () => {
    const r = gastosPorCategoria(
      [
        { categoria_id: "comida", monto: 250, moneda: "ARS" },
        { categoria_id: "super", monto: 500, moneda: "ARS" },
        { categoria_id: "super", monto: 250, moneda: "ARS" },
      ],
      categorias,
      "ARS",
      null,
    );
    expect(r.total.toFixed(2)).toBe("1000.00");
    expect(r.filas.map((f) => [f.nombre, f.total.toFixed(2), f.porcentaje.toString(), f.proporcion])).toEqual([
      ["Supermercado", "750.00", "75", 1],
      ["Comida afuera", "250.00", "25", 250 / 750],
    ]);
  });

  it("deja afuera las categorías excluidas de los totales", () => {
    const r = gastosPorCategoria([{ categoria_id: "cambio", monto: 500000, moneda: "ARS" }], categorias, "ARS", null);
    expect(r.filas).toEqual([]);
    expect(r.total.isZero()).toBe(true);
  });

  it("agrupa lo que no tiene categoría", () => {
    const r = gastosPorCategoria(
      [
        { categoria_id: null, monto: 10, moneda: "ARS" },
        { categoria_id: null, monto: 5, moneda: "ARS" },
      ],
      categorias,
      "ARS",
      null,
    );
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]?.nombre).toBe("Sin categoría");
    expect(r.filas[0]?.total.toFixed(2)).toBe("15.00");
  });

  it("convierte otra moneda con cotización", () => {
    const r = gastosPorCategoria([{ categoria_id: "super", monto: 10, moneda: "USD" }], categorias, "ARS", COTIZACION);
    expect(r.total.toFixed(2)).toBe("16507.90");
    expect(r.sinConvertir.isZero()).toBe(true);
  });

  it("sin cotización separa la otra moneda en vez de sumarla mal", () => {
    const r = gastosPorCategoria(
      [
        { categoria_id: "super", monto: 10, moneda: "USD" },
        { categoria_id: "comida", monto: 100, moneda: "ARS" },
      ],
      categorias,
      "ARS",
      null,
    );
    expect(r.total.toFixed(2)).toBe("100.00");
    expect(r.sinConvertir.toFixed(2)).toBe("10.00");
    expect(r.filas.map((f) => f.nombre)).toEqual(["Comida afuera"]);
  });

  it("sin movimientos no divide por cero", () => {
    expect(gastosPorCategoria([], categorias, "ARS", null)).toMatchObject({ filas: [] });
  });
});

describe("estadoExtra", () => {
  it("sin mínimo no hay comparación", () => {
    expect(estadoExtra(d("100"), null)).toEqual({ conMinimo: false });
    expect(estadoExtra(d("100"), 0)).toEqual({ conMinimo: false });
  });

  it("por encima del mínimo hay extra", () => {
    const e = estadoExtra(d("1500000"), 1000000);
    if (!e.conMinimo) throw new Error("debería tener mínimo");
    expect(e.extra.toFixed(2)).toBe("500000.00");
    expect(e.faltante.isZero()).toBe(true);
    expect(e.proporcion).toBe(1);
  });

  it("por debajo del mínimo informa lo que falta", () => {
    const e = estadoExtra(d("250000"), 1000000);
    if (!e.conMinimo) throw new Error("debería tener mínimo");
    expect(e.extra.isZero()).toBe(true);
    expect(e.faltante.toFixed(2)).toBe("750000.00");
    expect(e.proporcion).toBe(0.25);
  });

  it("justo en el mínimo no hay extra ni faltante", () => {
    const e = estadoExtra(d("1000"), 1000);
    if (!e.conMinimo) throw new Error("debería tener mínimo");
    expect(e.extra.isZero()).toBe(true);
    expect(e.faltante.isZero()).toBe(true);
  });
});
