import { describe, expect, it, vi } from "vitest";
import { emailPermitido } from "@/lib/auth/allowlist";
import { CATEGORIAS_INICIALES, inicializarUsuario, type AlmacenInicializacion } from "@/lib/auth/inicializar";

describe("emailPermitido", () => {
  it("acepta el email configurado sin importar mayúsculas ni espacios", () => {
    expect(emailPermitido("Yo@Gmail.com", " yo@gmail.com ")).toBe(true);
  });

  it("rechaza cualquier otro email", () => {
    expect(emailPermitido("otro@gmail.com", "yo@gmail.com")).toBe(false);
    expect(emailPermitido("yo@gmail.com.ar", "yo@gmail.com")).toBe(false);
  });

  it.each([undefined, "", "   "])("sin allowlist (%j) no entra nadie", (permitido) => {
    expect(emailPermitido("yo@gmail.com", permitido)).toBe(false);
    expect(emailPermitido(undefined, permitido)).toBe(false);
  });

  it("rechaza un usuario sin email", () => {
    expect(emailPermitido(null, "yo@gmail.com")).toBe(false);
    expect(emailPermitido(undefined, "yo@gmail.com")).toBe(false);
  });
});

function almacenFalso(existe: boolean) {
  const orden: string[] = [];
  const almacen: AlmacenInicializacion = {
    existeConfiguracion: vi.fn(async () => existe),
    crearCategorias: vi.fn(async () => {
      orden.push("categorias");
    }),
    crearConfiguracion: vi.fn(async () => {
      orden.push("configuracion");
    }),
  };
  return { almacen, orden };
}

describe("inicializarUsuario", () => {
  it("en el primer login crea categorías y después la configuración", async () => {
    const { almacen, orden } = almacenFalso(false);
    await inicializarUsuario(almacen);
    expect(orden).toEqual(["categorias", "configuracion"]);
    expect(almacen.crearCategorias).toHaveBeenCalledWith(CATEGORIAS_INICIALES);
  });

  it("en logins siguientes no toca nada", async () => {
    const { almacen, orden } = almacenFalso(true);
    await inicializarUsuario(almacen);
    expect(orden).toEqual([]);
  });

  it("si fallan las categorías no crea la configuración, para reintentar en el próximo login", async () => {
    const { almacen } = almacenFalso(false);
    vi.mocked(almacen.crearCategorias).mockRejectedValueOnce(new Error("sin conexión"));
    await expect(inicializarUsuario(almacen)).rejects.toThrow("sin conexión");
    expect(almacen.crearConfiguracion).not.toHaveBeenCalled();
  });
});

describe("CATEGORIAS_INICIALES", () => {
  it("no repite nombre y tipo, que es la clave única de la tabla", () => {
    const claves = CATEGORIAS_INICIALES.map((c) => `${c.tipo}:${c.nombre}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("todas las filas traen las mismas claves, porque el insert múltiple completa las faltantes con null", () => {
    for (const categoria of CATEGORIAS_INICIALES) {
      expect(Object.keys(categoria).sort()).toEqual(["excluye_totales", "nombre", "tipo"]);
    }
  });

  it("marca Cambio de moneda como excluida, en gasto y en ingreso", () => {
    const excluidas = CATEGORIAS_INICIALES.filter((c) => c.excluye_totales);
    expect(excluidas.map((c) => [c.nombre, c.tipo])).toEqual([
      ["Cambio de moneda", "gasto"],
      ["Cambio de moneda", "ingreso"],
    ]);
  });
});
