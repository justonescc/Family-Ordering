/**
 * 生成 tabBar 图标（81x81 PNG，微信规范 ≤40KB/个）。
 * 零依赖：手写 PNG 编码（RGBA + zlib deflate）+ SDF 抗锯齿像素绘制。
 * 用法：npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 81;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'tabbar');

const COLORS = {
  normal: [122, 109, 97, 255], // #7a6d61
  active: [207, 77, 20, 255], // #cf4d14
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- 覆盖率（SDF）基元 ----------
function covRoundRect(px, py, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hw = (x1 - x0) / 2 - r;
  const hh = (y1 - y0) / 2 - r;
  const qx = Math.abs(px - cx) - hw;
  const qy = Math.abs(py - cy) - hh;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const d = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  return clamp(0.5 - d, 0, 1);
}

function covCircle(px, py, cx, cy, r) {
  return clamp(0.5 - (Math.hypot(px - cx, py - cy) - r), 0, 1);
}

function paint(canvas, coverage) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = coverage(x + 0.5, y + 0.5);
      const i = y * SIZE + x;
      canvas[i] = Math.max(canvas[i], clamp(c, 0, 1));
    }
  }
}

function cut(canvas, coverage) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      canvas[i] *= 1 - clamp(coverage(x + 0.5, y + 0.5), 0, 1);
    }
  }
}

// ---------- 图形 ----------
/** 菜单：碗（碗沿 + 半圆碗身） */
function glyphMenu() {
  const c = new Float32Array(SIZE * SIZE);
  paint(c, (px, py) => {
    const rim = covRoundRect(px, py, 10, 32, 71, 42, 5);
    const body = Math.min(covCircle(px, py, 40.5, 32, 29), clamp(py - 42.5, 0, 1));
    return Math.max(rim, body);
  });
  return c;
}

/** 我的单：单据（圆角纸 + 两条镂空横线） */
function glyphMine() {
  const c = new Float32Array(SIZE * SIZE);
  paint(c, (px, py) => covRoundRect(px, py, 19, 10, 62, 71, 8));
  cut(c, (px, py) => covRoundRect(px, py, 27, 27, 54, 33, 3));
  cut(c, (px, py) => covRoundRect(px, py, 27, 40, 54, 46, 3));
  cut(c, (px, py) => covRoundRect(px, py, 27, 53, 44, 59, 3));
  return c;
}

/** 总单：四宫格 */
function glyphSummary() {
  const c = new Float32Array(SIZE * SIZE);
  paint(c, (px, py) => {
    const g = (x0, y0, x1, y1) => covRoundRect(px, py, x0, y0, x1, y1, 6);
    return Math.max(
      g(11, 11, 39, 39),
      g(42, 11, 70, 39),
      g(11, 42, 39, 70),
      g(42, 42, 70, 70),
    );
  });
  return c;
}

/** 我的：人像（头 + 肩） */
function glyphMe() {
  const c = new Float32Array(SIZE * SIZE);
  paint(c, (px, py) => {
    const head = covCircle(px, py, 40.5, 26, 13);
    const body = Math.min(covCircle(px, py, 40.5, 62, 22), clamp(py - 50, 0, 1));
    return Math.max(head, body);
  });
  return c;
}

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(coverage, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < SIZE; x++) {
      const a = Math.round(clamp(coverage[y * SIZE + x], 0, 1) * 255);
      const o = y * (stride + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 输出 ----------
mkdirSync(OUT_DIR, { recursive: true });
const glyphs = { menu: glyphMenu, mine: glyphMine, summary: glyphSummary, me: glyphMe };
for (const [name, make] of Object.entries(glyphs)) {
  const coverage = make();
  for (const [variant, color] of Object.entries(COLORS)) {
    const file = join(OUT_DIR, variant === 'normal' ? `${name}.png` : `${name}-active.png`);
    writeFileSync(file, encodePNG(coverage, color));
    console.log('written', file);
  }
}
