import { describe, expect, it } from "vitest";
import { erroresPorCampo } from "@/lib/validaciones/comunes";
import { aFilaCuenta, cuentaSchema } from "@/lib/validaciones/cuentas";
import { categoriaSchema } from "@/lib/validaciones/categorias";
import { movimientoSchema, validarRelaciones } from "@/lib/validaciones/movimientos";

const UUID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("cuentaSchema", () => {
  const base = { nombre: "Galicia", tipo: "banco", moneda: "ARS", saldo_inicial: "1.500,50", dia_cierre: "", dia_vencimiento: "", limite: "" };

  it("valida y arma la fila", () => {
    expect(aFilaCuenta(cuentaSchema.parse(base))).toEqual({
      nombre: "Galicia",
      tipo: "banco",
      moneda: "ARS",
      saldo_inicial: 1500.5,
      dia_cierre: null,
      dia_vencimiento: null,
      limite: null,
    });
  });

  it("acepta saldo vacío como cero, y negativo por descubierto", () => {
    expect(aFilaCuenta(cuentaSchema.parse({ ...base, saldo_inicial: "" })).saldo_inicial).toBe(0);
    expect(aFilaCuenta(cuentaSchema.parse({ ...base, saldo_inicial: "-200,25" })).saldo_inicial).toBe(-200.25);
  });

  it("descarta los campos de tarjeta en otras cuentas, porque la tabla lo exige", () => {
    const fila = aFilaCuenta(cuentaSchema.parse({ ...base, dia_cierre: "10", dia_vencimiento: "20", limite: "1000" }));
    expect(fila).toMatchObject({ dia_cierre: null, dia_vencimiento: null, limite: null });
  });

  it("en tarjetas guarda cierre, vencimiento y límite, con saldo en cero", () => {
    const fila = aFilaCuenta(
      cuentaSchema.parse({ ...base, tipo: "tarjeta", saldo_inicial: "500", dia_cierre: "10", dia_vencimiento: "20", limite: "1.000.000" }),
    );
    expect(fila).toMatchObject({ saldo_inicial: 0, dia_cierre: 10, dia_vencimiento: 20, limite: 1000000 });
  });

  it.each(["0", "32", "1,5", "x"])("rechaza el día %j", (dia_cierre) => {
    expect(cuentaSchema.safeParse({ ...base, dia_cierre }).success).toBe(false);
  });

  it("exige nombre", () => {
    const resultado = cuentaSchema.safeParse({ ...base, nombre: "  " });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(erroresPorCampo(resultado.error).nombre).toBe("Escribí un nombre.");
  });
});

describe("categoriaSchema", () => {
  it("recorta el nombre", () => {
    expect(categoriaSchema.parse({ nombre: " Salud ", tipo: "gasto", excluye_totales: false }).nombre).toBe("Salud");
  });

  it("rechaza un tipo desconocido", () => {
    expect(categoriaSchema.safeParse({ nombre: "Salud", tipo: "otro", excluye_totales: false }).success).toBe(false);
  });
});

describe("movimientoSchema", () => {
  const base = { tipo: "gasto", monto: "1234,5", cuenta_id: UUID, categoria_id: UUID, fecha: "2026-10-30", nota: "", cuotas: "" };

  it("convierte el monto a decimal exacto y normaliza lo vacío", () => {
    const m = movimientoSchema.parse(base);
    expect(m.monto.toFixed(2)).toBe("1234.50");
    expect(m.nota).toBeNull();
    expect(m.cuotas).toBe(1);
  });

  it("permite no tener categoría", () => {
    expect(movimientoSchema.parse({ ...base, categoria_id: "" }).categoria_id).toBeNull();
  });

  it.each([
    ["monto", ""],
    ["monto", "0"],
    ["monto", "0,00"],
    ["monto", "-5"],
    ["cuenta_id", ""],
    ["cuenta_id", "abc"],
    ["categoria_id", "abc"],
    ["fecha", "30/10/2026"],
    ["fecha", "2026-02-30"],
    ["cuotas", "0"],
    ["cuotas", "61"],
    ["cuotas", "1,5"],
    ["nota", "x".repeat(201)],
  ])("rechaza %s con %j", (campo, valor) => {
    const resultado = movimientoSchema.safeParse({ ...base, [campo]: valor });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(Object.keys(erroresPorCampo(resultado.error))).toEqual([campo]);
  });
});

describe("validarRelaciones", () => {
  const gasto = { tipo: "gasto" as const, cuotas: 1, categoria_id: UUID };

  it("acepta una combinación correcta", () => {
    expect(validarRelaciones(gasto, { tipo: "banco" }, { tipo: "gasto" })).toEqual({});
  });

  it("rechaza una categoría de otro tipo", () => {
    expect(validarRelaciones(gasto, { tipo: "banco" }, { tipo: "ingreso" }).categoria_id).toBe("Esa categoría es de ingresos.");
  });

  it("avisa si la cuenta o la categoría ya no existen", () => {
    expect(validarRelaciones(gasto, null, null)).toEqual({
      cuenta_id: "Esa cuenta ya no existe.",
      categoria_id: "Esa categoría ya no existe.",
    });
  });

  it("no exige categoría si no se eligió", () => {
    expect(validarRelaciones({ ...gasto, categoria_id: null }, { tipo: "banco" }, null)).toEqual({});
  });

  it("solo permite cuotas en gastos con tarjeta", () => {
    expect(validarRelaciones({ ...gasto, cuotas: 3 }, { tipo: "tarjeta" }, { tipo: "gasto" })).toEqual({});
    expect(validarRelaciones({ ...gasto, cuotas: 3 }, { tipo: "banco" }, { tipo: "gasto" }).cuotas).toBeDefined();
    expect(validarRelaciones({ tipo: "ingreso", cuotas: 3, categoria_id: null }, { tipo: "tarjeta" }, null).cuotas).toBeDefined();
  });
});
