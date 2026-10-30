export interface CategoriaInicial {
  nombre: string;
  tipo: "ingreso" | "gasto";
  excluye_totales?: boolean;
}

export const CATEGORIAS_INICIALES: readonly CategoriaInicial[] = [
  { nombre: "Supermercado", tipo: "gasto" },
  { nombre: "Comida afuera", tipo: "gasto" },
  { nombre: "Transporte", tipo: "gasto" },
  { nombre: "Alquiler y expensas", tipo: "gasto" },
  { nombre: "Servicios", tipo: "gasto" },
  { nombre: "Salud", tipo: "gasto" },
  { nombre: "Salidas", tipo: "gasto" },
  { nombre: "Ropa", tipo: "gasto" },
  { nombre: "Educación", tipo: "gasto" },
  { nombre: "Suscripciones", tipo: "gasto" },
  { nombre: "Pago de deudas", tipo: "gasto" },
  { nombre: "Otros gastos", tipo: "gasto" },
  { nombre: "Cambio de moneda", tipo: "gasto", excluye_totales: true },
  { nombre: "Retiro del negocio", tipo: "ingreso" },
  { nombre: "Otros ingresos", tipo: "ingreso" },
  { nombre: "Cambio de moneda", tipo: "ingreso", excluye_totales: true },
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
