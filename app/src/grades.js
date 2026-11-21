// Colour grades, applied to a canvas in place. Each grade is a per-channel
// lookup table (contrast, lift and gain) followed by a split tone — shadows
// and highlights pulled toward different colours — and a saturation pass.
// The strong ones are deliberately poster-like: Neon Nights pushes shadows
// teal and highlights pink, Noir all but drains the colour, Miami Pastel
// lifts everything into a soft haze. Raw is the identity and costs nothing.

const DEFS = {
  raw: null,
  sunset: {
    gain: [1.1, 0.99, 0.86],
    lift: [10, 3, 0],
    contrast: 1.05,
    saturation: 1.22,
    shadowTint: [196, 44, 110],
    shadowStrength: 0.16,
    highlightTint: [255, 150, 70],
    highlightStrength: 0.14,
  },
  'neon-nights': {
    gain: [0.94, 1.02, 1.12],
    lift: [6, 10, 16],
    contrast: 1.08,
    saturation: 1.38,
    shadowTint: [18, 118, 140],
    shadowStrength: 0.22,
    highlightTint: [255, 60, 140],
    highlightStrength: 0.18,
  },
  'golden-hour': {
    gain: [1.13, 1.03, 0.82],
    lift: [12, 7, 0],
    contrast: 0.98,
    saturation: 1.12,
    shadowTint: [120, 70, 30],
    shadowStrength: 0.08,
    highlightTint: [255, 190, 90],
    highlightStrength: 0.2,
  },
  'miami-pastel': {
    gain: [1.04, 1.0, 1.04],
    lift: [26, 22, 26],
    contrast: 0.9,
    saturation: 0.88,
    shadowTint: [120, 220, 230],
    shadowStrength: 0.12,
    highlightTint: [255, 170, 200],
    highlightStrength: 0.12,
  },
  noir: {
    gain: [1.02, 1.0, 0.96],
    lift: [0, 0, 2],
    contrast: 1.22,
    saturation: 0.05,
    shadowTint: [10, 10, 14],
    shadowStrength: 0.1,
    highlightTint: [240, 235, 225],
    highlightStrength: 0.05,
  },
};

const lutCache = new Map();

/** Builds (and caches) the three 256-entry channel tables for a grade. */
function lutsFor(gradeId) {
  if (!lutCache.has(gradeId)) {
    const def = DEFS[gradeId];
    const tables = [0, 1, 2].map((channel) => {
      const table = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) {
        const contrasted = (v - 128) * def.contrast + 128;
        table[v] = contrasted * def.gain[channel] + def.lift[channel];
      }
      return table;
    });
    lutCache.set(gradeId, tables);
  }
  return lutCache.get(gradeId);
}

/** Grades `canvas` in place; the raw grade leaves it untouched. */
export function applyGrade(canvas, gradeId) {
  const def = DEFS[gradeId];
  if (!def) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const [lr, lg, lb] = lutsFor(gradeId);
  const sat = def.saturation;
  const [sr, sg, sb] = def.shadowTint;
  const [hr, hg, hb] = def.highlightTint;
  const ss = def.shadowStrength;
  const hs = def.highlightStrength;
  for (let i = 0; i < data.length; i += 4) {
    let r = lr[data[i]];
    let g = lg[data[i + 1]];
    let b = lb[data[i + 2]];
    const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const shadowW = (1 - luma) * (1 - luma) * ss;
    const highlightW = luma * luma * hs;
    r += (sr - r) * shadowW + (hr - r) * highlightW;
    g += (sg - g) * shadowW + (hg - g) * highlightW;
    b += (sb - b) * shadowW + (hb - b) * highlightW;
    const grey = r * 0.299 + g * 0.587 + b * 0.114;
    data[i] = grey + (r - grey) * sat;
    data[i + 1] = grey + (g - grey) * sat;
    data[i + 2] = grey + (b - grey) * sat;
  }
  ctx.putImageData(image, 0, 0);
}
