import { describe, expect, it } from "vitest";
import { comparar, simular, type DeudaSimulada, type EntradaSimulador, type ResultadoEstrategia } from "@/lib/deudas/simulador";

const entrada = (deudas: DeudaSimulada[], montoMensual: number | string, mesInicio = "2026-11"): EntradaSimulador => ({
  deudas,
  montoMensual,
  mesInicio,
});

function correr(e: EntradaSimulador, estrategia: "bola_de_nieve" | "avalancha"): ResultadoEstrategia {
  const r = simular(e, estrategia);
  if (!r.ok) throw new Error(r.error.mensaje);
  return r.valor;
}

describe("una sola deuda, calculada a mano", () => {
  // 1000 al 12% TNA = 1% mensual, pagando 500:
  // mes 1: 1000 + 10,00 = 1010,00 - 500 = 510,00
  // mes 2:  510 +  5,10 =  515,10 - 500 =  15,10
  // mes 3: 15,10 + 0,15 (0,151) = 15,25, se cancela
  const e = entrada([{ id: "a", nombre: "A", saldo: 1000, tna: 12, pagoMinimo: 100 }], 500);
  const r = correr(e, "avalancha");

  it("cancela en 3 meses con 15,25 de interés", () => {
    expect(r.meses).toBe(3);
    expect(r.intereses.toFixed(2)).toBe("15.25");
    expect(r.pagado.toFixed(2)).toBe("1015.25");
  });

  it("arma el cronograma mes a mes", () => {
    expect(r.cronograma.map((m) => [m.mes, m.interes.toFixed(2), m.pago.toFixed(2), m.saldoFinal.toFixed(2)])).toEqual([
      ["2026-11", "10.00", "500.00", "510.00"],
      ["2026-12", "5.10", "500.00", "15.10"],
      ["2027-01", "0.15", "15.25", "0.00"],
    ]);
  });

  it("da la fecha de libertad, cruzando de año", () => {
    expect(r.mesLibertad).toBe("2027-01");
    expect(r.deudas[0]?.mesCancelacion).toBe("2027-01");
  });
});

describe("dos deudas, calculadas a mano", () => {
  // A: 1000 al 0%, mínimo 100. B: 2000 al 24% (2% mensual), mínimo 100. Disponible: 500.
  const e = entrada(
    [
      { id: "a", nombre: "A", saldo: 1000, tna: 0, pagoMinimo: 100 },
      { id: "b", nombre: "B", saldo: 2000, tna: 24, pagoMinimo: 100 },
    ],
    500,
  );

  describe("avalancha: el sobrante va primero a B", () => {
    // Saldo de B al final de cada mes:
    // 1: 2000 + 40,00 - 400 = 1640,00
    // 2: 1640 + 32,80 - 400 = 1272,80
    // 3: 1272,80 + 25,46 - 400 = 898,26
    // 4: 898,26 + 17,97 - 400 = 516,23
    // 5: 516,23 + 10,32 - 400 = 126,55
    // 6: 126,55 + 2,53 = 129,08, se cancela y sobran 270,92.
    // A baja 100 por mes en los meses 1 a 5, hasta 500. En el 6 paga 100 + 270,92 y queda en 129,08.
    // 7: A paga los 129,08 restantes.
    const r = correr(e, "avalancha");

    it("cancela B en el mes 6 y A en el 7", () => {
      expect(r.deudas.find((d) => d.id === "b")?.meses).toBe(6);
      expect(r.deudas.find((d) => d.id === "a")?.meses).toBe(7);
      expect(r.meses).toBe(7);
    });

    it("paga 129,08 de intereses", () => {
      expect(r.intereses.toFixed(2)).toBe("129.08");
      expect(r.pagado.toFixed(2)).toBe("3129.08");
    });

    it("el sobrante del mes en que cancela B pasa a A", () => {
      const mes6 = r.cronograma[5];
      expect(mes6?.deudas.find((d) => d.id === "a")?.saldoFinal.toFixed(2)).toBe("129.08");
      expect(mes6?.pago.toFixed(2)).toBe("500.00");
    });
  });

  describe("bola de nieve: el sobrante va primero a A", () => {
    // A: 1000 -> 600 -> 200 -> se cancela en el mes 3, con 200 que sobran para B.
    // B: 1: 2000 + 40,00 - 100 = 1940,00
    //    2: 1940 + 38,80 - 100 = 1878,80
    //    3: 1878,80 + 37,58 - 100 - 200 = 1616,38
    //    4: 1616,38 + 32,33 - 500 = 1148,71
    //    5: 1148,71 + 22,97 - 500 = 671,68
    //    6: 671,68 + 13,43 - 500 = 185,11
    //    7: 185,11 + 3,70 = 188,81, se cancela
    const r = correr(e, "bola_de_nieve");

    it("cancela A en el mes 3 y B en el 7", () => {
      expect(r.deudas.find((d) => d.id === "a")?.meses).toBe(3);
      expect(r.deudas.find((d) => d.id === "b")?.meses).toBe(7);
    });

    it("paga 188,81 de intereses", () => {
      expect(r.intereses.toFixed(2)).toBe("188.81");
      expect(r.pagado.toFixed(2)).toBe("3188.81");
    });

    it("el mínimo de la cancelada se suma al sobrante", () => {
      expect(r.cronograma[3]?.deudas).toHaveLength(1);
      expect(r.cronograma[3]?.pago.toFixed(2)).toBe("500.00");
    });
  });

  it("comparar informa la diferencia de intereses: 188,81 - 129,08", () => {
    const c = comparar(e);
    if (!c.ok) throw new Error(c.error.mensaje);
    expect(c.valor.ahorroAvalancha.toFixed(2)).toBe("59.73");
  });
});

