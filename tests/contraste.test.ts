import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

function tokensDe(selector: string): Record<string, string> {
  const inicio = css.indexOf(`${selector} {`);
  const bloque = css.slice(inicio, css.indexOf("}", inicio));
  const tokens: Record<string, string> = {};
  for (const [, nombre, valor] of bloque.matchAll(/--([a-z-]+):\s*(oklch\([^)]+\))/g)) {
    if (nombre && valor) tokens[nombre] = valor;
  }
  return tokens;
}

function canal(lineal: number): number {
  const acotado = Math.min(1, Math.max(0, lineal));
  return acotado;
}

/** OKLCH a luminancia relativa, pasando por sRGB lineal. */
function luminancia(color: string): number {
  const [l = 0, c = 0, h = 0] = color.replace(/oklch\(|\)/g, "").trim().split(/\s+/).map(Number);
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);

  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const r = canal(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp);
  const g = canal(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp);
  const az = canal(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp);

  return 0.2126 * r + 0.7152 * g + 0.0722 * az;
}

function contraste(a: string, b: string): number {
  const [mayor, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (mayor + 0.05) / (menor + 0.05);
}

const TEXTO: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["primary", "background"],
];

const SEMANTICOS = ["ingreso", "gasto", "deuda", "ahorro"];
const CONTROLES: [string, string][] = [
  ["input", "background"],
  ["input", "card"],
  ["ring", "background"],
];

describe.each([
  ["claro", ":root"],
  ["oscuro", ".dark"],
])("contraste en modo %s", (_modo, selector) => {
  const tokens = tokensDe(selector);
  const color = (nombre: string): string => {
    const valor = tokens[nombre];
    if (!valor) throw new Error(`Falta el token --${nombre}`);
    return valor;
  };

  it.each(TEXTO)("%s sobre %s llega a 4.5:1", (texto, fondo) => {
    expect(contraste(color(texto), color(fondo))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SEMANTICOS)("%s es legible como texto sobre fondo y superficie", (semantico) => {
    expect(contraste(color(semantico), color("background"))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(color(semantico), color("card"))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CONTROLES)("%s sobre %s llega a 3:1", (control, fondo) => {
    expect(contraste(color(control), color(fondo))).toBeGreaterThanOrEqual(3);
  });
});
