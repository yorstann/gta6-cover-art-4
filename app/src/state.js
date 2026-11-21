// The editor's state: one plain object the renderer reads and the controls
// write. Panel sources are strings — "scene:<id>" for an illustrated scene,
// "photo:<id>" for a bundled sample photo, "upload:<n>" for the visitor's
// own pictures. A panel's grade is "" to inherit the cover-wide grade, or a
// grade id of its own. History keeps deep copies so undo/redo never alias
// the live state.

export const MAX_PANELS = 4;

function panel(source) {
  return { source, grade: '', zoom: 1, ox: 0.5, oy: 0.5 };
}

export function defaultState() {
  return {
    template: 'grid',
    size: 'square',
    caption: 'Vice Frame',
    subtitle: 'Neon nights · palm heights',
    lettering: 'blockbuster',
    grade: 'sunset',
    headlines: ['Heist of the century', 'Palm Shores showdown', 'The getaway issue'],
    badge: { on: true, text: 'Vice\nFrame', rotation: -12 },
    banner: { on: false, text: 'Plus: the full city map inside' },
    finish: { sunburst: 0.45, halftone: 0.3, grain: 0.45, vignette: 0.55 },
    panels: [
      panel('scene:sunset-pier'),
      panel('scene:neon-boulevard'),
      panel('scene:beach-day'),
      panel('scene:palm-highway'),
    ],
  };
}

const clone = (value) => JSON.parse(JSON.stringify(value));

/** An undo/redo history over state snapshots, coalescing rapid repeats. */
export function createHistory(initial) {
  let past = [];
  let future = [];
  let current = clone(initial);
  let lastLabel = '';
  let lastTime = 0;
  return {
    get state() {
      return current;
    },
    /** Replaces the live state without recording (used by undo/redo). */
    set(state) {
      current = clone(state);
    },
    /**
     * Records the live state as a new step. Calls with the same label inside
     * 700 ms (a slider drag, fast typing) fold into the previous step.
     */
    commit(label = '') {
      const now = performance.now();
      if (label && label === lastLabel && now - lastTime < 700 && past.length > 0) {
        past[past.length - 1] = clone(current);
      } else {
        past.push(clone(current));
        if (past.length > 60) past.shift();
      }
      future = [];
      lastLabel = label;
      lastTime = now;
    },
    /** Seeds the history with the starting state as the first step. */
    seed() {
      past = [clone(current)];
      future = [];
    },
    undo() {
      if (past.length <= 1) return false;
      future.push(past.pop());
      current = clone(past[past.length - 1]);
      lastLabel = '';
      return true;
    },
    redo() {
      if (future.length === 0) return false;
      const next = future.pop();
      past.push(next);
      current = clone(next);
      lastLabel = '';
      return true;
    },
    canUndo() {
      return past.length > 1;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}

// ------------------------------------------------------------- Surprise me

/** Curated one-click combinations: layout, grade, lettering and scenes. */
export const SURPRISE_COMBOS = [
  { template: 'grid', grade: 'sunset', lettering: 'blockbuster', scenes: ['sunset-pier', 'beach-day', 'neon-boulevard', 'palm-highway'], panelGrades: { 1: 'neon-nights' } },
  { template: 'poster', grade: 'neon-nights', lettering: 'neon-sign', scenes: ['neon-boulevard'], panelGrades: {} },
  { template: 'hero-three', grade: 'golden-hour', lettering: 'gold-foil', scenes: ['downtown-dusk', 'sunset-pier', 'beach-day', 'palm-highway'], panelGrades: {} },
  { template: 'cover-lines', grade: 'sunset', lettering: 'blockbuster', scenes: ['palm-highway', 'sunset-pier', 'downtown-dusk'], panelGrades: { 2: 'golden-hour' } },
  { template: 'slash', grade: 'neon-nights', lettering: 'neon-sign', scenes: ['neon-boulevard', 'downtown-dusk'], panelGrades: {} },
  { template: 'snapshot', grade: 'miami-pastel', lettering: 'gold-foil', scenes: ['beach-day', 'sunset-pier'], panelGrades: {} },
  { template: 'grid', grade: 'noir', lettering: 'stencil', scenes: ['downtown-dusk', 'neon-boulevard', 'palm-highway', 'sunset-pier'], panelGrades: { 3: 'sunset' } },
  { template: 'poster', grade: 'golden-hour', lettering: 'blockbuster', scenes: ['sunset-pier'], panelGrades: {} },
  { template: 'hero-three', grade: 'miami-pastel', lettering: 'neon-sign', scenes: ['beach-day', 'neon-boulevard', 'sunset-pier', 'downtown-dusk'], panelGrades: { 1: 'neon-nights' } },
  { template: 'cover-lines', grade: 'neon-nights', lettering: 'neon-sign', scenes: ['downtown-dusk', 'neon-boulevard', 'beach-day'], panelGrades: {} },
];

/** Deals a curated combo into the state (in place) and returns the combo. */
export function applySurprise(state, combo, random = Math.random) {
  state.template = combo.template;
  state.grade = combo.grade;
  state.lettering = combo.lettering;
  combo.scenes.forEach((sceneId, i) => {
    if (state.panels[i]) state.panels[i].source = `scene:${sceneId}`;
  });
  for (const p of state.panels) p.grade = '';
  for (const [slot, grade] of Object.entries(combo.panelGrades)) {
    if (state.panels[Number(slot)]) state.panels[Number(slot)].grade = grade;
  }
  state.badge.rotation = Math.round(-30 + random() * 60);
  return combo;
}
