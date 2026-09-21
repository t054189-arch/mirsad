// A QR encoder, byte mode, error correction level M.
//
// The seal layer has one QR code to draw — the verification URL on a printed
// report — so this is deliberately the smallest thing that does that job
// correctly, with no dependency to keep current. ISO/IEC 18004.

const TOTAL_CODEWORDS = [
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
];

// level M: [error correction codewords per block, group 1 blocks, group 2 blocks]
const EC_M = [
  [10, 1, 0], [16, 1, 0], [26, 1, 0], [18, 2, 0], [24, 2, 0],
  [16, 4, 0], [18, 4, 0], [22, 2, 2], [22, 3, 2], [26, 4, 1],
  [30, 1, 4], [22, 6, 2], [22, 8, 1], [24, 4, 5], [24, 5, 5],
  [28, 7, 3], [28, 10, 1], [26, 9, 4], [26, 3, 11], [26, 3, 13],
];

const ALIGNMENT = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
  [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
  [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
  [6, 34, 62, 90],
];

// GF(256), primitive polynomial 0x11d
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= mul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  // built lowest degree first; the division below wants the leading 1 in front
  return poly.reverse();
}

function ecCodewords(data, count) {
  const gen = generatorPoly(count);
  const rem = new Array(count).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.shift();
    rem.push(0);
    for (let i = 0; i < count; i++) rem[i] ^= mul(gen[i + 1], factor);
  }
  return rem;
}

function bitsFor(version, dataBytes) {
  const countBits = version < 10 ? 8 : 16;
  return 4 + countBits + dataBytes * 8;
}

function pickVersion(dataBytes) {
  for (let v = 1; v <= EC_M.length; v++) {
    const [ecPerBlock, g1, g2] = EC_M[v - 1];
    const dataCodewords = TOTAL_CODEWORDS[v - 1] - ecPerBlock * (g1 + g2);
    if (bitsFor(v, dataBytes) <= dataCodewords * 8) return v;
  }
  throw new Error(`payload of ${dataBytes} bytes is too long for this encoder`);
}

function codewords(text) {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  const [ecPerBlock, g1, g2] = EC_M[version - 1];
  const totalBlocks = g1 + g2;
  const dataCodewords = TOTAL_CODEWORDS[version - 1] - ecPerBlock * totalBlocks;

  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);                                   // byte mode
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  push(0, Math.min(4, dataCodewords * 8 - bits.length));   // terminator
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  for (let i = 0; data.length < dataCodewords; i++) data.push(i % 2 ? 0x11 : 0xec);

  // split into blocks; the group 2 blocks carry one data codeword more
  const shortLen = Math.floor(dataCodewords / totalBlocks);
  const blocks = [];
  let offset = 0;
  for (let i = 0; i < totalBlocks; i++) {
    const len = i < g1 ? shortLen : shortLen + 1;
    const block = data.slice(offset, offset + len);
    offset += len;
    blocks.push({ data: block, ec: ecCodewords(block, ecPerBlock) });
  }

  // interleave
  const out = [];
  for (let i = 0; i < shortLen + 1; i++) {
    for (const block of blocks) if (i < block.data.length) out.push(block.data[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) for (const block of blocks) out.push(block.ec[i]);

  return { version, codewords: out };
}

function blankMatrix(version) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const finder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const y = row + r;
        const x = col + c;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        const separator = r < 0 || r > 6 || c < 0 || c > 6;
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        modules[y][x] = !separator && (edge || core) ? 1 : 0;
        reserved[y][x] = true;
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {            // timing patterns
    const bit = i % 2 === 0 ? 1 : 0;
    modules[6][i] = bit; reserved[6][i] = true;
    modules[i][6] = bit; reserved[i][6] = true;
  }

  const aligns = ALIGNMENT[version];              // alignment patterns
  const first = aligns[0];
  const last = aligns[aligns.length - 1];
  for (const row of aligns) {
    for (const col of aligns) {
      // every combination except the three corners taken by the finders; the
      // ones sitting on a timing line are real and must be drawn
      if ((row === first && col === first)
        || (row === first && col === last)
        || (row === last && col === first)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const ring = Math.max(Math.abs(r), Math.abs(c));
          modules[row + r][col + c] = ring === 1 ? 0 : 1;
          reserved[row + r][col + c] = true;
        }
      }
    }
  }

  modules[size - 8][8] = 1;                       // dark module
  reserved[size - 8][8] = true;

  for (let i = 0; i < 9; i++) {                   // format information areas
    if (!reserved[8][i]) { reserved[8][i] = true; modules[8][i] = 0; }
    if (!reserved[i][8]) { reserved[i][8] = true; modules[i][8] = 0; }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true; modules[8][size - 1 - i] = 0;
    reserved[size - 1 - i][8] = true; modules[size - 1 - i][8] = 0;
  }

  if (version >= 7) {                             // version information areas
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true; modules[i][size - 11 + j] = 0;
        reserved[size - 11 + j][i] = true; modules[size - 11 + j][i] = 0;
      }
    }
  }

  return { size, modules, reserved };
}

