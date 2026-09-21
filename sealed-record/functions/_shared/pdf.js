// A small PDF writer: one embedded TrueType font, text, rules and filled
// rectangles. That is everything the sealed report needs — the QR code is
// drawn as rectangles, so no image encoding is involved.
//
// The font is embedded as a CID font with Identity-H encoding, which means
// text is written as glyph ids rather than characters. That is what lets the
// report print Arabic: the shaper picks the glyphs, this just places them.

import { loadFont } from './ttf.js';
import { toVisualOrder, PRESENTATION_TO_BASE } from './arabic.js';

const A4 = { width: 595.28, height: 841.89 };

const textEncoder = new TextEncoder();

async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const pdfString = (s) => `(${s.replace(/([\\()])/g, '\\$1')})`;

export function createDocument(fontBytes) {
  const font = loadFont(fontBytes);
  const usedGlyphs = new Set([0]);
  const glyphText = new Map();          // glyph id -> the text it stands for
  const pages = [];

  let current = null;

  const api = {
    page: A4,

    addPage() {
      current = { ops: [] };
      pages.push(current);
      return api;
    },

    /** Glyph ids for a string, shaped and in the order they are drawn. */
    glyphs(text) {
      return toVisualOrder(text).map((cp) => {
        const gid = font.glyphFor(cp);
        usedGlyphs.add(gid);
        if (!glyphText.has(gid)) glyphText.set(gid, PRESENTATION_TO_BASE.get(cp) ?? [cp]);
        return gid;
      });
    },

    widthOf(text, size) {
      return font.widthOf(api.glyphs(text), size);
    },

    /** Draw text with its left edge at x and its baseline at y. */
    text(value, { x, y, size = 10, color = [0, 0, 0], align = 'left', width = 0 } = {}) {
      const gids = api.glyphs(String(value ?? ''));
      if (gids.length === 0) return api;
      const drawn = font.widthOf(gids, size);
      let left = x;
      if (align === 'right') left = x + width - drawn;
      else if (align === 'center') left = x + (width - drawn) / 2;
      const hex = gids.map((g) => g.toString(16).padStart(4, '0')).join('');
      current.ops.push(
        `BT ${color.join(' ')} rg /F1 ${size} Tf 1 0 0 1 ${left.toFixed(2)} ${y.toFixed(2)} Tm <${hex}> Tj ET`,
      );
      return api;
    },

    rect(x, y, w, h, color = [0, 0, 0]) {
      current.ops.push(
        `${color.join(' ')} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
      );
      return api;
    },

    line(x1, y1, x2, y2, { color = [0.8, 0.8, 0.8], width = 0.5 } = {}) {
      current.ops.push(
        `${color.join(' ')} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
      );
      return api;
    },

    /** Draw a QR matrix as filled modules, `size` points across. */
    qr(matrix, x, y, size) {
      const module = size / matrix.length;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix.length; c++) {
          if (!matrix[r][c]) continue;
          // rows run down the page, PDF y runs up
          api.rect(x + c * module, y + size - (r + 1) * module, module, module, [0, 0, 0]);
        }
      }
      return api;
    },

    async toBytes({ title = 'Mirsad sealed record' } = {}) {
      const objects = [];
      const add = (body) => {
        objects.push(body);
        return objects.length;               // object numbers start at 1
      };

      const fontStream = await deflate(font.data);

      const contentIds = [];
      for (const page of pages) {
        const data = textEncoder.encode(page.ops.join('\n'));
        const packed = await deflate(data);
        contentIds.push(add({
          dict: `<< /Length ${packed.length} /Filter /FlateDecode >>`,
          stream: packed,
        }));
      }

      const fontFileId = add({
        dict: `<< /Length ${fontStream.length} /Filter /FlateDecode /Length1 ${font.data.length} >>`,
        stream: fontStream,
      });

      const scale = 1000 / font.unitsPerEm;
      const widths = [...usedGlyphs].sort((a, b) => a - b)
        .map((gid) => `${gid} [${Math.round(font.advance(gid) * scale)}]`)
        .join(' ');

      const descriptorId = add({
        dict: `<< /Type /FontDescriptor /FontName /Embedded /Flags 4 `
          + `/FontBBox [-1021 -463 1793 1232] /ItalicAngle 0 `
          + `/Ascent ${Math.round(font.ascender * scale)} /Descent ${Math.round(font.descender * scale)} `
          + `/CapHeight 700 /StemV 80 /FontFile2 ${fontFileId} 0 R >>`,
      });

      const cidFontId = add({
        dict: `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Embedded `
          + `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> `
          + `/FontDescriptor ${descriptorId} 0 R /DW 1000 /W [${widths}] /CIDToGIDMap /Identity >>`,
      });

      // without this the page draws correctly but copies out as nonsense, since
      // Identity-H writes glyph ids rather than characters
      const bfchar = [...glyphText]
        .filter(([gid]) => gid !== 0)
        .sort((a, b) => a[0] - b[0])
        .map(([gid, cps]) => `<${gid.toString(16).padStart(4, '0')}> `
          + `<${cps.map((cp) => cp.toString(16).padStart(4, '0')).join('')}>`);
      const blocks = [];
      for (let i = 0; i < bfchar.length; i += 100) {
        const chunk = bfchar.slice(i, i + 100);
        blocks.push(`${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar`);
      }
      const cmap = textEncoder.encode(`/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
${blocks.join('\n')}
endcmap
CMapName currentdict /CMap defineresource pop
end
end`);
      const packedCmap = await deflate(cmap);
      const toUnicodeId = add({
        dict: `<< /Length ${packedCmap.length} /Filter /FlateDecode >>`,
        stream: packedCmap,
      });

      const fontId = add({
        dict: `<< /Type /Font /Subtype /Type0 /BaseFont /Embedded `
          + `/Encoding /Identity-H /DescendantFonts [${cidFontId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`,
      });

      const pagesId = objects.length + pages.length + 1;
      const pageIds = pages.map((_, i) => add({
        dict: `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] `
          + `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`,
      }));

      add({ dict: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>` });
      const infoId = add({ dict: `<< /Title ${pdfString(title)} /Producer (Mirsad Sealed Record) >>` });
      const catalogId = add({ dict: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` });

      // serialise
      const chunks = [];
      let length = 0;
      const push = (bytes) => {
        const b = typeof bytes === 'string' ? textEncoder.encode(bytes) : bytes;
        chunks.push(b);
        length += b.length;
      };

      push('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
      const offsets = [];
      objects.forEach((object, i) => {
        offsets.push(length);
        push(`${i + 1} 0 obj\n${object.dict}\n`);
        if (object.stream) {
          push('stream\n');
          push(object.stream);
          push('\nendstream\n');
        }
        push('endobj\n');
      });

      const xref = length;
      push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
      for (const offset of offsets) push(`${String(offset).padStart(10, '0')} 00000 n \n`);
      push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n`);
      push(`startxref\n${xref}\n%%EOF\n`);

      const out = new Uint8Array(length);
      let at = 0;
      for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.length;
      }
      return out;
    },
  };

  return api;
}

export { A4 };
