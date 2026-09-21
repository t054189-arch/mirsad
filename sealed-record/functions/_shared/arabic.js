// Arabic for the PDF writer: contextual letter shaping and visual ordering.
//
// PDF has no text layout engine — it draws the glyphs it is given, left to
// right, in the order it is given them. So an Arabic name has to arrive here
// already shaped (each letter in its initial / medial / final / isolated form)
// and already reversed. Shaping goes through the Arabic Presentation Forms-B
// block, which any Arabic-capable font covers, so no OpenType GSUB is needed.

// base letter -> [first presentation form, number of forms]
// four forms run isolated, final, initial, medial; two run isolated, final.
const FORMS = new Map([
  [0x0621, [0xfe80, 1]], [0x0622, [0xfe81, 2]], [0x0623, [0xfe83, 2]],
  [0x0624, [0xfe85, 2]], [0x0625, [0xfe87, 2]], [0x0626, [0xfe89, 4]],
  [0x0627, [0xfe8d, 2]], [0x0628, [0xfe8f, 4]], [0x0629, [0xfe93, 2]],
  [0x062a, [0xfe95, 4]], [0x062b, [0xfe99, 4]], [0x062c, [0xfe9d, 4]],
  [0x062d, [0xfea1, 4]], [0x062e, [0xfea5, 4]], [0x062f, [0xfea9, 2]],
  [0x0630, [0xfeab, 2]], [0x0631, [0xfead, 2]], [0x0632, [0xfeaf, 2]],
  [0x0633, [0xfeb1, 4]], [0x0634, [0xfeb5, 4]], [0x0635, [0xfeb9, 4]],
  [0x0636, [0xfebd, 4]], [0x0637, [0xfec1, 4]], [0x0638, [0xfec5, 4]],
  [0x0639, [0xfec9, 4]], [0x063a, [0xfecd, 4]], [0x0641, [0xfed1, 4]],
  [0x0642, [0xfed5, 4]], [0x0643, [0xfed9, 4]], [0x0644, [0xfedd, 4]],
  [0x0645, [0xfee1, 4]], [0x0646, [0xfee5, 4]], [0x0647, [0xfee9, 4]],
  [0x0648, [0xfeed, 2]], [0x0649, [0xfeef, 2]], [0x064a, [0xfef1, 4]],
]);

// lam followed by one of the alefs is a required ligature
const LAM_ALEF = new Map([
  [0x0622, 0xfef5], [0x0623, 0xfef7], [0x0625, 0xfef9], [0x0627, 0xfefb],
]);

const TATWEEL = 0x0640;

const isTransparent = (cp) => (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670
  || (cp >= 0x06d6 && cp <= 0x06ed);

const isArabic = (cp) => (cp >= 0x0600 && cp <= 0x06ff)
  || (cp >= 0x0750 && cp <= 0x077f) || (cp >= 0xfb50 && cp <= 0xfeff);

// joins to the letter that follows it
const joinsForward = (cp) => cp === TATWEEL || (FORMS.get(cp) ?? [0, 0])[1] === 4;
// accepts a join from the letter before it
const joinsBackward = (cp) => cp === TATWEEL || (FORMS.get(cp) ?? [0, 0])[1] >= 2;

const isStrongLtr = (cp) => (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)
  || (cp >= 0xc0 && cp <= 0x24f);

/** Shape one Arabic run into presentation forms, still in logical order. */
function shapeRun(cps) {
  const out = [];
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];

    if (isTransparent(cp) || !FORMS.has(cp)) {
      out.push(cp);
      continue;
    }

    // look past any diacritics for the neighbours that decide the form
    let p = i - 1;
    while (p >= 0 && isTransparent(cps[p])) p--;
    let n = i + 1;
    while (n < cps.length && isTransparent(cps[n])) n++;

    const prev = p >= 0 ? cps[p] : 0;
    const next = n < cps.length ? cps[n] : 0;

    if (cp === 0x0644 && LAM_ALEF.has(next)) {
      const ligature = LAM_ALEF.get(next);
      out.push(joinsForward(prev) ? ligature + 1 : ligature);
      i = n;                                   // the alef is part of the ligature
      continue;
    }

    const [base, count] = FORMS.get(cp);
    const linkedBefore = joinsForward(prev) && joinsBackward(cp);
    const linkedAfter = count === 4 && (joinsBackward(next) || next === TATWEEL);

    let form = 0;                              // isolated
    if (linkedBefore && linkedAfter) form = 3; // medial
    else if (linkedBefore) form = 1;           // final
    else if (linkedAfter) form = 2;            // initial

    out.push(base + Math.min(form, count - 1));
  }
  return out;
}

/**
 * Shape `text` and put it in visual order, left to right, ready to be drawn.
 * Runs of Latin text and numbers inside an Arabic string keep their own
 * direction; this is the common case of a licence number in an Arabic name,
 * not a complete bidirectional algorithm.
 */
export function toVisualOrder(text) {
  const cps = [...text].map((ch) => ch.codePointAt(0));
  if (!cps.some(isArabic)) return cps;

  const rtlParagraph = (() => {
    for (const cp of cps) {
      if (isArabic(cp)) return true;
      if (isStrongLtr(cp)) return false;
    }
    return true;
  })();

  // split into directional runs, trailing neutrals going with the run before
  const runs = [];
  for (const cp of cps) {
    const arabic = isArabic(cp);
    const strong = arabic || isStrongLtr(cp);
    const last = runs[runs.length - 1];
    if (last && (!strong || last.rtl === arabic)) last.cps.push(cp);
    else runs.push({ rtl: arabic, cps: [cp] });
  }

  const laid = runs.map((run) => {
    if (!run.rtl) return run.cps;
    const shaped = shapeRun(run.cps);
    return shaped.reverse();
  });

  if (rtlParagraph) laid.reverse();
  return laid.flat();
}

/**
 * Presentation form -> the base letters it stands for, so a PDF can say what
 * its glyphs mean and stay searchable. The lam-alef ligatures map back to two
 * letters.
 */
export const PRESENTATION_TO_BASE = (() => {
  const map = new Map();
  for (const [base, [first, count]] of FORMS) {
    for (let i = 0; i < count; i++) map.set(first + i, [base]);
  }
  for (const [alef, ligature] of LAM_ALEF) {
    // the glyphs are drawn in visual order, so the pair this one stands for is
    // listed the same way round: alef first, then lam
    map.set(ligature, [alef, 0x0644]);
    map.set(ligature + 1, [alef, 0x0644]);
  }
  return map;
})();
