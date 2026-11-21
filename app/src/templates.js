// The six cover layouts. A layout is a list of panels in painter's order
// (first drawn is furthest back), each in fractions of the cover so the same
// layout works at every export size. A panel is a rectangle — optionally
// rotated around its centre and given a white snapshot border — or a
// polygon for the diagonal Slash. Photo panels name the editor slot whose
// picture they show; the Cover Lines rail also has a headlines panel, which
// the renderer fills with type instead of a picture.

const GUT = 0.012;

function rect(slot, x, y, w, h, extra = {}) {
  return { slot, kind: 'photo', rect: { x, y, w, h }, rotate: 0, border: 0, ...extra };
}

const LAYOUTS = {
  grid() {
    const w = (1 - GUT * 3) / 2;
    const h = (1 - GUT * 3) / 2;
    return [
      rect(0, GUT, GUT, w, h),
      rect(1, GUT * 2 + w, GUT, w, h),
      rect(2, GUT, GUT * 2 + h, w, h),
      rect(3, GUT * 2 + w, GUT * 2 + h, w, h),
    ];
  },

  'hero-three'() {
    const heroW = 0.6;
    const railX = heroW + GUT * 2;
    const railW = 1 - railX - GUT;
    const rowH = (1 - GUT * 4) / 3;
    return [
      rect(0, GUT, GUT, heroW - GUT, 1 - GUT * 2),
      rect(1, railX, GUT, railW, rowH),
      rect(2, railX, GUT * 2 + rowH, railW, rowH),
      rect(3, railX, GUT * 3 + rowH * 2, railW, rowH),
    ];
  },

  poster() {
    return [rect(0, 0, 0, 1, 1)];
  },

  snapshot() {
    return [
      { slot: 0, kind: 'backdrop', rect: { x: 0, y: 0, w: 1, h: 1 }, rotate: 0, border: 0 },
      rect(0, 0.07, 0.09, 0.66, 0.72, { rotate: -4, border: 0.035 }),
      rect(1, 0.6, 0.58, 0.35, 0.36, { rotate: 3.5, border: 0.05 }),
    ];
  },

  'cover-lines'() {
    const heroW = 0.6;
    const railX = heroW + GUT * 2;
    const railW = 1 - railX - GUT;
    const topH = 0.35;
    const linesH = 0.27;
    return [
      rect(0, GUT, GUT, heroW - GUT, 1 - GUT * 2),
      rect(1, railX, GUT, railW, topH),
      {
        slot: null,
        kind: 'headlines',
        rect: { x: railX, y: GUT * 2 + topH, w: railW, h: linesH },
        rotate: 0,
        border: 0,
      },
      rect(2, railX, GUT * 3 + topH + linesH, railW, 1 - (GUT * 3 + topH + linesH) - GUT),
    ];
  },

  slash() {
    return [
      { slot: 0, kind: 'photo', poly: [[0, 0], [1, 0], [0.58, 1], [0, 1]], rotate: 0, border: 0 },
      { slot: 1, kind: 'photo', poly: [[1, 0], [1, 1], [0.58, 1]], rotate: 0, border: 0 },
    ];
  },
};

/** The panel list for a template id. */
export function layout(templateId) {
  return (LAYOUTS[templateId] ?? LAYOUTS.grid)();
}

/** The distinct photo slots a template uses, in panel order. */
export function photoSlots(templateId) {
  const slots = [];
  for (const panel of layout(templateId)) {
    if (panel.kind === 'photo' && !slots.includes(panel.slot)) slots.push(panel.slot);
  }
  return slots;
}
