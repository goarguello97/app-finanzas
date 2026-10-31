import { describe, expect, it, vi } from "vitest";
import { leerCotizacion } from "@/lib/cotizacion/criptoya";
import { actualizarCotizacion, autorizado, type DependenciasCron } from "@/lib/cotizacion/cron";

const RESPUESTA = JSON.stringify({
  dolarapp: { ask: 1656.31, totalAsk: 1656.31, bid: 1650.7876, totalBid: 1650.7876, time: 1793370550 },
  binance: { ask: 1644.2, bid: 1640.8 },
  kucoinp2p: { ask: 0, bid: 1580.83 },
});

describe("leerCotizacion", () => {
  it("usa ask como compra y bid como venta, a dos decimales", () => {
    expect(leerCotizacion(RESPUESTA, "dolarapp")).toEqual({ ok: true, cotizacion: { fuente: "dolarapp", compra: 1656.31, venta: 1650.79 } });
  });

  it("lee el exchange configurado, no otro", () => {
    const r = leerCotizacion(RESPUESTA, "binance");
    expect(r.ok && r.cotizacion.fuente).toBe("binance");
  });

  it("prueba arq si no está dolarapp, por el cambio de nombre", () => {
    const r = leerCotizacion(JSON.stringify({ arq: { ask: 100, bid: 99 } }), "dolarapp");
    expect(r.ok && r.cotizacion.fuente).toBe("arq");
  });

  it("rechaza el texto plano que la API devuelve con HTTP 200", () => {
    const r = leerCotizacion("Invalid pair", "dolarapp");
    expect(!r.ok && r.error).toContain("no es JSON");
    expect(!r.ok && r.error).toContain("Invalid pair");
  });

  it("rechaza un JSON que no es objeto", () => {
    expect(leerCotizacion("null", "dolarapp").ok).toBe(false);
    expect(leerCotizacion('"hola"', "dolarapp").ok).toBe(false);
  });

  it("rechaza si no aparece el exchange", () => {
    const r = leerCotizacion(JSON.stringify({ otro: { ask: 1, bid: 1 } }), "dolarapp");
    expect(!r.ok && r.error).toContain("dolarapp ni arq");
  });

  it.each([
    ["ask en cero", { ask: 0, bid: 10 }],
    ["bid negativo", { ask: 10, bid: -1 }],
    ["ask de texto", { ask: "10", bid: 10 }],
    ["sin bid", { ask: 10 }],
    ["redondea a cero", { ask: 0.001, bid: 10 }],
  ])("rechaza %s", (_nombre, precios) => {
    expect(leerCotizacion(JSON.stringify({ dolarapp: precios }), "dolarapp").ok).toBe(false);
  });
});

describe("autorizado", () => {
  it("acepta el Bearer correcto", () => {
    expect(autorizado("Bearer secreto", "secreto")).toBe(true);
  });

  it.each([
    ["otro secreto", "Bearer otro", "secreto"],
    ["sin Bearer", "secreto", "secreto"],
    ["sin encabezado", null, "secreto"],
    ["sin secreto configurado", "Bearer ", undefined],
    ["secreto vacío", "Bearer ", ""],
  ])("rechaza %s", (_nombre, encabezado, secreto) => {
    expect(autorizado(encabezado, secreto)).toBe(false);
  });
});

describe("actualizarCotizacion", () => {
  const dependencias = (cambios: Partial<DependenciasCron> = {}): DependenciasCron => ({
    leerExchange: vi.fn(async () => "dolarapp"),
    pedirCotizaciones: vi.fn(async () => RESPUESTA),
    guardar: vi.fn(async () => {}),
    ...cambios,
  });

  it("guarda la cotización leída", async () => {
    const d = dependencias();
    const r = await actualizarCotizacion(d);
    expect(r.ok).toBe(true);
    expect(d.guardar).toHaveBeenCalledWith({ fuente: "dolarapp", compra: 1656.31, venta: 1650.79 });
  });

  it("sin exchange configurado usa dolarapp", async () => {
    const d = dependencias({ leerExchange: vi.fn(async () => null) });
    const r = await actualizarCotizacion(d);
    expect(r.ok && r.cotizacion.fuente).toBe("dolarapp");
  });

  it("si la respuesta es inválida no guarda nada", async () => {
    const d = dependencias({ pedirCotizaciones: vi.fn(async () => "Invalid pair") });
    const r = await actualizarCotizacion(d);
    expect(r.ok).toBe(false);
    expect(d.guardar).not.toHaveBeenCalled();
  });

  it("si falla la red informa el error y no guarda nada", async () => {
    const d = dependencias({
      pedirCotizaciones: vi.fn(async () => {
        throw new Error("timeout");
      }),
    });
    expect(await actualizarCotizacion(d)).toEqual({ ok: false, error: "timeout" });
    expect(d.guardar).not.toHaveBeenCalled();
  });

  it("informa si falla el guardado", async () => {
    const d = dependencias({
      guardar: vi.fn(async () => {
        throw new Error("sin permisos");
      }),
    });
    expect(await actualizarCotizacion(d)).toEqual({ ok: false, error: "sin permisos" });
  });
});
