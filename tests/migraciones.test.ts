import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { comoUsuario, crearDb, USUARIO_A, USUARIO_B } from "./helpers/db";

type Fila = Record<string, unknown>;

async function filas(db: PGlite, sql: string, params: unknown[] = []): Promise<Fila[]> {
  return (await db.query<Fila>(sql, params)).rows;
}

async function unaFila(db: PGlite, sql: string, params: unknown[] = []): Promise<Fila> {
  const [fila] = await filas(db, sql, params);
  if (!fila) throw new Error(`Sin filas: ${sql}`);
  return fila;
}

async function crearCuenta(db: PGlite, moneda = "ARS"): Promise<string> {
  const fila = await unaFila(db, "insert into public.cuentas (nombre, tipo, moneda) values ('Banco', 'banco', $1) returning id", [
    moneda,
  ]);
  return String(fila.id);
}

async function crearDeuda(db: PGlite, montoTotal = "1000.00", moneda = "ARS"): Promise<string> {
  const fila = await unaFila(
    db,
    "insert into public.deudas (tipo, acreedor, moneda, monto_total) values ('prestamo', 'Banco Nación', $1, $2) returning id",
    [moneda, montoTotal],
  );
  return String(fila.id);
}

describe("migraciones", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearDb();
  });

  it("usa dolarapp como exchange por defecto", async () => {
    await comoUsuario(db, USUARIO_A, async () => {
      const fila = await unaFila(db, "insert into public.configuracion default values returning exchange_cotizacion");
      expect(fila.exchange_cotizacion).toBe("dolarapp");
    });
  });

  it("aísla los datos de cada usuario con RLS", async () => {
    await comoUsuario(db, USUARIO_A, () => crearCuenta(db));
    await comoUsuario(db, USUARIO_B, async () => {
      expect(await filas(db, "select id from public.cuentas")).toHaveLength(0);
      expect(await filas(db, "select id from public.saldos_cuentas")).toHaveLength(0);
    });
  });

  it("no deja escribir cotizaciones a usuarios logueados, pero sí leerlas", async () => {
    await db.query("insert into public.cotizaciones (fuente, compra, venta) values ('dolarapp', 1656.31, 1650.79)");
    await comoUsuario(db, USUARIO_A, async () => {
      expect(await filas(db, "select fuente from public.cotizacion_actual")).toHaveLength(1);
      await expect(
        db.query("insert into public.cotizaciones (fuente, compra, venta) values ('otra', 1, 1)"),
      ).rejects.toThrow(/row-level security/);
    });
  });

  describe("resumen_mensual", () => {
    it("excluye categorías marcadas y mantiene las que no tienen categoría", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const cuenta = await crearCuenta(db);
        const cambio = await unaFila(
          db,
          "insert into public.categorias (nombre, tipo, excluye_totales) values ('Cambio de moneda', 'gasto', true) returning id",
        );
        const comida = await unaFila(db, "insert into public.categorias (nombre, tipo) values ('Comida', 'gasto') returning id");
        const insertar = "insert into public.movimientos (cuenta_id, categoria_id, tipo, monto, fecha) values ($1, $2, 'gasto', $3, '2026-10-15')";
        await db.query(insertar, [cuenta, cambio.id, "500000.00"]);
        await db.query(insertar, [cuenta, comida.id, "1500.50"]);
        await db.query(insertar, [cuenta, null, "250.25"]);

        const fila = await unaFila(db, "select total from public.resumen_mensual where tipo = 'gasto'");
        expect(fila.total).toBe("1750.75");
      });
    });

    it("el movimiento excluido sigue afectando el saldo de la cuenta", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const cuenta = await crearCuenta(db);
        const cambio = await unaFila(
          db,
          "insert into public.categorias (nombre, tipo, excluye_totales) values ('Cambio de moneda', 'gasto', true) returning id",
        );
        await db.query(
          "insert into public.movimientos (cuenta_id, categoria_id, tipo, monto, fecha) values ($1, $2, 'gasto', 100, '2026-10-15')",
          [cuenta, cambio.id],
        );
        const fila = await unaFila(db, "select saldo_actual from public.saldos_cuentas");
        expect(fila.saldo_actual).toBe("-100.00");
      });
    });

    it("extra_mensual hereda la exclusión", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        await db.query("insert into public.configuracion (ingreso_minimo) values (1000)");
        const cuenta = await crearCuenta(db);
        const cambio = await unaFila(
          db,
          "insert into public.categorias (nombre, tipo, excluye_totales) values ('Cambio de moneda', 'ingreso', true) returning id",
        );
        const insertar = "insert into public.movimientos (cuenta_id, categoria_id, tipo, monto, fecha) values ($1, $2, 'ingreso', $3, '2026-10-15')";
        await db.query(insertar, [cuenta, null, "1500.00"]);
        await db.query(insertar, [cuenta, cambio.id, "999999.00"]);

        const fila = await unaFila(db, "select ingresos, extra from public.extra_mensual");
        expect(fila.ingresos).toBe("1500.00");
        expect(fila.extra).toBe("500.00");
      });
    });
  });

  describe("registrar_pago_deuda", () => {
    const registrar = "select public.registrar_pago_deuda($1, $2, $3, $4, $5) as id";

    it("crea pago y movimiento, y el saldo descuenta solo capital", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const cuenta = await crearCuenta(db);
        const deuda = await crearDeuda(db);
        await db.query(registrar, [deuda, "150.00", "2026-10-15", "50.00", cuenta]);

        const saldo = await unaFila(db, "select pagado, interes_pagado, capital_pagado, pendiente from public.deudas_saldo");
        expect(saldo).toEqual({
          pagado: "150.00",
          interes_pagado: "50.00",
          capital_pagado: "100.00",
          pendiente: "900.00",
        });

        const movimiento = await unaFila(db, "select tipo, monto, fecha::text, nota from public.movimientos");
        expect(movimiento).toEqual({ tipo: "gasto", monto: "150.00", fecha: "2026-10-15", nota: "Pago a Banco Nación" });

        const pago = await unaFila(db, "select movimiento_id from public.pagos_deuda");
        expect(pago.movimiento_id).not.toBeNull();
      });
    });

    it("sin cuenta registra solo el pago", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const deuda = await crearDeuda(db);
        await db.query(registrar, [deuda, "100.00", "2026-10-15", "0", null]);

        expect(await filas(db, "select id from public.movimientos")).toHaveLength(0);
        expect(await filas(db, "select id from public.pagos_deuda")).toHaveLength(1);
      });
    });

    it("no deja nada guardado si el pago falla después de crear el movimiento", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const cuenta = await crearCuenta(db);
        const deuda = await crearDeuda(db);
        // Interés mayor al monto: falla el check de pagos_deuda, después de insertar el movimiento.
        await expect(db.query(registrar, [deuda, "100.00", "2026-10-15", "150.00", cuenta])).rejects.toThrow(
          /pagos_deuda_interes_valido/,
        );

        expect(await filas(db, "select id from public.movimientos")).toHaveLength(0);
        expect(await filas(db, "select id from public.pagos_deuda")).toHaveLength(0);
      });
    });

    it("rechaza pagar desde una cuenta de otra moneda", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const cuenta = await crearCuenta(db, "ARS");
        const deuda = await crearDeuda(db, "1000.00", "USD");
        await expect(db.query(registrar, [deuda, "100.00", "2026-10-15", "0", cuenta])).rejects.toThrow(
          /La cuenta está en ARS y la deuda en USD/,
        );
      });
    });

    it("marca saldada la deuda al cubrir el capital, no antes", async () => {
      await comoUsuario(db, USUARIO_A, async () => {
        const deuda = await crearDeuda(db, "100.00");
        await db.query(registrar, [deuda, "100.00", "2026-10-15", "30.00", null]);
        expect((await unaFila(db, "select estado from public.deudas")).estado).toBe("activa");

        await db.query(registrar, [deuda, "30.00", "2026-11-15", "0", null]);
        expect((await unaFila(db, "select estado from public.deudas")).estado).toBe("saldada");
      });
    });

    it("no permite pagar la deuda de otro usuario", async () => {
      const deuda = await comoUsuario(db, USUARIO_A, () => crearDeuda(db));
      await comoUsuario(db, USUARIO_B, async () => {
        await expect(db.query(registrar, [deuda, "10.00", "2026-10-15", "0", null])).rejects.toThrow(/La deuda no existe/);
      });
    });
  });
});
