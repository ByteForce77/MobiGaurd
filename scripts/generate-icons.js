import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create clean, high-contrast MobiGuard Brand SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#065f46" />
    </linearGradient>
    <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <!-- App Background with Safe-Zone Padding -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="#1e293b" stroke-width="4" />

  <!-- Outer Protective Shield -->
  <path d="M256 76 L396 136 C396 270 336 376 256 428 C176 376 116 270 116 136 Z" 
        fill="url(#shieldGrad)" 
        stroke="#34d399" 
        stroke-width="10" 
        stroke-linejoin="round" />

  <!-- Shield Core Shield Inner -->
  <path d="M256 110 L366 158 C366 264 316 350 256 394 C196 350 146 264 146 158 Z" 
        fill="#042017" 
        opacity="0.85" />

  <!-- Central AI Neural / Mobile Guard Emblem -->
  <circle cx="256" cy="220" r="44" fill="url(#circuitGrad)" />
  <path d="M236 220 L250 234 L278 206" fill="none" stroke="#04121f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Connection Nodes (Neural Mesh) -->
  <circle cx="210" cy="164" r="9" fill="#38bdf8" />
  <circle cx="302" cy="164" r="9" fill="#38bdf8" />
  <circle cx="196" cy="286" r="9" fill="#34d399" />
  <circle cx="316" cy="286" r="9" fill="#34d399" />
  <circle cx="256" cy="336" r="11" fill="#10b981" />

  <!-- Circuit traces -->
  <line x1="210" y1="164" x2="236" y2="198" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
  <line x1="302" y1="164" x2="276" y2="198" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
  <line x1="236" y1="242" x2="196" y2="286" stroke="#34d399" stroke-width="4" stroke-linecap="round" />
  <line x1="276" y1="242" x2="316" y2="286" stroke="#34d399" stroke-width="4" stroke-linecap="round" />
  <line x1="256" y1="264" x2="256" y2="325" stroke="#10b981" stroke-width="5" stroke-linecap="round" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Function to generate a real, uncorrupted, valid PNG file directly in pure Node.js
function createSolidPng(width, height, isMaskable = false) {
  // Precompute scanlines: 1 filter byte (0 = None) + RGBA per pixel
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  // Colors
  const bgR = 4, bgG = 12, bgB = 24, bgA = 255;      // #040c18
  const emeraldR = 16, emeraldG = 185, emeraldB = 129, emeraldA = 255; // #10b981
  const blueR = 56, blueG = 189, blueB = 248, blueA = 255;   // #38bdf8
  const darkR = 2, darkG = 6, darkB = 23, darkA = 255;       // #020617

  const cx = width / 2;
  const cy = height / 2;
  const maxR = (width / 2) * (isMaskable ? 0.72 : 0.85);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Draw stylized shield shape
      const inShield = (Math.abs(dx) <= (maxR * 0.8) && dy >= -maxR * 0.7 && dy <= maxR * 0.7 - Math.abs(dx) * 0.6);
      const inCircle = dist <= maxR * 0.35;

      if (inCircle) {
        rawData[pxOffset] = blueR;
        rawData[pxOffset + 1] = blueG;
        rawData[pxOffset + 2] = blueB;
        rawData[pxOffset + 3] = blueA;
      } else if (inShield) {
        rawData[pxOffset] = emeraldR;
        rawData[pxOffset + 1] = emeraldG;
        rawData[pxOffset + 2] = emeraldB;
        rawData[pxOffset + 3] = emeraldA;
      } else {
        rawData[pxOffset] = bgR;
        rawData[pxOffset + 1] = bgG;
        rawData[pxOffset + 2] = bgB;
        rawData[pxOffset + 3] = bgA;
      }
    }
  }

  // Compress IDAT
  const idatData = zlib.deflateSync(rawData);

  // Build PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    // CRC32 calculation
    const toCrc = Buffer.concat([typeBuf, data]);
    const crc = crc32(toCrc);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table
  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
      crc32.table = table;
    }

    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', idatData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Write 192x192, 512x512, maskable 512x512, apple-touch-icon 180x180
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createSolidPng(64, 64, false));

console.log('Successfully generated all PWA & WebAPK compliant icons in public/');