function placeData(grid, data) {
  const { size, modules, reserved } = grid;
  let bit = 0;
  const next = () => {
    const byte = data[bit >> 3];
    const value = byte === undefined ? 0 : (byte >> (7 - (bit & 7))) & 1;
    bit++;
    return value;
  };

  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;                   // skip the vertical timing column
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (reserved[row][col]) continue;
        modules[row][col] = next();
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penalty(modules, size) {
  let score = 0;

  const runs = (get) => {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        if (get(a, b) === get(a, b - 1)) {
          run++;
        } else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  };
  runs((r, c) => modules[r][c]);
  runs((c, r) => modules[r][c]);

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        score += 3;
      }
    }
  }

  const pattern = [1, 0, 1, 1, 1, 0, 1];
  const light = [0, 0, 0, 0];
  const hasAt = (get, a, start, seq) => seq.every((v, i) => get(a, start + i) === v);
  for (const get of [(r, c) => modules[r][c], (c, r) => modules[r][c]]) {
    for (let a = 0; a < size; a++) {
      for (let b = 0; b <= size - 7; b++) {
        if (!hasAt(get, a, b, pattern)) continue;
        // 00001011101 and 10111010000 each count, so a run with light on both
        // sides is penalised twice
        if (b >= 4 && hasAt(get, a, b - 4, light)) score += 40;
        if (b + 11 <= size && hasAt(get, a, b + 7, light)) score += 40;
      }
    }
  }

  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += modules[r][c];
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

function formatBits(mask) {
  const data = (0b00 << 3) | mask;              // 00 = error correction level M
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((rem >> (i + 10)) & 1) rem ^= 0b10100110111 << i;
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function versionBits(version) {
  let rem = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((rem >> (i + 12)) & 1) rem ^= 0b1111100100101 << i;
  }
  return (version << 12) | rem;
}

/**
 * The QR modules for `text` as an array of rows of 0/1, no quiet zone.
 * `mask` pins the mask pattern instead of choosing the best scoring one; it is
 * there so the encoder can be compared against a reference implementation.
 */
export function qrMatrix(text, { mask: forcedMask = null } = {}) {
  const { version, codewords: data } = codewords(text);
  const grid = blankMatrix(version);
  placeData(grid, data);

  const { size, modules, reserved } = grid;
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    if (forcedMask !== null && mask !== forcedMask) continue;
    const candidate = modules.map((row, r) =>
      row.map((v, c) => (reserved[r][c] ? v : v ^ (MASKS[mask](r, c) ? 1 : 0))));

    const format = formatBits(mask);
    for (let i = 0; i < 15; i++) {
      const bit = (format >> i) & 1;
      // one copy wraps the top-left finder, low bits down column 8
      if (i < 6) candidate[i][8] = bit;
      else if (i === 6) candidate[7][8] = bit;
      else if (i === 7) candidate[8][8] = bit;
      else if (i === 8) candidate[8][7] = bit;
      else candidate[8][14 - i] = bit;
      // the second copy runs beside the other two finders
      if (i < 8) candidate[8][size - 1 - i] = bit;
      else candidate[size - 15 + i][8] = bit;
    }
    candidate[size - 8][8] = 1;

    if (version >= 7) {
      const bits = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = (bits >> i) & 1;
        candidate[Math.floor(i / 3)][size - 11 + (i % 3)] = bit;
        candidate[size - 11 + (i % 3)][Math.floor(i / 3)] = bit;
      }
    }

    const score = penalty(candidate, size);
    if (!best || score < best.score) best = { score, modules: candidate };
  }

  return best.modules;
}
