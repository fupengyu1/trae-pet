'use strict';
/**
 * 生成菜单栏宠物托盘图标（含透明通道的 PNG）。
 * 无第三方依赖，纯 Node 手写 PNG 编码。
 * 用法: node scripts/gen-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 32; // 图标边长

// 直接操作 buffer
function px(buf, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= S || y >= S || a <= 0) return;
  const i = (y * S + x) * 4;
  const da = buf[i + 3] / 255;
  const na = a / 255;
  const outA = na + da * (1 - na);
  if (outA <= 0) return;
  buf[i]     = Math.round((r * na + buf[i]     * da * (1 - na)) / outA);
  buf[i + 1] = Math.round((g * na + buf[i + 1] * da * (1 - na)) / outA);
  buf[i + 2] = Math.round((b * na + buf[i + 2] * da * (1 - na)) / outA);
  buf[i + 3] = Math.round(outA * 255);
}
function fillCircle(buf, cx, cy, rad, r, g, b, a) {
  for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rad * rad) px(buf, x, y, r, g, b, a);
    }
  }
}
function fillRect(buf, x0, y0, x1, y1, r, g, b, a) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(buf, x, y, r, g, b, a);
}

function encodePNG(rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = zlib.crc32 ? null : null;
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcInput) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8bit RGBA
  // 每行前加 filter byte 0
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function drawPet() {
  const buf = Buffer.alloc(S * S * 4);
  const cx = S / 2, cy = S / 2;
  const body = { r: 255, g: 214, b: 150 };  // 奶油橙
  const dark = { r: 60, g: 40, b: 25 };     // 深棕
  // 身体(圆)
  fillCircle(buf, cx, cy, S * 0.44, body.r, body.g, body.b, 255);
  // 耳朵
  fillCircle(buf, cx - S * 0.30, cy - S * 0.34, S * 0.16, body.r, body.g, body.b, 255);
  fillCircle(buf, cx + S * 0.30, cy - S * 0.34, S * 0.16, body.r, body.g, body.b, 255);
  // 腮红
  fillCircle(buf, cx - S * 0.26, cy + S * 0.06, S * 0.09, 255, 150, 150, 160);
  fillCircle(buf, cx + S * 0.26, cy + S * 0.06, S * 0.09, 255, 150, 150, 160);
  // 眼睛
  fillCircle(buf, cx - S * 0.16, cy - S * 0.06, S * 0.09, dark.r, dark.g, dark.b, 255);
  fillCircle(buf, cx + S * 0.16, cy - S * 0.06, S * 0.09, dark.r, dark.g, dark.b, 255);
  // 高光
  fillCircle(buf, cx - S * 0.18, cy - S * 0.10, S * 0.03, 255, 255, 255, 220);
  fillCircle(buf, cx + S * 0.14, cy - S * 0.10, S * 0.03, 255, 255, 255, 220);
  // 嘴(小笑脸弧 -> 用两段矩形近似)
  for (let a = 0; a <= 180; a += 6) {
    const rad = (a * Math.PI) / 180;
    const xr = cx + Math.cos(rad) * S * 0.10;
    const yr = cy + S * 0.12 + Math.sin(rad) * S * 0.06;
    px(buf, Math.round(xr), Math.round(yr), dark.r, dark.g, dark.b, 255);
  }
  return buf;
}

function main() {
  const out = path.join(__dirname, '..', 'assets');
  fs.mkdirSync(out, { recursive: true });
  const rgba = drawPet();
  fs.writeFileSync(path.join(out, 'pet-tray.png'), encodePNG(rgba));
  console.log('已生成 assets/pet-tray.png');
}
main();