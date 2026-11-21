// Vice Frame 4's editor: wires the sidebar controls, the panel list and the
// canvas gestures (click to select, drag to reframe, scroll to zoom) to the
// state, and renders through render.js so the preview and the exported PNG
// are the same picture. A `?shot=` query instead builds a fixed state from
// the URL (./shots.js), renders it, and raises window.__shotReady.

import { FEATURES, byId } from './features.js';
import { renderCover, renderToCanvas, resolveSource } from './render.js';
import { layout, photoSlots } from './templates.js';
import { scenePhotoUrl } from './scenes.js';
import { createHistory, defaultState, applySurprise, SURPRISE_COMBOS } from './state.js';
import { stateFromQuery } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const images = { photos: new Map(), uploads: [] };
const history = createHistory(defaultState());
history.seed();
let selectedSlot = 0;
let lastSizeId = '';
let shotMode = false;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const state = () => history.state;

// ---------------------------------------------------------------- rendering

function render() {
  const size = byId(FEATURES.export_sizes, state().size);
  if (size.id !== lastSizeId) {
    canvas.width = size.width;
    canvas.height = size.height;
    lastSizeId = size.id;
  }
  renderCover(canvas, state(), images);
  drawSelection();
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
  $('export').textContent = `Export PNG ${size.width} × ${size.height}`;
}

