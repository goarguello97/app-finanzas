import { describe, expect, it } from "vitest";
import { cuentaPorDefecto, ordenarPorUso } from "@/lib/movimientos/carga";
import { agruparPorDia, parsearFiltros, urlListado } from "@/lib/movimientos/listado";

const UUID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("ordenarPorUso", () => {
  const categorias = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("pone primero las más usadas", () => {
    const recientes = [
      { cuenta_id: "x", categoria_id: "c" },
      { cuenta_id: "x", categoria_id: "b" },
      { cuenta_id: "x", categoria_id: "c" },
    ];
    expect(ordenarPorUso(categorias, recientes).map((c) => c.id)).toEqual(["c", "b", "a"]);
  });

  it("sin historial mantiene el orden y no modifica la lista", () => {
    const resultado = ordenarPorUso(categorias, []);
    expect(resultado.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(resultado).not.toBe(categorias);
  });

  it("ignora movimientos sin categoría", () => {
    expect(ordenarPorUso(categorias, [{ cuenta_id: "x", categoria_id: null }]).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("cuentaPorDefecto", () => {
  it("usa la del último movimiento", () => {
    const recientes = [
      { cuenta_id: "b", categoria_id: null },
      { cuenta_id: "a", categoria_id: null },
    ];
    expect(cuentaPorDefecto(["a", "b"], recientes)).toBe("b");
  });

  it("salta las cuentas que ya no están activas", () => {
    const recientes = [
      { cuenta_id: "archivada", categoria_id: null },
      { cuenta_id: "a", categoria_id: null },
    ];
    expect(cuentaPorDefecto(["a", "b"], recientes)).toBe("a");
  });

  it("sin historial usa la primera, y sin cuentas devuelve null", () => {
    expect(cuentaPorDefecto(["a", "b"], [])).toBe("a");
    expect(cuentaPorDefecto([], [])).toBeNull();
  });
});

describe("parsearFiltros", () => {
  const hoy = "2026-10-30";

  it("sin parámetros usa el mes actual", () => {
    expect(parsearFiltros({}, hoy)).toEqual({ mes: "2026-10", cuenta: null, categoria: null });
  });

  it("lee los filtros válidos", () => {
    expect(parsearFiltros({ mes: "2026-08", cuenta: UUID, categoria: "ninguna" }, hoy)).toEqual({
      mes: "2026-08",
      cuenta: UUID,
      categoria: "ninguna",
    });
  });

  it("ignora los inválidos o repetidos", () => {
    expect(parsearFiltros({ mes: "agosto", cuenta: "1 or 1=1", categoria: [UUID, UUID] }, hoy)).toEqual({
      mes: "2026-10",
      cuenta: null,
      categoria: null,
    });
  });
});

describe("urlListado", () => {
  it("omite lo vacío", () => {
    expect(urlListado({ mes: "2026-10", cuenta: null, categoria: null })).toBe("/movimientos?mes=2026-10");
    expect(urlListado({ mes: "2026-10", cuenta: UUID, categoria: null })).toBe(`/movimientos?mes=2026-10&cuenta=${UUID}`);
  });
});

describe("agruparPorDia", () => {
  it("agrupa los consecutivos y mantiene el orden", () => {
    const grupos = agruparPorDia([
      { fecha: "2026-10-30", id: 1 },
      { fecha: "2026-10-30", id: 2 },
      { fecha: "2026-10-28", id: 3 },
    ]);
    expect(grupos.map((g) => [g.fecha, g.movimientos.map((m) => m.id)])).toEqual([
      ["2026-10-30", [1, 2]],
      ["2026-10-28", [3]],
    ]);
  });

  it("sin movimientos devuelve vacío", () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});
