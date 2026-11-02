const ZONA = "America/Argentina/Buenos_Aires";
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Fecha de hoy en Buenos Aires como YYYY-MM-DD. El default de la base usa UTC y se adelanta a la noche. */
export function hoyBuenosAires(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

/** Corrimiento en días, para calcular ayer o ventanas de tiempo. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** "2026-10-30" -> "30/10/2026" */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** "Hoy", "Ayer" o dd/mm/aaaa. */
export function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, -1)) return "Ayer";
  return formatearFecha(fecha);
}

export function esMesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

export function rangoMes(mes: string): { desde: string; hasta: string } {
  const [anio = 0, nro = 1] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(anio, nro, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

export function sumarMeses(mes: string, cantidad: number): string {
  const [anio = 0, nro = 1] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(anio, nro - 1 + cantidad, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-10" -> "octubre de 2026" */
export function nombreMes(mes: string): string {
  const [anio, nro = 1] = mes.split("-");
  return `${MESES[Number(nro) - 1]} de ${anio}`;
}