describe("errores explícitos", () => {
  it("sin deudas", () => {
    const r = simular(entrada([], 100), "avalancha");
    expect(!r.ok && r.error.codigo).toBe("sin_deudas");
  });

  it("el monto no cubre los mínimos, e informa cuánto falta", () => {
    const r = simular(
      entrada(
        [
          { id: "a", nombre: "A", saldo: 1000, tna: 10, pagoMinimo: 100 },
          { id: "b", nombre: "B", saldo: 1000, tna: 10, pagoMinimo: 100 },
        ],
        150,
      ),
      "avalancha",
    );
    if (r.ok || r.error.codigo !== "fondos_insuficientes") throw new Error("debería fallar por fondos");
    expect(r.error.minimos.toFixed(2)).toBe("200.00");
    expect(r.error.faltante.toFixed(2)).toBe("50.00");
  });

  it("la deuda crece: 1000 al 240% genera 200 por mes y se pagan 100", () => {
    const r = simular(entrada([{ id: "a", nombre: "A", saldo: 1000, tna: 240, pagoMinimo: 100 }], 100), "avalancha");
    if (r.ok || r.error.codigo !== "deuda_no_baja") throw new Error("debería fallar porque no baja");
    expect(r.error.deudaIds).toEqual(["a"]);
    expect(r.error.mensaje).toContain("A");
  });

  it("el pago iguala justo al interés: 1000 al 120% genera 100 por mes", () => {
    const r = simular(entrada([{ id: "a", nombre: "A", saldo: 1000, tna: 120, pagoMinimo: 100 }], 100), "avalancha");
    expect(!r.ok && r.error.codigo).toBe("deuda_no_baja");
  });

  it("sin plata y sin mínimo tampoco baja", () => {
    const r = simular(entrada([{ id: "a", nombre: "A", saldo: 1000, tna: 0, pagoMinimo: 0 }], 0), "avalancha");
    expect(!r.ok && r.error.codigo).toBe("deuda_no_baja");
  });

  it("detecta el estancamiento aunque el mínimo alcance al principio", () => {
    // A genera 200 de interés por mes y no tiene mínimo; los 100 disponibles van a B. El total sube.
    const r = simular(
      entrada(
        [
          { id: "a", nombre: "A", saldo: 1000, tna: 240, pagoMinimo: 0 },
          { id: "b", nombre: "B", saldo: 100, tna: 0, pagoMinimo: 100 },
        ],
        100,
      ),
      "bola_de_nieve",
    );
    expect(!r.ok && r.error.codigo).toBe("deuda_no_baja");
  });

  it.each([
    ["saldo en cero", { saldo: 0 }],
    ["saldo negativo", { saldo: -1 }],
    ["TNA negativa", { tna: -1 }],
    ["mínimo negativo", { pagoMinimo: -1 }],
  ])("rechaza %s", (_nombre, cambio) => {
    const r = simular(entrada([{ id: "a", nombre: "A", saldo: 100, tna: 10, pagoMinimo: 10, ...cambio }], 100), "avalancha");
    expect(!r.ok && r.error.codigo).toBe("datos_invalidos");
  });

  it("rechaza un monto mensual negativo", () => {
    const r = simular(entrada([{ id: "a", nombre: "A", saldo: 100, tna: 10, pagoMinimo: 0 }], -1), "avalancha");
    expect(!r.ok && r.error.codigo).toBe("datos_invalidos");
  });
});