function drawSelection() {
  if (shotMode || selectedSlot === null) return;
  const panel = layout(state().template).find((p) => p.kind === 'photo' && p.slot === selectedSlot);
  if (!panel || !panel.rect) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.save();
  if (panel.rotate) {
    const cx = (panel.rect.x + panel.rect.w / 2) * W;
    const cy = (panel.rect.y + panel.rect.h / 2) * H;
    ctx.translate(cx, cy);
    ctx.rotate((panel.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(3, H * 0.005);
  ctx.setLineDash([H * 0.016, H * 0.01]);
  ctx.strokeRect(panel.rect.x * W, panel.rect.y * H, panel.rect.w * W, panel.rect.h * H);
  ctx.restore();
}

function commit(label) {
  history.commit(label);
  render();
}

// ------------------------------------------------------------------ controls

function fillSelect(select, entries, value) {
  select.innerHTML = '';
  for (const entry of entries) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.name;
    select.appendChild(option);
  }
  select.value = value;
}

function sourceOptions(select, value) {
  select.innerHTML = '';
  const groups = [
    ['Illustrated scenes', FEATURES.scenes.filter((s) => s.kind === 'illustrated').map((s) => [`scene:${s.id}`, s.name])],
    ['Sample photos', FEATURES.scenes.filter((s) => s.kind === 'photo').map((s) => [`photo:${s.id}`, s.name])],
    ['Your photos', images.uploads.map((_, i) => [`upload:${i}`, `Your photo ${i + 1}`])],
  ];
  for (const [label, options] of groups) {
    if (options.length === 0) continue;
    const group = document.createElement('optgroup');
    group.label = label;
    for (const [v, name] of options) {
      const option = document.createElement('option');
      option.value = v;
      option.textContent = name;
      group.appendChild(option);
    }
    select.appendChild(group);
  }
  select.value = value;
}

function rebuildPanels() {
  const wrap = $('panels');
  wrap.innerHTML = '';
  for (const slot of photoSlots(state().template)) {
    const assignment = state().panels[slot];
    const row = document.createElement('div');
    row.className = 'panel-row' + (slot === selectedSlot ? ' selected' : '');
    row.dataset.slot = slot;
    row.innerHTML = `
      <h3>Panel ${slot + 1}</h3>
      <label>Picture <select class="p-source"></select></label>
      <label>Grade <select class="p-grade"></select></label>
      <label>Zoom <input class="p-zoom" type="range" min="0.5" max="3" step="0.05"></label>`;
    const source = row.querySelector('.p-source');
    const grade = row.querySelector('.p-grade');
    const zoom = row.querySelector('.p-zoom');
    sourceOptions(source, assignment.source);
    grade.innerHTML = '<option value="">Cover grade</option>';
    for (const g of FEATURES.grades) {
      const option = document.createElement('option');
      option.value = g.id;
      option.textContent = g.name;
      grade.appendChild(option);
    }
    grade.value = assignment.grade;
    zoom.value = assignment.zoom;
    source.addEventListener('change', () => {
      assignment.source = source.value;
      commit('source');
    });
    grade.addEventListener('change', () => {
      assignment.grade = grade.value;
      commit('pgrade');
      status.textContent = grade.value
        ? `Panel ${slot + 1} graded ${byId(FEATURES.grades, grade.value).name} on its own`
        : `Panel ${slot + 1} back to the cover grade`;
    });
    zoom.addEventListener('input', () => {
      assignment.zoom = Number(zoom.value);
      commit('zoom');
    });
    row.addEventListener('pointerdown', () => {
      selectedSlot = slot;
      rebuildPanels();
      render();
    });
    wrap.appendChild(row);
  }
}

/** Pushes the whole state into every control (undo, redo, surprise, shots). */
function syncControls() {
  const s = state();
  $('template').value = s.template;
  $('size').value = s.size;
  $('caption').value = s.caption;
  $('subtitle').value = s.subtitle;
  $('lettering').value = s.lettering;
  $('grade').value = s.grade;
  document.querySelectorAll('.headline').forEach((input) => {
    input.value = s.headlines[Number(input.dataset.i)] ?? '';
  });
  $('badge-on').checked = s.badge.on;
  const [line1 = '', line2 = ''] = s.badge.text.split('\n');
  $('badge-line-1').value = line1;
  $('badge-line-2').value = line2;
  $('badge-rotation').value = s.badge.rotation;
  $('banner-on').checked = s.banner.on;
  $('banner-text').value = s.banner.text;
  for (const key of ['sunburst', 'halftone', 'grain', 'vignette']) {
    $(`fin-${key}`).value = s.finish[key];
  }
  if (!photoSlots(s.template).includes(selectedSlot)) selectedSlot = photoSlots(s.template)[0] ?? 0;
  rebuildPanels();
}

function bindControls() {
  fillSelect($('template'), FEATURES.templates, state().template);
  fillSelect($('size'), FEATURES.export_sizes, state().size);
  fillSelect($('lettering'), FEATURES.lettering_themes, state().lettering);
  fillSelect($('grade'), FEATURES.grades, state().grade);

  $('template').addEventListener('change', (e) => {
    state().template = e.target.value;
    commit('template');
    syncControls();
    status.textContent = `Template: ${byId(FEATURES.templates, state().template).name}`;
  });
  $('size').addEventListener('change', (e) => {
    state().size = e.target.value;
    lastSizeId = '';
    commit('size');
  });
  $('caption').addEventListener('input', (e) => {
    state().caption = e.target.value;
    commit('caption');
  });
  $('subtitle').addEventListener('input', (e) => {
    state().subtitle = e.target.value;
    commit('subtitle');
  });
  $('lettering').addEventListener('change', (e) => {
    state().lettering = e.target.value;
    commit('lettering');
  });
  $('grade').addEventListener('change', (e) => {
    state().grade = e.target.value;
    commit('grade');
  });
  document.querySelectorAll('.headline').forEach((input) => {
    input.addEventListener('input', () => {
      state().headlines[Number(input.dataset.i)] = input.value;
      commit('headlines');
    });
  });
  $('badge-on').addEventListener('change', (e) => {
    state().badge.on = e.target.checked;
    commit('badge');
  });
  const badgeText = () => {
    state().badge.text = `${$('badge-line-1').value}\n${$('badge-line-2').value}`;
    commit('badgetext');
  };
  $('badge-line-1').addEventListener('input', badgeText);
  $('badge-line-2').addEventListener('input', badgeText);
  $('badge-rotation').addEventListener('input', (e) => {
    state().badge.rotation = Number(e.target.value);
    commit('badgetilt');
  });
  $('banner-on').addEventListener('change', (e) => {
    state().banner.on = e.target.checked;
    commit('banner');
  });
  $('banner-text').addEventListener('input', (e) => {
    state().banner.text = e.target.value;
    commit('bannertext');
  });
  for (const key of ['sunburst', 'halftone', 'grain', 'vignette']) {
    $(`fin-${key}`).addEventListener('input', (e) => {
      state().finish[key] = Number(e.target.value);
      commit(`fin-${key}`);
    });
  }

  $('upload').addEventListener('change', async (e) => {
    await addUploads(e.target.files);
    e.target.value = '';
  });
  const stage = $('stage');
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    await addUploads(e.dataTransfer.files);
  });

  $('surprise').addEventListener('click', () => {
    const combo = SURPRISE_COMBOS[Math.floor(Math.random() * SURPRISE_COMBOS.length)];
    applySurprise(state(), combo);
    commit('surprise');
    syncControls();
    status.textContent =
      `Surprise: ${byId(FEATURES.templates, combo.template).name} · ` +
      `${byId(FEATURES.grades, combo.grade).name} · ${byId(FEATURES.lettering_themes, combo.lettering).name}`;
  });
  $('undo').addEventListener('click', () => {
    if (history.undo()) {
      syncControls();
      render();
    }
  });
  $('redo').addEventListener('click', () => {
    if (history.redo()) {
      syncControls();
      render();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey ? history.redo() : history.undo()) {
        syncControls();
        render();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (history.redo()) {
        syncControls();
        render();
      }
    }
  });
  $('export').addEventListener('click', () => {
    const size = byId(FEATURES.export_sizes, state().size);
    const out = renderToCanvas(state(), images, size.width, size.height);
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-frame-4-${size.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status.textContent = `Saved vice-frame-4-${size.id}.png (${size.width} × ${size.height})`;
    }, 'image/png');
  });
}

