export interface CategoriaInicial {
  nombre: string;
  tipo: "ingreso" | "gasto";
  excluye_totales: boolean;
}

// En un insert múltiple, PostgREST completa con null las claves que falten en
// alguna fila: por eso todas las filas llevan excluye_totales.
const gasto = (nombre: string, excluye_totales = false): CategoriaInicial => ({ nombre, tipo: "gasto", excluye_totales });
const ingreso = (nombre: string, excluye_totales = false): CategoriaInicial => ({ nombre, tipo: "ingreso", excluye_totales });

export const CATEGORIAS_INICIALES: readonly CategoriaInicial[] = [
  gasto("Supermercado"),
  gasto("Comida afuera"),
  gasto("Transporte"),
  gasto("Alquiler y expensas"),
  gasto("Servicios"),
  gasto("Salud"),
  gasto("Salidas"),
  gasto("Ropa"),
  gasto("Educación"),
  gasto("Suscripciones"),
  gasto("Pago de deudas"),
  gasto("Otros gastos"),
  gasto("Cambio de moneda", true),
  ingreso("Retiro del negocio"),
  ingreso("Otros ingresos"),
  ingreso("Cambio de moneda", true),
];

export interface AlmacenInicializacion {
  existeConfiguracion(): Promise<boolean>;
  crearCategorias(categorias: readonly CategoriaInicial[]): Promise<void>;
  crearConfiguracion(): Promise<void>;
}

/**
 * Prepara la cuenta en el primer login. La existencia de la configuración marca
 * que ya se hizo: así las categorías que el usuario borre no vuelven a aparecer.
 * La configuración se crea al final para que un fallo a mitad se reintente completo.
 */
export async function inicializarUsuario(almacen: AlmacenInicializacion): Promise<void> {
  if (await almacen.existeConfiguracion()) return;
  await almacen.crearCategorias(CATEGORIAS_INICIALES);
  await almacen.crearConfiguracion();
}
