import { describe, expect, it } from "vitest";
import {
  esFechaValida,
  esMesValido,
  etiquetaDia,
  formatearFecha,
  hoyBuenosAires,
  nombreMes,
  rangoMes,
  sumarDias,
  sumarMeses,
} from "@/lib/fechas";

describe("hoyBuenosAires", () => {
  it("a las 22:00 de Argentina sigue siendo el mismo día, aunque en UTC ya sea el siguiente", () => {
    expect(hoyBuenosAires(new Date("2026-10-31T01:00:00Z"))).toBe("2026-10-30");
  });

  it("cambia de día a la medianoche de Argentina", () => {
    expect(hoyBuenosAires(new Date("2026-10-31T03:00:00Z"))).toBe("2026-10-31");
  });
});

describe("formato", () => {
  it("muestra dd/mm/aaaa", () => {
    expect(formatearFecha("2026-03-05")).toBe("05/03/2026");
  });

  it("etiqueta hoy y ayer, incluso al cruzar de mes", () => {
    expect(etiquetaDia("2026-11-01", "2026-11-01")).toBe("Hoy");
    expect(etiquetaDia("2026-10-31", "2026-11-01")).toBe("Ayer");
    expect(etiquetaDia("2026-10-30", "2026-11-01")).toBe("30/10/2026");
  });

  it("nombra el mes", () => {
    expect(nombreMes("2026-10")).toBe("octubre de 2026");
  });
});

describe("meses", () => {
  it("calcula el último día, con años bisiestos", () => {
    expect(rangoMes("2026-10")).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(rangoMes("2028-02").hasta).toBe("2028-02-29");
    expect(rangoMes("2026-02").hasta).toBe("2026-02-28");
  });

  it("cruza de año", () => {
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
  });

  it("suma días cruzando de mes", () => {
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("validación", () => {
  it.each(["2026-10-30", "2028-02-29"])("acepta la fecha %s", (f) => expect(esFechaValida(f)).toBe(true));
  it.each(["2026-02-30", "2026-13-01", "30/10/2026", "", "2026-1-1"])("rechaza la fecha %j", (f) =>
    expect(esFechaValida(f)).toBe(false),
  );
  it.each(["2026-10", "2026-01"])("acepta el mes %s", (m) => expect(esMesValido(m)).toBe(true));
  it.each(["2026-13", "2026-00", "2026", "abc"])("rechaza el mes %j", (m) => expect(esMesValido(m)).toBe(false));
});