async function addUploads(files) {
  const room = 8 - images.uploads.length;
  const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
  for (const file of list) {
    const img = await loadImage(URL.createObjectURL(file));
    images.uploads.push(img);
    const slot = selectedSlot ?? 0;
    state().panels[slot].source = `upload:${images.uploads.length - 1}`;
    status.textContent = `Added your photo ${images.uploads.length} — showing it in panel ${slot + 1}`;
  }
  if (list.length > 0) {
    commit('upload');
    syncControls();
  }
}

// ------------------------------------------------------------ canvas gestures

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const W = canvas.width;
  const H = canvas.height;
  const panels = layout(state().template);
  for (let i = panels.length - 1; i >= 0; i--) {
    const panel = panels[i];
    if (panel.kind !== 'photo') continue;
    if (panel.poly) {
      let inside = false;
      const pts = panel.poly.map(([fx, fy]) => [fx * W, fy * H]);
      for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        const [ax, ay] = pts[a];
        const [bx, by] = pts[b];
        if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
      }
      if (inside) return panel;
    } else {
      let px = x;
      let py = y;
      if (panel.rotate) {
        const cx = (panel.rect.x + panel.rect.w / 2) * W;
        const cy = (panel.rect.y + panel.rect.h / 2) * H;
        const a = (-panel.rotate * Math.PI) / 180;
        const dx = x - cx;
        const dy = y - cy;
        px = cx + dx * Math.cos(a) - dy * Math.sin(a);
        py = cy + dx * Math.sin(a) + dy * Math.cos(a);
      }
      if (
        px >= panel.rect.x * W &&
        px <= (panel.rect.x + panel.rect.w) * W &&
        py >= panel.rect.y * H &&
        py <= (panel.rect.y + panel.rect.h) * H
      ) {
        return panel;
      }
    }
  }
  return null;
}

let drag = null;

function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = canvasPoint(e);
    const panel = panelAt(x, y);
    if (!panel) return;
    selectedSlot = panel.slot;
    rebuildPanels();
    const assignment = state().panels[panel.slot];
    const img = resolveSource(assignment.source, images);
    const pw = (panel.rect ? panel.rect.w : 1) * canvas.width;
    const ph = (panel.rect ? panel.rect.h : 1) * canvas.height;
    let dw = pw;
    let dh = ph;
    if (img) {
      const iw = img.naturalWidth ?? img.width;
      const ih = img.naturalHeight ?? img.height;
      const scale = Math.max(pw / iw, ph / ih) * assignment.zoom;
      dw = iw * scale;
      dh = ih * scale;
    }
    drag = { slot: panel.slot, startX: x, startY: y, ox: assignment.ox, oy: assignment.oy, pw, ph, dw, dh };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { x, y } = canvasPoint(e);
    const assignment = state().panels[drag.slot];
    if (drag.dw !== drag.pw) assignment.ox = Math.min(1, Math.max(0, drag.ox + (x - drag.startX) / (drag.pw - drag.dw)));
    if (drag.dh !== drag.ph) assignment.oy = Math.min(1, Math.max(0, drag.oy + (y - drag.startY) / (drag.ph - drag.dh)));
    render();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag) history.commit('drag');
    drag = null;
    render();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const { x, y } = canvasPoint(e);
      const panel = panelAt(x, y);
      const slot = panel ? panel.slot : selectedSlot;
      if (slot === null || slot === undefined) return;
      selectedSlot = slot;
      const assignment = state().panels[slot];
      assignment.zoom = Math.min(3, Math.max(0.5, assignment.zoom * Math.exp(-e.deltaY * 0.0015)));
      commit('zoom');
    },
    { passive: false },
  );
}

// ---------------------------------------------------------------------- boot

for (const scene of FEATURES.scenes) {
  if (scene.kind === 'photo') images.photos.set(scene.id, await loadImage(scenePhotoUrl(scene.id)));
}

bindControls();
bindCanvas();

const params = new URLSearchParams(location.search);
const shotState = stateFromQuery(params);
if (shotState) {
  shotMode = true;
  history.set(shotState);
  if (params.get('shot') === 'cover') document.body.classList.add('shot-cover');
  syncControls();
  render();
  await document.fonts.load('100px Anton');
  await document.fonts.ready;
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
} else {
  syncControls();
  render();
  document.fonts.ready.then(() => render());
}

// A small handle for the click-through test (and curious consoles).
window.ViceFrame = { history, images, render, renderToCanvas, FEATURES };
