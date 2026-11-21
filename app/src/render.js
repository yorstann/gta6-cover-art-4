// The cover renderer: draws a whole cover (panels, finishes, lettering,
// badge, banner) onto any canvas at any size, so the editor preview and the
// three PNG exports are the same picture. Panel pictures are cropped into a
// panel-sized offscreen, colour graded there (cached — a grade is the only
// expensive step), then clipped into the layout. Lettering is Anton with
// four themes; the badge is a rotatable starburst; the banner is a strip
// along the foot that the caption politely moves up for.

import { applyGrade } from './grades.js';
import { layout } from './templates.js';
import { sceneCanvas } from './scenes.js';

const imageKeys = new WeakMap();
let nextImageKey = 1;

function imageKey(img) {
  if (!imageKeys.has(img)) imageKeys.set(img, nextImageKey++);
  return imageKeys.get(img);
}

/** Resolves a panel source string to a drawable image, or null. */
export function resolveSource(source, images) {
  const [kind, id] = source.split(':');
  if (kind === 'scene') return sceneCanvas(id);
  if (kind === 'photo') return images.photos.get(id) ?? null;
  if (kind === 'upload') return images.uploads[Number(id)] ?? null;
  return null;
}

const gradedCache = new Map();

/** Draws one panel's picture (cropped, zoomed, graded) into an offscreen. */
function panelPicture(img, pw, ph, panel, gradeId) {
  const key = [
    imageKey(img),
    gradeId,
    pw,
    ph,
    panel.zoom.toFixed(3),
    panel.ox.toFixed(3),
    panel.oy.toFixed(3),
  ].join('|');
  if (gradedCache.has(key)) return gradedCache.get(key);
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(pw));
  off.height = Math.max(1, Math.round(ph));
  const ctx = off.getContext('2d');
  const iw = img.naturalWidth ?? img.width;
  const ih = img.naturalHeight ?? img.height;
  const scale = Math.max(pw / iw, ph / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (pw - dw) * panel.ox, (ph - dh) * panel.oy, dw, dh);
  if (gradeId && gradeId !== 'raw') applyGrade(off, gradeId);
  if (gradedCache.size > 48) gradedCache.delete(gradedCache.keys().next().value);
  gradedCache.set(key, off);
  return off;
}

/** A path for a panel shape in cover pixels. */
function panelPath(ctx, panel, W, H) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([fx, fy], i) => {
      if (i === 0) ctx.moveTo(fx * W, fy * H);
      else ctx.lineTo(fx * W, fy * H);
    });
    ctx.closePath();
  } else {
    const { x, y, w, h } = panel.rect;
    ctx.rect(x * W, y * H, w * W, h * H);
  }
}

