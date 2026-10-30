import { describe, expect, it } from "vitest";
import { aplicarTecla, mostrarEntrada, type Tecla } from "@/lib/dinero/teclado";
import { parsearMonto } from "@/lib/dinero";

const escribir = (teclas: Tecla[], inicio = "") => teclas.reduce(aplicarTecla, inicio);

describe("aplicarTecla", () => {
  it("escribe enteros y decimales", () => {
    expect(escribir(["1", "2", "3", "4", ",", "5"])).toBe("1234,5");
  });

  it("limita a dos decimales y a una sola coma", () => {
    expect(escribir(["1", ",", "2", "3", "4"])).toBe("1,23");
    expect(escribir(["1", ",", ",", "2"])).toBe("1,2");
  });

  it("agrega el cero si arranca con coma", () => {
    expect(escribir([",", "5"])).toBe("0,5");
  });

  it("no acumula ceros a la izquierda", () => {
    expect(escribir(["0", "0", "7"])).toBe("7");
    expect(escribir(["0", ",", "0", "5"])).toBe("0,05");
  });

  it("borra de a un carácter y no falla si está vacío", () => {
    expect(escribir(["1", ",", "5", "borrar", "borrar"])).toBe("1");
    expect(aplicarTecla("", "borrar")).toBe("");
  });

  it("no pasa del máximo de la columna", () => {
    const entrada = escribir(Array<Tecla>(20).fill("9"));
    expect(entrada).toHaveLength(12);
    expect(parsearMonto(`${entrada},99`)?.toFixed(2)).toBe("999999999999.99");
  });
});

describe("mostrarEntrada", () => {
  it.each([
    ["", "0"],
    ["1234", "1.234"],
    ["1234567,8", "1.234.567,8"],
    ["1234,", "1.234,"],
    ["0,05", "0,05"],
  ])("%j se ve como %s", (entrada, esperado) => {
    expect(mostrarEntrada(entrada)).toBe(esperado);
  });
});

describe("lo que produce el teclado se puede parsear", () => {
  it.each(["1234", "1234,5", "0,05"])("%s", (entrada) => {
    expect(parsearMonto(entrada)).not.toBeNull();
  });

  it("una coma final, a medio escribir, cuenta como entero", () => {
    expect(parsearMonto("1234,".replace(/,$/, ""))?.toString()).toBe("1234");
  });
});