describe("casos borde", () => {
  it("una deuda menor al mínimo se paga por su saldo y no de más", () => {
    const r = correr(entrada([{ id: "a", nombre: "A", saldo: 50, tna: 0, pagoMinimo: 100 }], 100), "avalancha");
    expect(r.meses).toBe(1);
    expect(r.pagado.toFixed(2)).toBe("50.00");
  });

  it("el sobrante cae en cascada si cancela más de una el mismo mes", () => {
    const r = correr(
      entrada(
        [
          { id: "a", nombre: "A", saldo: 100, tna: 0, pagoMinimo: 10 },
          { id: "b", nombre: "B", saldo: 200, tna: 0, pagoMinimo: 10 },
          { id: "c", nombre: "C", saldo: 1000, tna: 0, pagoMinimo: 10 },
        ],
        400,
      ),
      "bola_de_nieve",
    );
    expect(r.cronograma[0]?.deudas.map((d) => d.saldoFinal.toFixed(2))).toEqual(["0.00", "0.00", "900.00"]);
    expect(r.deudas.map((d) => d.meses)).toEqual([1, 1, 4]);
  });

  it("empate en bola de nieve: va a la de mayor tasa", () => {
    const r = correr(
      entrada(
        [
          { id: "baja", nombre: "Baja", saldo: 100, tna: 10, pagoMinimo: 0 },
          { id: "alta", nombre: "Alta", saldo: 100, tna: 50, pagoMinimo: 0 },
        ],
        50,
      ),
      "bola_de_nieve",
    );
    expect(r.cronograma[0]?.deudas.find((d) => d.id === "alta")?.pago.toFixed(2)).toBe("50.00");
  });

  it("empate en avalancha: va a la de menor saldo", () => {
    const r = correr(
      entrada(
        [
          { id: "grande", nombre: "Grande", saldo: 500, tna: 50, pagoMinimo: 0 },
          { id: "chica", nombre: "Chica", saldo: 100, tna: 50, pagoMinimo: 0 },
        ],
        50,
      ),
      "avalancha",
    );
    expect(r.cronograma[0]?.deudas.find((d) => d.id === "chica")?.pago.toFixed(2)).toBe("50.00");
  });

  it("empate total: respeta el orden de carga", () => {
    const r = correr(
      entrada(
        [
          { id: "1", nombre: "Uno", saldo: 100, tna: 10, pagoMinimo: 0 },
          { id: "2", nombre: "Dos", saldo: 100, tna: 10, pagoMinimo: 0 },
        ],
        50,
      ),
      "avalancha",
    );
    expect(r.cronograma[0]?.deudas[0]?.pago.toFixed(2)).toBe("50.00");
    expect(r.cronograma[0]?.deudas[1]?.pago.toFixed(2)).toBe("0.00");
  });

  it("no acumula error de punto flotante", () => {
    const r = correr(entrada([{ id: "a", nombre: "A", saldo: "0.30", tna: 0, pagoMinimo: "0.10" }], "0.10"), "avalancha");
    expect(r.meses).toBe(3);
    expect(r.pagado.toFixed(2)).toBe("0.30");
  });

  it("todo lo pagado es saldo más intereses", () => {
    const r = correr(
      entrada(
        [
          { id: "a", nombre: "A", saldo: "123456.78", tna: "87.5", pagoMinimo: "9000" },
          { id: "b", nombre: "B", saldo: "54321.09", tna: "120", pagoMinimo: "6000" },
        ],
        "25000",
      ),
      "avalancha",
    );
    expect(r.pagado.toFixed(2)).toBe(r.intereses.plus("123456.78").plus("54321.09").toFixed(2));
  });
});
