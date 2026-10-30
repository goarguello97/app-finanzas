// Genera los íconos PNG de la PWA en public/icons. Correr con: npm run iconos
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const FONDO = "#17242b";
const TRAZO = "#e8eef0";
const ACENTO = "#7fc4bd";
const DIR = join(process.cwd(), "public", "icons");

/** Tres renglones de un libro contable. `escala` deja margen para la zona segura de los maskable. */
function svg(escala, radio) {
  const lado = 512;
  const ancho = 280 * escala;
  const alto = 44 * escala;
  const separacion = 76 * escala;
  const x = (lado - ancho) / 2;
  const y = (lado - alto) / 2;
  const fila = (dy, w, color) =>
    `<rect x="${x}" y="${y + dy}" width="${w}" height="${alto}" rx="${alto / 2}" fill="${color}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
    <rect width="${lado}" height="${lado}" rx="${radio}" fill="${FONDO}"/>
    ${fila(-separacion, ancho, TRAZO)}
    ${fila(0, ancho * 0.62, TRAZO)}
    ${fila(separacion, ancho * 0.82, ACENTO)}
  </svg>`;
}

const ICONOS = [
  { archivo: "favicon-32.png", tamano: 32, escala: 1.1, radio: 96 },
  { archivo: "apple-touch-icon.png", tamano: 180, escala: 1, radio: 0 },
  { archivo: "icon-192.png", tamano: 192, escala: 1, radio: 96 },
  { archivo: "icon-512.png", tamano: 512, escala: 1, radio: 96 },
  { archivo: "icon-maskable-512.png", tamano: 512, escala: 0.72, radio: 0 },
];

mkdirSync(DIR, { recursive: true });
for (const { archivo, tamano, escala, radio } of ICONOS) {
  await sharp(Buffer.from(svg(escala, radio))).resize(tamano, tamano).png().toFile(join(DIR, archivo));
  console.log(`public/icons/${archivo}`);
}
