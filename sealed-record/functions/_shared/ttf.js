// Just enough TrueType to embed a font in a PDF and measure a string:
// the character map, the advance widths, and the units per em.

const u16 = (d, o) => (d[o] << 8) | d[o + 1];
const i16 = (d, o) => (u16(d, o) << 16) >> 16;
const u32 = (d, o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;

function tables(data) {
  const out = {};
  const count = u16(data, 4);
  for (let i = 0; i < count; i++) {
    const p = 12 + 16 * i;
    const tag = String.fromCharCode(data[p], data[p + 1], data[p + 2], data[p + 3]);
    out[tag] = { offset: u32(data, p + 8), length: u32(data, p + 12) };
  }
  return out;
}

function characterMap(data, offset) {
  const count = u16(data, offset + 2);
  let best = null;
  for (let i = 0; i < count; i++) {
    const p = offset + 4 + 8 * i;
    const platform = u16(data, p);
    const encoding = u16(data, p + 2);
    const sub = offset + u32(data, p + 4);
    const format = u16(data, sub);
    const unicode = (platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0;
    if (!unicode) continue;
    if (format === 12) return { format, sub };
    if (format === 4 && !best) best = { format, sub };
  }
  if (!best) throw new Error('no usable Unicode character map in this font');
  return best;
}

export function loadFont(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const t = tables(data);
  for (const need of ['head', 'hhea', 'hmtx', 'cmap', 'maxp']) {
    if (!t[need]) throw new Error(`font is missing the ${need} table`);
  }

  const unitsPerEm = u16(data, t.head.offset + 18);
  const indexToLocFormat = i16(data, t.head.offset + 50);
  const numGlyphs = u16(data, t.maxp.offset + 4);
  const numHMetrics = u16(data, t.hhea.offset + 34);
  const ascender = i16(data, t.hhea.offset + 4);
  const descender = i16(data, t.hhea.offset + 6);
  const cmap = characterMap(data, t.cmap.offset);

  const cache = new Map();

  function glyphFormat4(cp) {
    const sub = cmap.sub;
    if (cp > 0xffff) return 0;
    const segX2 = u16(data, sub + 6);
    const ends = sub + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    for (let s = 0; s < segX2; s += 2) {
      if (u16(data, ends + s) < cp) continue;
      const start = u16(data, starts + s);
      if (start > cp) return 0;
      const rangeOffset = u16(data, ranges + s);
      const delta = u16(data, deltas + s);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const g = u16(data, ranges + s + rangeOffset + 2 * (cp - start));
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  }

  function glyphFormat12(cp) {
    const sub = cmap.sub;
    const groups = u32(data, sub + 12);
    let lo = 0;
    let hi = groups - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const p = sub + 16 + 12 * mid;
      const start = u32(data, p);
      const end = u32(data, p + 4);
      if (cp < start) hi = mid - 1;
      else if (cp > end) lo = mid + 1;
      else return u32(data, p + 8) + (cp - start);
    }
    return 0;
  }

  /** Glyph id for a code point, or 0 when the font has no glyph for it. */
  function glyphFor(codePoint) {
    if (cache.has(codePoint)) return cache.get(codePoint);
    const gid = cmap.format === 12 ? glyphFormat12(codePoint) : glyphFormat4(codePoint);
    cache.set(codePoint, gid);
    return gid;
  }

  /** Advance width of a glyph, in font units. */
  function advance(gid) {
    const i = Math.min(gid, numHMetrics - 1);
    return u16(data, t.hmtx.offset + 4 * i);
  }

  return {
    data,
    unitsPerEm,
    numGlyphs,
    ascender,
    descender,
    indexToLocFormat,
    glyphFor,
    advance,
    /** Width of a run of glyph ids at a font size, in points. */
    widthOf(gids, size) {
      let total = 0;
      for (const gid of gids) total += advance(gid);
      return (total * size) / unitsPerEm;
    },
  };
}
