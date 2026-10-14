// Generates the PWA icons as PNG files, without any external dependency.
// The artwork is a stylized fuel pump drawn on a 64x64 grid.
// Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/icons");

const BACKGROUND = [15, 23, 42]; // slate-900
const BODY = [226, 232, 240]; // slate-200
const DISPLAY = [56, 189, 248]; // sky-400

/** Rectangles in a 64x64 grid: [x0, y0, x1, y1, color]. Draw order matters. */
const RECTS = [
  [18, 15, 40, 50, BODY], // pump body
  [23, 20, 35, 30, DISPLAY], // display
  [14, 48, 44, 54, BODY], // base
  [39, 22, 48, 26, BODY], // hose, horizontal
  [44, 22, 48, 44, BODY], // hose, vertical
  [45, 41, 53, 47, BODY], // nozzle
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLength = width * 4;
  const raw = Buffer.alloc((rowLength + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (rowLength + 1)] = 0; // filter: none
    pixels.copy(raw, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Draw the FuelMap icon: a stylized fuel pump. */
function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 64;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const gx = x / scale;
      const gy = y / scale;

      let color = BACKGROUND;
      for (const [x0, y0, x1, y1, rectColor] of RECTS) {
        if (gx >= x0 && gx < x1 && gy >= y0 && gy < y1) color = rectColor;
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }

  return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const size of [192, 512]) {
  writeFileSync(resolve(OUT_DIR, `icon-${size}.png`), drawIcon(size));
  console.log(`generated public/icons/icon-${size}.png`);
}

// Maskable icon: same artwork, full-bleed background.
writeFileSync(resolve(OUT_DIR, "icon-maskable-512.png"), drawIcon(512));
console.log("generated public/icons/icon-maskable-512.png");
