export type Tecla = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "," | "borrar";

const MAX_ENTEROS = 12;
const MAX_DECIMALES = 2;

/** Aplica una tecla a lo escrito, en formato crudo: "1234,5". Ignora lo que dejaría un monto inválido. */
export function aplicarTecla(actual: string, tecla: Tecla): string {
  if (tecla === "borrar") return actual.slice(0, -1);

  const [enteros = "", decimales] = actual.split(",");

  if (tecla === ",") {
    if (decimales !== undefined) return actual;
    return `${enteros || "0"},`;
  }

  if (decimales !== undefined) {
    return decimales.length < MAX_DECIMALES ? actual + tecla : actual;
  }

  if (enteros === "0") return tecla;
  return enteros.length < MAX_ENTEROS ? actual + tecla : actual;
}

/** "1234,5" -> "1.234,5", manteniendo lo que falta escribir tal cual. */
export function mostrarEntrada(entrada: string): string {
  if (entrada === "") return "0";
  const [enteros = "0", decimales] = entrada.split(",");
  const conMiles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimales === undefined ? conMiles : `${conMiles},${decimales}`;
}