function drawPanel(ctx, panel, state, images, W, H) {
  const assignment = panel.slot === null ? null : state.panels[panel.slot];
  if (panel.kind === 'headlines') {
    drawHeadlines(ctx, panel, state, W, H);
    return;
  }
  const img = assignment ? resolveSource(assignment.source, images) : null;
  const gradeId = assignment && assignment.grade ? assignment.grade : state.grade;

  ctx.save();
  if (panel.rotate) {
    const cx = (panel.rect.x + panel.rect.w / 2) * W;
    const cy = (panel.rect.y + panel.rect.h / 2) * H;
    ctx.translate(cx, cy);
    ctx.rotate((panel.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  const px = panel.rect ? panel.rect.x * W : 0;
  const py = panel.rect ? panel.rect.y * H : 0;
  const pw = panel.rect ? panel.rect.w * W : W;
  const ph = panel.rect ? panel.rect.h * H : H;

  if (panel.border > 0) {
    const bw = panel.border * pw;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = H * 0.02;
    ctx.shadowOffsetY = H * 0.008;
    ctx.fillStyle = '#fdfdf8';
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    if (img) {
      const inner = panelPicture(img, pw - bw * 2, ph - bw * 2, assignment, gradeId);
      ctx.drawImage(inner, px + bw, py + bw);
    }
    ctx.restore();
    return;
  }

  panelPath(ctx, panel, W, H);
  ctx.clip();
  if (panel.kind === 'backdrop') {
    if (img) {
      ctx.save();
      ctx.filter = 'blur(14px) brightness(0.5) saturate(1.2)';
      const scale = Math.max(W / (img.naturalWidth ?? img.width), H / (img.naturalHeight ?? img.height)) * 1.08;
      const dw = (img.naturalWidth ?? img.width) * scale;
      const dh = (img.naturalHeight ?? img.height) * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
    }
  } else if (img) {
    if (panel.poly) {
      const xs = panel.poly.map(([fx]) => fx * W);
      const ys = panel.poly.map(([, fy]) => fy * H);
      const bx = Math.min(...xs);
      const by = Math.min(...ys);
      const bw = Math.max(...xs) - bx;
      const bh = Math.max(...ys) - by;
      ctx.drawImage(panelPicture(img, bw, bh, assignment, gradeId), bx, by);
    } else {
      ctx.drawImage(panelPicture(img, pw, ph, assignment, gradeId), px, py);
    }
  } else {
    ctx.fillStyle = '#241536';
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();

  // The Slash's diagonal seam gets a bright edge.
  if (panel.poly && panel.slot === 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, H * 0.004);
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(0.58 * W, H);
    ctx.stroke();
    ctx.restore();
  }
}

/** The Cover Lines rail panel: three headlines with rules, set in Anton. */
function drawHeadlines(ctx, panel, state, W, H) {
  const { x, y, w, h } = panel.rect;
  const px = x * W;
  const py = y * H;
  const pw = w * W;
  const ph = h * H;
  ctx.save();
  ctx.fillStyle = '#1d1030';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  const pad = pw * 0.07;
  const slotH = ph / state.headlines.length;
  ctx.textAlign = 'left';
  state.headlines.forEach((line, i) => {
    const top = py + slotH * i;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(px + pad, top + slotH * 0.1, pw * 0.16, Math.max(2, ph * 0.012));
    let size = slotH * 0.34;
    ctx.font = `${size}px Anton, sans-serif`;
    const words = line.toUpperCase().split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (ctx.measureText(trial).width > pw - pad * 2 && current) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    while (lines.length > 2 && size > 8) {
      size -= 1;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    // Baselines are placed so the glyph tops clear the kicker rule above
    // them and a second line still lands inside the slot.
    const firstBaseline = top + slotH * 0.3 + size * 0.78;
    ctx.fillStyle = '#fdfdf8';
    lines.slice(0, 2).forEach((text, j) => {
      ctx.fillText(text, px + pad, firstBaseline + j * size * 1.05, pw - pad * 2);
    });
    if (i < state.headlines.length - 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(px + pad, top + slotH - 1, pw - pad * 2, 1);
    }
  });
  ctx.restore();
}

// ------------------------------------------------------------------ finishes

let noisePattern = null;
let dotPattern = null;

function finishes(ctx, state, W, H) {
  const f = state.finish;
  if (f.sunburst > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.16 * f.sunburst + 0.02;
    ctx.fillStyle = '#ffffff';
    const cx = W * 0.82;
    const cy = H * 0.08;
    const R = Math.hypot(W, H);
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = a0 + Math.PI / 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (f.halftone > 0) {
    if (!dotPattern) {
      const p = document.createElement('canvas');
      p.width = 16;
      p.height = 16;
      const pctx = p.getContext('2d');
      pctx.fillStyle = '#000';
      pctx.beginPath();
      pctx.arc(4, 4, 3.2, 0, Math.PI * 2);
      pctx.arc(12, 12, 3.2, 0, Math.PI * 2);
      pctx.fill();
      dotPattern = p;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.35 * f.halftone;
    ctx.fillStyle = ctx.createPattern(dotPattern, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (f.grain > 0) {
    if (!noisePattern) {
      const n = document.createElement('canvas');
      n.width = 256;
      n.height = 256;
      const nctx = n.getContext('2d');
      const image = nctx.createImageData(256, 256);
      let a = 987654321;
      for (let i = 0; i < image.data.length; i += 4) {
        a = (Math.imul(a, 1103515245) + 12345) >>> 0;
        const v = (a >>> 16) & 0xff;
        image.data[i] = v;
        image.data[i + 1] = v;
        image.data[i + 2] = v;
        image.data[i + 3] = 255;
      }
      nctx.putImageData(image, 0, 0);
      noisePattern = n;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.05 + 0.13 * f.grain;
    ctx.fillStyle = ctx.createPattern(noisePattern, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (f.vignette > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, 'rgba(8, 2, 16, 0)');
    g.addColorStop(1, `rgba(8, 2, 16, ${0.52 * f.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ----------------------------------------------------------------- lettering

const THEMES = {
  blockbuster: { fill: '#ffffff', stroke: 'rgba(10, 4, 18, 0.9)', sub: '#ffd166', glow: null },
  'neon-sign': { fill: '#ff5da2', stroke: 'rgba(43, 0, 32, 0.85)', sub: '#7bf1ff', glow: '#ff2e88' },
  'gold-foil': { fill: null, stroke: 'rgba(66, 44, 0, 0.9)', sub: '#ffe9a8', glow: null },
  stencil: { fill: '#14100c', stroke: null, sub: '#14100c', glow: null, block: '#f5efe0' },
};

function fitFont(ctx, text, maxWidth, startSize, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px Anton, sans-serif`;
  }
  return size;
}

function lettering(ctx, state, W, H) {
  const theme = THEMES[state.lettering] ?? THEMES.blockbuster;
  const bannerH = state.banner.on ? H * 0.075 : 0;
  const caption = state.caption.trim().toUpperCase();
  const subtitle = state.subtitle.trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (subtitle) {
    const size = fitFont(ctx, subtitle, W * 0.8, H * 0.034);
    ctx.save();
    try {
      ctx.letterSpacing = `${Math.round(size * 0.32)}px`;
    } catch {
      /* older engines: no letter spacing, the words still read */
    }
    ctx.fillStyle = theme.sub;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.3;
    const subY = H - bannerH - H * 0.148;
    if (theme.block) {
      const w = ctx.measureText(subtitle).width + size * 1.4;
      ctx.fillStyle = theme.block;
      ctx.shadowBlur = 0;
      ctx.fillRect(W / 2 - w / 2, subY - size * 1.05, w, size * 1.5);
      ctx.fillStyle = theme.sub;
    }
    ctx.fillText(subtitle, W / 2, subY);
    ctx.restore();
  }
  if (!caption) return;
  const size = fitFont(ctx, caption, W * 0.92, H * 0.118);
  ctx.save();
  if (theme.glow) {
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = size * 0.4;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
  }
  if (theme.fill === null) {
    const g = ctx.createLinearGradient(0, H - bannerH - size * 1.3, 0, H - bannerH);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.5, '#d4a017');
    g.addColorStop(1, '#f9e29c');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = theme.fill;
  }
  const y = H - bannerH - H * 0.028;
  if (theme.block) {
    const w = ctx.measureText(caption).width + size * 0.9;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = theme.block;
    ctx.fillRect(W / 2 - w / 2, y - size * 1.08, w, size * 1.34);
    ctx.fillStyle = theme.fill;
  }
  if (theme.stroke) {
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = theme.stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(caption, W / 2, y);
  }
  ctx.fillText(caption, W / 2, y);
  if (theme.glow) ctx.fillText(caption, W / 2, y);
  ctx.restore();
}

// --------------------------------------------------------------------- badge

function starburstPath(ctx, cx, cy, rOuter, rInner, spikes) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function badge(ctx, state, W, H) {
  if (!state.badge.on) return;
  const cx = W * 0.845;
  const cy = H * 0.155;
  const R = H * 0.088;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((state.badge.rotation * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = H * 0.012;
  ctx.shadowOffsetY = H * 0.005;
  starburstPath(ctx, 0, 0, R, R * 0.8, 16);
  ctx.fillStyle = '#ff2e63';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(2, R * 0.045);
  ctx.strokeStyle = '#fdfdf8';
  ctx.stroke();
  const lines = state.badge.text.split('\n').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (lines.length > 0) {
    const widest = lines.reduce((a, b) => (a.length > b.length ? a : b));
    const size = fitFont(ctx, widest, R * 1.42, R * 0.52);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const totalH = lines.length * size * 1.02;
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, -totalH / 2 + size * (i + 0.82));
    });
  }
  ctx.restore();
}

function banner(ctx, state, W, H) {
  if (!state.banner.on) return;
  const bh = H * 0.075;
  ctx.save();
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(0, H - bh, W, bh);
  ctx.fillStyle = '#17110a';
  const text = state.banner.text.trim().toUpperCase();
  if (text) {
    const size = fitFont(ctx, text, W * 0.94, bh * 0.52);
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H - bh / 2 + size * 0.36);
  }
  ctx.restore();
}

// -------------------------------------------------------------------- render

/** Draws the whole cover described by `state` onto `canvas` at its size. */
export function renderCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);
  for (const panel of layout(state.template)) drawPanel(ctx, panel, state, images, W, H);
  finishes(ctx, state, W, H);
  lettering(ctx, state, W, H);
  badge(ctx, state, W, H);
  banner(ctx, state, W, H);
}

/** Renders the cover onto a fresh canvas of the given pixel size. */
export function renderToCanvas(state, images, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  renderCover(c, state, images);
  return c;
}
