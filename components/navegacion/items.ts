import {
  ArrowsDownUpIcon,
  CalendarDotsIcon,
  DotsThreeCircleIcon,
  GearSixIcon,
  HouseIcon,
  ReceiptIcon,
  TagIcon,
  TargetIcon,
  WalletIcon,
  type Icon,
} from "@phosphor-icons/react";

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  icono: Icon;
}

const INICIO: ItemNavegacion = { href: "/", etiqueta: "Inicio", icono: HouseIcon };
const MOVIMIENTOS: ItemNavegacion = { href: "/movimientos", etiqueta: "Movimientos", icono: ArrowsDownUpIcon };
const DEUDAS: ItemNavegacion = { href: "/deudas", etiqueta: "Deudas", icono: ReceiptIcon };
const METAS: ItemNavegacion = { href: "/metas", etiqueta: "Metas", icono: TargetIcon };
const CUOTAS: ItemNavegacion = { href: "/cuotas", etiqueta: "Cuotas", icono: CalendarDotsIcon };
const CUENTAS: ItemNavegacion = { href: "/cuentas", etiqueta: "Cuentas", icono: WalletIcon };
const CATEGORIAS: ItemNavegacion = { href: "/categorias", etiqueta: "Categorías", icono: TagIcon };
const AJUSTES: ItemNavegacion = { href: "/ajustes", etiqueta: "Ajustes", icono: GearSixIcon };
const MAS: ItemNavegacion = { href: "/mas", etiqueta: "Más", icono: DotsThreeCircleIcon };

/** Barra inferior en celular. */
export const NAVEGACION_MOVIL = [INICIO, MOVIMIENTOS, DEUDAS, METAS, MAS];

/** Lo que no entra en la barra inferior y se abre desde "Más". */
export const NAVEGACION_MAS = [CUENTAS, CATEGORIAS, CUOTAS, AJUSTES];

/** Barra lateral en escritorio. */
export const NAVEGACION_ESCRITORIO = [INICIO, MOVIMIENTOS, DEUDAS, CUOTAS, METAS, CUENTAS, CATEGORIAS, AJUSTES];

export function estaActivo(pathname: string, item: ItemNavegacion): boolean {
  if (item.href === "/") return pathname === "/";
  if (item === MAS) return NAVEGACION_MAS.some((i) => pathname.startsWith(i.href)) || pathname === MAS.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
