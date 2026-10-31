import { describe, expect, it } from "vitest";
import { agruparCuotas } from "@/lib/cuotas/proyeccion";
import { aDecimal } from "@/lib/dinero";
import { aporteMensualNecesario, mesesRestantes, progresoMeta } from "@/lib/metas/calculos";
import { aporteSchema, metaSchema } from "@/lib/validaciones/metas";

describe("progresoMeta", () => {
  it("calcula lo que falta y el porcentaje", () => {
    const p = progresoMeta(250, 1000);
    expect(p.falta.toFixed(2)).toBe("750.00");
    expect(p.porcentaje).toBe(25);
    expect(p.proporcion).toBe(0.25);
    expect(p.cumplida).toBe(false);
  });

  it("no muestra 100% hasta completar", () => {
    expect(progresoMeta(999.99, 1000).porcentaje).toBe(99);
  });

  it("al pasarse, queda en 100% y sin faltante", () => {
    const p = progresoMeta(1200, 1000);
    expect(p.porcentaje).toBe(100);
    expect(p.proporcion).toBe(1);
    expect(p.falta.isZero()).toBe(true);
    expect(p.cumplida).toBe(true);
  });

  it("un saldo negativo no rompe la barra", () => {
    const p = progresoMeta(-50, 1000);
    expect(p.proporcion).toBe(0);
    expect(p.falta.toFixed(2)).toBe("1050.00");
  });
});

describe("mesesRestantes", () => {
  it("cuenta el mes actual", () => {
    expect(mesesRestantes("2026-10-31", "2026-10-30")).toBe(1);
    expect(mesesRestantes("2026-12-01", "2026-10-30")).toBe(3);
  });

  it("cruza de año", () => {
    expect(mesesRestantes("2027-02-15", "2026-10-30")).toBe(5);
  });

  it("sin fecha o con fecha pasada devuelve null", () => {
    expect(mesesRestantes(null, "2026-10-30")).toBeNull();
    expect(mesesRestantes("2026-10-29", "2026-10-30")).toBeNull();
  });
});

describe("aporteMensualNecesario", () => {
  it("divide lo que falta por los meses, redondeando hacia arriba: 1000 / 3", () => {
    expect(aporteMensualNecesario(aDecimal(1000), "2026-12-01", "2026-10-30")?.toFixed(2)).toBe("333.34");
  });

  it("sin fecha o sin faltante no aplica", () => {
    expect(aporteMensualNecesario(aDecimal(1000), null, "2026-10-30")).toBeNull();
    expect(aporteMensualNecesario(aDecimal(0), "2026-12-01", "2026-10-30")).toBeNull();
  });
});

describe("metaSchema", () => {
  const base = { nombre: "Fondo de emergencia", moneda: "USD", objetivo: "5.000", fecha_objetivo: "2027-06-30" };

  it("valida y convierte", () => {
    const m = metaSchema.parse(base);
    expect(m.objetivo.toFixed(2)).toBe("5000.00");
    expect(m.fecha_objetivo).toBe("2027-06-30");
  });

  it("la fecha es opcional", () => {
    expect(metaSchema.parse({ ...base, fecha_objetivo: "" }).fecha_objetivo).toBeNull();
  });

  it.each([
    ["nombre", ""],
    ["objetivo", "0"],
    ["moneda", "EUR"],
    ["fecha_objetivo", "mañana"],
  ])("rechaza %s con %j", (campo, valor) => {
    expect(metaSchema.safeParse({ ...base, [campo]: valor }).success).toBe(false);
  });
});

describe("aporteSchema", () => {
  it("valida un aporte y un retiro", () => {
    expect(aporteSchema.parse({ sentido: "aporte", monto: "100,50", fecha: "2026-10-30" }).monto.toFixed(2)).toBe("100.50");
    expect(aporteSchema.safeParse({ sentido: "retiro", monto: "50", fecha: "2026-10-30" }).success).toBe(true);
  });

  it.each([
    ["monto", "0"],
    ["monto", "-5"],
    ["sentido", "otro"],
    ["fecha", ""],
  ])("rechaza %s con %j", (campo, valor) => {
    expect(aporteSchema.safeParse({ sentido: "aporte", monto: "1", fecha: "2026-10-30", [campo]: valor }).success).toBe(false);
  });
});

describe("agruparCuotas", () => {
  const monedas = new Map([
    ["visa", "ARS"],
    ["amex", "USD"],
  ]);
  const fila = (mes: string, nro: number, monto: number, cuenta = "visa", id = "m1", cuotas = 3) => ({
    movimiento_id: id,
    cuenta_id: cuenta,
    nro_cuota: nro,
    cuotas,
    mes,
    monto_cuota: monto,
  });

  it("agrupa por mes y ordena", () => {
    const r = agruparCuotas([fila("2026-12-01", 2, 100), fila("2026-11-01", 1, 100)], monedas, "2026-11");
    expect(r.map((m) => m.mes)).toEqual(["2026-11", "2026-12"]);
    expect(r[0]?.cuotas[0]).toMatchObject({ numero: 1, total: 3, moneda: "ARS" });
  });

  it("deja afuera los meses pasados", () => {
    const r = agruparCuotas([fila("2026-09-01", 1, 100), fila("2026-11-01", 3, 100)], monedas, "2026-10");
    expect(r.map((m) => m.mes)).toEqual(["2026-11"]);
  });

  it("incluye el mes actual", () => {
    expect(agruparCuotas([fila("2026-10-01", 1, 100)], monedas, "2026-10")).toHaveLength(1);
  });

  it("suma por moneda sin mezclar", () => {
    const r = agruparCuotas([fila("2026-11-01", 1, 100.1), fila("2026-11-01", 1, 200.2, "visa", "m2"), fila("2026-11-01", 1, 15, "amex", "m3")], monedas, "2026-11");
    expect(r[0]?.totales.ARS.toFixed(2)).toBe("300.30");
    expect(r[0]?.totales.USD.toFixed(2)).toBe("15.00");
  });

  it("sin filas devuelve vacío", () => {
    expect(agruparCuotas([], monedas, "2026-11")).toEqual([]);
  });
});
