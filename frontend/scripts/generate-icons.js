#!/usr/bin/env node
/**
 * Generates public/icons/icon-192.png and icon-512.png using only Node.js built-ins.
 * Run once: node scripts/generate-icons.js
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  // Indigo background #6366f1
  const [bgR, bgG, bgB] = [99, 102, 241];
  const [fgR, fgG, fgB] = [255, 255, 255];

  const pad = Math.round(size * 0.18);
  const rectX = pad;
  const rectY = Math.round(size * 0.22);
  const rectW = size - pad * 2;
  const rectH = size - rectY - pad;
  const headerH = Math.round(rectH * 0.28);
  const radius = Math.round(size * 0.06);

  // Draw two small nubs at top of calendar
  const nubW = Math.round(size * 0.08);
  const nubH = Math.round(size * 0.1);
  const nub1X = rectX + Math.round(rectW * 0.25);
  const nub2X = rectX + Math.round(rectW * 0.65);
  const nubY = rectY - Math.round(nubH * 0.5);

  function inRoundRect(x, y, rx, ry, rw, rh, r) {
    if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
    const corners = [
      [rx + r, ry + r],
      [rx + rw - r, ry + r],
      [rx + r, ry + rh - r],
      [rx + rw - r, ry + rh - r],
    ];
    if (x < rx + r && y < ry + r) {
      const dx = x - corners[0][0], dy = y - corners[0][1];
      return dx * dx + dy * dy <= r * r;
    }
    if (x >= rx + rw - r && y < ry + r) {
      const dx = x - corners[1][0], dy = y - corners[1][1];
      return dx * dx + dy * dy <= r * r;
    }
    if (x < rx + r && y >= ry + rh - r) {
      const dx = x - corners[2][0], dy = y - corners[2][1];
      return dx * dx + dy * dy <= r * r;
    }
    if (x >= rx + rw - r && y >= ry + rh - r) {
      const dx = x - corners[3][0], dy = y - corners[3][1];
      return dx * dx + dy * dy <= r * r;
    }
    return true;
  }

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const off = row + 1 + x * 3;
      const inBody = inRoundRect(x, y, rectX, rectY, rectW, rectH, radius);
      const inHeader = inBody && y < rectY + headerH;
      const inNub1 = inRoundRect(x, y, nub1X, nubY, nubW, nubH, Math.round(nubW * 0.4));
      const inNub2 = inRoundRect(x, y, nub2X, nubY, nubW, nubH, Math.round(nubW * 0.4));

      let r, g, b;
      if (inNub1 || inNub2) {
        r = fgR; g = fgG; b = fgB;
      } else if (inHeader) {
        r = bgR; g = bgG; b = bgB;
      } else if (inBody) {
        r = fgR; g = fgG; b = fgB;
      } else {
        r = bgR; g = bgG; b = bgB;
      }
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192.png"), createPNG(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), createPNG(512));
console.log("Icons written to public/icons/");
