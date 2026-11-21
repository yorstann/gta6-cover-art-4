// The five illustrated scenes, painted procedurally on a 1920 x 1200 canvas
// the first time each is asked for, then cached. Every painter works in
// fractions of the canvas so the art is resolution independent, and every
// random choice comes from a seeded generator, so a scene renders byte for
// byte the same on every load (screenshots and exports stay reproducible).
// All places, signs and vehicles are invented for this app.

export const SCENE_WIDTH = 1920;
export const SCENE_HEIGHT = 1200;

/** A small deterministic random generator (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Fills the whole canvas with a vertical gradient of [stop, colour] pairs. */
function sky(ctx, W, H, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A sun disc with a soft halo. */
function sun(ctx, x, y, r, inner, outer) {
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.1);
  halo.addColorStop(0, inner);
  halo.addColorStop(0.35, outer);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 3.1, y - r * 3.1, r * 6.2, r * 6.2);
  const disc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  disc.addColorStop(0, '#fff3c4');
  disc.addColorStop(1, inner);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A rounded-rectangle path (not filled). */
function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** A palm tree silhouette: a curved trunk and a crown of fronds. */
function palm(ctx, x, y, s, colour, lean = 0.16) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * lean * 0.4, y - s * 0.6, x + s * lean, y - s);
  ctx.stroke();
  const tx = x + s * lean;
  const ty = y - s;
  ctx.lineWidth = s * 0.045;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = s * (0.42 + (i % 3) * 0.07);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.6,
      ty - Math.sin(a) * len * 0.75,
      tx + Math.cos(a) * len,
      ty - Math.sin(a) * len * 0.28 + s * 0.13,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(tx, ty + s * 0.02, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

/** A tower block with a seeded scatter of lit windows. */
function tower(ctx, rand, x, y, w, h, body, litColours, density = 0.34) {
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  const cols = Math.max(2, Math.floor(w / 34));
  const rows = Math.max(3, Math.floor(h / 44));
  const cw = w / cols;
  const ch = h / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rand() > density) continue;
      ctx.fillStyle = litColours[Math.floor(rand() * litColours.length)];
      ctx.globalAlpha = 0.55 + rand() * 0.45;
      ctx.fillRect(x + i * cw + cw * 0.28, y + j * ch + ch * 0.3, cw * 0.44, ch * 0.4);
    }
  }
  ctx.globalAlpha = 1;
}

/** A glowing dot with a halo, for bulbs, beacons and streetlights. */
function glowDot(ctx, x, y, r, colour) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- Sunset Pier

function paintSunsetPier(ctx, W, H) {
  const rand = rng(1201);
  sky(ctx, W, H, [
    [0, '#2e1a47'],
    [0.34, '#7b2d5b'],
    [0.55, '#e85d75'],
    [0.64, '#ffb347'],
    [1, '#3d1e4e'],
  ]);
  sun(ctx, W * 0.66, H * 0.585, W * 0.052, '#ff9e4f', 'rgba(255, 110, 90, 0.35)');
  // Cloud bands.
  ctx.fillStyle = 'rgba(46, 20, 66, 0.35)';
  for (const [cy, cw] of [[0.16, 0.34], [0.27, 0.22], [0.1, 0.18]]) {
    ctx.beginPath();
    ctx.ellipse(W * (0.2 + rand() * 0.5), H * cy, W * cw, H * 0.016, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sea.
  const sea = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.86);
  sea.addColorStop(0, '#c94f6d');
  sea.addColorStop(1, '#46235c');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.62, W, H * 0.24);
  // Sun glitter path on the water.
  for (let i = 0; i < 90; i++) {
    const y = H * 0.63 + rand() * H * 0.21;
    const spread = (y - H * 0.62) * 1.4 + W * 0.012;
    const x = W * 0.66 + (rand() - 0.5) * spread;
    ctx.fillStyle = `rgba(255, ${170 + Math.floor(rand() * 60)}, 90, ${0.25 + rand() * 0.5})`;
    ctx.fillRect(x, y, W * (0.008 + rand() * 0.02), 2.4);
  }
  // Pier deck: a trapezoid of planks running to the horizon.
  const deck = ctx.createLinearGradient(0, H * 0.84, 0, H);
  deck.addColorStop(0, '#4a2b3a');
  deck.addColorStop(1, '#241423');
  ctx.fillStyle = deck;
  ctx.beginPath();
  ctx.moveTo(W * 0.16, H * 0.845);
  ctx.lineTo(W * 0.84, H * 0.845);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 170, 120, 0.20)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    ctx.beginPath();
    ctx.moveTo(W * (0.16 + 0.68 * t), H * 0.845);
    ctx.lineTo(W * t, H);
    ctx.stroke();
  }
  for (let i = 1; i < 5; i++) {
    const y = H * (0.845 + (i / 5) * 0.155 * (0.4 + i / 5));
    ctx.beginPath();
    ctx.moveTo(W * 0.1, y);
    ctx.lineTo(W * 0.9, y);
    ctx.stroke();
  }
  // Festoon posts and two swags of bulbs.
  ctx.fillStyle = '#1d1024';
  for (const px of [0.055, 0.5, 0.945]) ctx.fillRect(W * px - 5, H * 0.33, 10, H * 0.53);
  const bulbColours = ['#ffd166', '#ff7b9c', '#7bf1ff', '#ffe9a8'];
  for (const [x0, x1] of [[0.055, 0.5], [0.5, 0.945]]) {
    const sag = H * 0.13;
    const top = H * 0.335;
    ctx.strokeStyle = 'rgba(10, 6, 18, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W * x0, top);
    ctx.quadraticCurveTo(W * ((x0 + x1) / 2), top + sag * 2, W * x1, top);
    ctx.stroke();
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      const x = W * (x0 + (x1 - x0) * t);
      const y = top + sag * 2 * 2 * t * (1 - t) * 0.5 + Math.sin(t * Math.PI) * 0; // on the quad curve
      const qy = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * (top + sag * 2) + t * t * top;
      void y;
      glowDot(ctx, x, qy + 12, 7, bulbColours[i % bulbColours.length]);
    }
  }
  // Lowrider resting on the deck, rim-lit by the sunset.
  const carX = W * 0.185;
  const carY = H * 0.845;
  const carW = W * 0.27;
  const carH = H * 0.085;
  ctx.fillStyle = '#22102e';
  rr(ctx, carX, carY - carH, carW, carH * 0.72, 26);
  ctx.fill();
  rr(ctx, carX + carW * 0.18, carY - carH * 1.52, carW * 0.52, carH * 0.62, 22);
  ctx.fill();
  ctx.fillStyle = 'rgba(140, 200, 235, 0.5)';
  rr(ctx, carX + carW * 0.24, carY - carH * 1.42, carW * 0.4, carH * 0.42, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(carX + 6, carY - carH * 0.98);
  ctx.lineTo(carX + carW * 0.2, carY - carH * 1.5);
  ctx.lineTo(carX + carW * 0.72, carY - carH * 1.5);
  ctx.stroke();
  for (const wx of [carX + carW * 0.2, carX + carW * 0.8]) {
    ctx.fillStyle = '#0d0812';
    ctx.beginPath();
    ctx.arc(wx, carY - carH * 0.1, carH * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5efe0';
    ctx.beginPath();
    ctx.arc(wx, carY - carH * 0.1, carH * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9334e';
    ctx.beginPath();
    ctx.arc(wx, carY - carH * 0.1, carH * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  palm(ctx, W * 0.035, H * 0.88, H * 0.34, '#1d1024', 0.22);
  palm(ctx, W * 0.975, H * 0.9, H * 0.4, '#1d1024', -0.2);
}

// ------------------------------------------------------------ Neon Boulevard

function neonSign(ctx, x, y, w, h, text, colour, vertical = false) {
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = 34;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (vertical) {
    ctx.font = `bold ${w * 0.52}px sans-serif`;
    [...text].forEach((ch, i) => ctx.fillText(ch, x + w / 2, y + (h / (text.length + 1)) * (i + 1)));
  } else {
    ctx.font = `bold ${h * 0.52}px sans-serif`;
    ctx.fillText(text, x + w / 2, y + h / 2 + 2);
  }
  ctx.restore();
}

function paintNeonBoulevard(ctx, W, H) {
  const rand = rng(2202);
  sky(ctx, W, H, [
    [0, '#070b26'],
    [0.5, '#160f31'],
    [1, '#241239'],
  ]);
  ctx.fillStyle = '#e8ecff';
  for (let i = 0; i < 130; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillRect(rand() * W, rand() * H * 0.4, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Facades.
  tower(ctx, rand, W * 0.0, H * 0.06, W * 0.21, H * 0.8, '#131033', ['#7bf1ff', '#ffd166', '#2a2a55'], 0.3);
  tower(ctx, rand, W * 0.21, H * 0.16, W * 0.1, H * 0.7, '#0f0c2a', ['#ff7b9c', '#7bf1ff'], 0.26);
  tower(ctx, rand, W * 0.7, H * 0.12, W * 0.11, H * 0.74, '#0f0c2a', ['#ffd166', '#7bf1ff'], 0.26);
  tower(ctx, rand, W * 0.81, H * 0.04, W * 0.19, H * 0.82, '#131033', ['#ff7b9c', '#ffd166', '#2a2a55'], 0.3);
  // Street.
  const street = ctx.createLinearGradient(0, H * 0.6, 0, H);
  street.addColorStop(0, '#141126');
  street.addColorStop(1, '#1e1836');
  ctx.fillStyle = street;
  ctx.beginPath();
  ctx.moveTo(W * 0.31, H * 0.86);
  ctx.lineTo(W * 0.7, H * 0.86);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0d0b1e';
  ctx.fillRect(0, H * 0.86, W, H * 0.005);
  // Wet reflections of the signs.
  for (const [rx, colour] of [[0.1, '#ff2e88'], [0.24, '#22d3ee'], [0.78, '#ffd166'], [0.9, '#ff2e88']]) {
    const g = ctx.createLinearGradient(0, H * 0.87, 0, H);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.28;
    for (let i = 0; i < 7; i++) ctx.fillRect(W * rx + (rand() - 0.5) * W * 0.02, H * 0.87, W * 0.008, H * 0.13);
    ctx.globalAlpha = 1;
  }
  // Signs.
  neonSign(ctx, W * 0.035, H * 0.1, W * 0.055, H * 0.44, 'HOTEL', '#ff2e88', true);
  neonSign(ctx, W * 0.225, H * 0.22, W * 0.07, H * 0.3, 'BAR', '#22d3ee', true);
  neonSign(ctx, W * 0.715, H * 0.18, W * 0.07, H * 0.36, 'VICE', '#ffd166', true);
  neonSign(ctx, W * 0.845, H * 0.08, W * 0.12, H * 0.09, 'DISCO', '#ff7b9c');
  neonSign(ctx, W * 0.1, H * 0.62, W * 0.1, H * 0.07, '24H', '#7bf1ff');
  neonSign(ctx, W * 0.8, H * 0.66, W * 0.11, H * 0.07, 'DINER', '#ffd166');
  // Streetlights.
  for (const [lx, ly, s] of [[0.33, 0.6, 1], [0.67, 0.6, 1], [0.2, 0.78, 1.6], [0.8, 0.78, 1.6]]) {
    glowDot(ctx, W * lx, H * ly, 9 * s, 'rgba(160, 220, 255, 0.9)');
  }
  // Taxi, seen from behind, tail lights on.
  const tx = W * 0.415;
  const ty = H * 0.9;
  const tw = W * 0.17;
  const th = H * 0.115;
  ctx.fillStyle = '#f7b500';
  rr(ctx, tx, ty - th, tw, th * 0.78, 30);
  ctx.fill();
  rr(ctx, tx + tw * 0.16, ty - th * 1.62, tw * 0.68, th * 0.72, 24);
  ctx.fill();
  ctx.fillStyle = '#18222e';
  rr(ctx, tx + tw * 0.22, ty - th * 1.52, tw * 0.56, th * 0.52, 12);
  ctx.fill();
  ctx.fillStyle = '#111';
  for (let i = 0; i < 8; i++) ctx.fillRect(tx + (tw / 8) * i + 3, ty - th * 0.52, tw / 16, th * 0.16);
  for (let i = 0; i < 8; i++) ctx.fillRect(tx + (tw / 8) * i + 3, ty - th * 0.34, tw / 16, th * 0.16);
  ctx.fillStyle = '#fff3f8';
  rr(ctx, tx + tw * 0.36, ty - th * 1.86, tw * 0.28, th * 0.3, 8);
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.font = `bold ${th * 0.24}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('TAXI', tx + tw / 2, ty - th * 1.68);
  for (const lx of [tx + tw * 0.08, tx + tw * 0.92]) glowDot(ctx, lx, ty - th * 0.3, 10, 'rgba(255, 46, 60, 0.95)');
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(tx + tw / 2, ty + th * 0.06, tw * 0.55, th * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ----------------------------------------------------------------- Beach Day

function paintBeachDay(ctx, W, H) {
  const rand = rng(3303);
  sky(ctx, W, H, [
    [0, '#5fb6dd'],
    [0.3, '#a8dcf2'],
    [0.45, '#eafaff'],
    [1, '#fdf3d0'],
  ]);
  sun(ctx, W * 0.84, H * 0.13, W * 0.03, '#ffd94d', 'rgba(255, 214, 90, 0.4)');
  // Clouds.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  for (const [cx, cy, s] of [[0.18, 0.12, 1], [0.55, 0.08, 0.7], [0.36, 0.2, 0.55]]) {
    for (const [ox, oy, r] of [[0, 0, 46], [52, 8, 36], [-54, 10, 32], [10, -18, 34]]) {
      ctx.beginPath();
      ctx.arc(W * cx + ox * s, H * cy + oy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Sea.
  const sea = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.72);
  sea.addColorStop(0, '#2fc4ce');
  sea.addColorStop(1, '#0b7f96');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.42, W, H * 0.3);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = H * 0.44 + rand() * H * 0.25;
    const x = rand() * W;
    ctx.beginPath();
    ctx.arc(x, y, 14 + rand() * 30, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  // Sand.
  const sand = ctx.createLinearGradient(0, H * 0.72, 0, H);
  sand.addColorStop(0, '#f7dd96');
  sand.addColorStop(1, '#eec26e');
  ctx.fillStyle = sand;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  ctx.fillStyle = 'rgba(190, 140, 60, 0.35)';
  for (let i = 0; i < 260; i++) ctx.fillRect(rand() * W, H * 0.73 + rand() * H * 0.26, 3, 2);
  // Foam edge.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.725, W * 0.52, H * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();
  // Speedboat with a wake.
  const bx = W * 0.16;
  const by = H * 0.585;
  const bw = W * 0.24;
  const bh = H * 0.055;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(bx - i * 26 - 10, by + bh * (0.4 + i * 0.22));
    ctx.quadraticCurveTo(bx - bw * 0.24 - i * 30, by + bh * (0.9 + i * 0.2), bx - bw * 0.5 - i * 36, by + bh * (0.5 + i * 0.24));
    ctx.stroke();
  }
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by - bh * 0.18);
  ctx.lineTo(bx + bw * 0.9, by + bh * 0.72);
  ctx.lineTo(bx + bw * 0.1, by + bh * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0e7d94';
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.06, by + bh * 0.34);
  ctx.lineTo(bx + bw * 0.96, by + bh * 0.1);
  ctx.lineTo(bx + bw * 0.9, by + bh * 0.5);
  ctx.lineTo(bx + bw * 0.12, by + bh * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#17303c';
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.42, by - bh * 0.1);
  ctx.lineTo(bx + bw * 0.66, by - bh * 0.62);
  ctx.lineTo(bx + bw * 0.78, by - bh * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#223140';
  ctx.fillRect(bx + bw * 0.02, by + bh * 0.3, bw * 0.07, bh * 0.85);
  // Lifeguard tower.
  const lx = W * 0.72;
  const ly = H * 0.86;
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 10;
  for (const [x0, x1] of [[lx, lx + W * 0.055], [lx + W * 0.075, lx + W * 0.02]]) {
    ctx.beginPath();
    ctx.moveTo(x0, ly);
    ctx.lineTo(x1, ly - H * 0.17);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(lx, ly - H * 0.06);
  ctx.lineTo(lx + W * 0.075, ly - H * 0.12);
  ctx.moveTo(lx + W * 0.075, ly - H * 0.06);
  ctx.lineTo(lx, ly - H * 0.12);
  ctx.stroke();
  ctx.fillStyle = '#fdfdf8';
  ctx.fillRect(lx - W * 0.008, ly - H * 0.245, W * 0.09, H * 0.08);
  ctx.fillStyle = '#e23b3b';
  ctx.fillRect(lx - W * 0.008, ly - H * 0.245, W * 0.09, H * 0.02);
  ctx.fillStyle = '#17303c';
  ctx.fillRect(lx + W * 0.012, ly - H * 0.225, W * 0.05, H * 0.04);
  ctx.fillStyle = '#e23b3b';
  ctx.beginPath();
  ctx.moveTo(lx - W * 0.016, ly - H * 0.245);
  ctx.lineTo(lx + W * 0.045, ly - H * 0.285);
  ctx.lineTo(lx + W * 0.106, ly - H * 0.245);
  ctx.closePath();
  ctx.fill();
  // Umbrella and towel.
  const ux = W * 0.5;
  const uy = H * 0.83;
  ctx.strokeStyle = '#7a4a21';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ux, uy);
  ctx.lineTo(ux + W * 0.008, uy - H * 0.09);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#fdfdf8' : '#ff5e62';
    ctx.beginPath();
    ctx.moveTo(ux + W * 0.008, uy - H * 0.095);
    ctx.arc(ux + W * 0.008, uy - H * 0.095, W * 0.052, Math.PI + (Math.PI / 6) * i, Math.PI + (Math.PI / 6) * (i + 1));
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#22a7c4';
  ctx.fillRect(ux - W * 0.035, uy + H * 0.012, W * 0.07, H * 0.028);
  ctx.fillStyle = '#ff5e62';
  ctx.beginPath();
  ctx.arc(W * 0.6, H * 0.9, W * 0.014, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.arc(W * 0.6, H * 0.9, W * 0.014, Math.PI, Math.PI * 1.6);
  ctx.fill();
  palm(ctx, W * 0.955, H * 0.98, H * 0.42, '#2e7d5b', -0.24);
  palm(ctx, W * 0.06, H * 0.99, H * 0.3, '#2e7d5b', 0.2);
}

// ------------------------------------------------------------- Downtown Dusk

function paintDowntownDusk(ctx, W, H) {
  const rand = rng(4404);
  sky(ctx, W, H, [
    [0, '#1c1030'],
    [0.42, '#55255f'],
    [0.68, '#c94f6d'],
    [0.8, '#ff9e5e'],
    [1, '#2a1844'],
  ]);
  sun(ctx, W * 0.5, H * 0.72, W * 0.075, '#ff8c42', 'rgba(255, 94, 98, 0.35)');
  const lit = ['#ffd166', '#ffe9a8', '#7bf1ff'];
  // Far skyline.
  let x = -20;
  while (x < W + 20) {
    const w = W * (0.03 + rand() * 0.05);
    const h = H * (0.2 + rand() * 0.24);
    tower(ctx, rand, x, H * 0.78 - h, w, h, 'rgba(43, 24, 66, 0.85)', lit, 0.16);
    x += w + rand() * 14;
  }
  // Mid towers.
  x = -30;
  while (x < W + 30) {
    const w = W * (0.05 + rand() * 0.06);
    const h = H * (0.3 + rand() * 0.3);
    tower(ctx, rand, x, H * 0.8 - h, w, h, '#2a1844', lit, 0.3);
    x += w + rand() * 22;
  }
  // Near framing towers with rooftop furniture.
  tower(ctx, rand, -W * 0.01, H * 0.1, W * 0.13, H * 0.72, '#160b28', lit, 0.36);
  tower(ctx, rand, W * 0.885, H * 0.06, W * 0.125, H * 0.76, '#160b28', lit, 0.36);
  ctx.fillStyle = '#160b28';
  ctx.fillRect(W * 0.035, H * 0.055, W * 0.045, H * 0.045); // water tank body
  ctx.beginPath();
  ctx.moveTo(W * 0.03, H * 0.055);
  ctx.lineTo(W * 0.0575, H * 0.028);
  ctx.lineTo(W * 0.085, H * 0.055);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(W * 0.925, H * 0.028, 5, H * 0.05); // antenna
  glowDot(ctx, W * 0.926, H * 0.024, 7, 'rgba(255, 60, 70, 0.95)');
  // Helicopter crossing the sun.
  const hx = W * 0.545;
  const hy = H * 0.665;
  ctx.fillStyle = '#12081f';
  ctx.beginPath();
  ctx.ellipse(hx, hy, W * 0.026, H * 0.016, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + W * 0.02, hy - H * 0.004);
  ctx.lineTo(hx + W * 0.062, hy - H * 0.012);
  ctx.lineTo(hx + W * 0.062, hy + H * 0.002);
  ctx.lineTo(hx + W * 0.02, hy + H * 0.006);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(hx + W * 0.058, hy - H * 0.02, W * 0.004, H * 0.012);
  ctx.fillRect(hx - W * 0.034, hy - H * 0.026, W * 0.068, 3.4);
  ctx.fillRect(hx - W * 0.012, hy + H * 0.016, W * 0.024, 3);
  ctx.fillRect(hx - W * 0.014, hy + H * 0.008, 3, H * 0.009);
  ctx.fillRect(hx + W * 0.011, hy + H * 0.008, 3, H * 0.009);
  // Avenue: a perspective road with streetlights and light streams.
  const road = ctx.createLinearGradient(0, H * 0.8, 0, H);
  road.addColorStop(0, '#1d1330');
  road.addColorStop(1, '#0f0a1c');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(W * 0.4, H * 0.8);
  ctx.lineTo(W * 0.6, H * 0.8);
  ctx.lineTo(W * 0.86, H);
  ctx.lineTo(W * 0.14, H);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const y = H * (0.815 + t * 0.185);
    const spread = 0.1 + t * 0.26;
    glowDot(ctx, W * (0.5 - spread), y - H * 0.02 * (1 - t), 5 + t * 6, 'rgba(255, 190, 110, 0.9)');
    glowDot(ctx, W * (0.5 + spread), y - H * 0.02 * (1 - t), 5 + t * 6, 'rgba(255, 190, 110, 0.9)');
  }
  for (let i = 0; i < 12; i++) {
    const t = rand();
    const y = H * (0.82 + t * 0.17);
    const left = rand() > 0.5;
    const cx = W * (0.5 + (left ? -1 : 1) * (0.012 + rand() * 0.05) * (0.4 + t));
    ctx.save();
    ctx.shadowColor = left ? '#cfe8ff' : '#ff4040';
    ctx.shadowBlur = 16;
    ctx.fillStyle = left ? '#eaf6ff' : '#ff5a4e';
    rr(ctx, cx, y, W * (0.012 + t * 0.03), 3 + t * 4, 3);
    ctx.fill();
    ctx.restore();
  }
}

// -------------------------------------------------------------- Palm Highway

function paintPalmHighway(ctx, W, H) {
  const rand = rng(5505);
  sky(ctx, W, H, [
    [0, '#31184d'],
    [0.36, '#8a3560'],
    [0.52, '#ff9e5e'],
    [0.58, '#5b2a4e'],
    [1, '#171020'],
  ]);
  sun(ctx, W * 0.36, H * 0.52, W * 0.045, '#ff9e4f', 'rgba(255, 110, 90, 0.4)');
  // Distant ridge.
  ctx.fillStyle = '#3a1e42';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.56);
  for (let i = 0; i <= 12; i++) ctx.lineTo((W / 12) * i, H * (0.53 + rand() * 0.03));
  ctx.lineTo(W, H * 0.58);
  ctx.lineTo(W, H * 0.6);
  ctx.lineTo(0, H * 0.6);
  ctx.closePath();
  ctx.fill();
  // Ground and highway.
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(0, H * 0.58, W, H * 0.42);
  const vx = W * 0.5;
  const vy = H * 0.575;
  const road = ctx.createLinearGradient(0, vy, 0, H);
  road.addColorStop(0, '#38303e');
  road.addColorStop(1, '#17121f');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(vx - W * 0.035, vy);
  ctx.lineTo(vx + W * 0.035, vy);
  ctx.lineTo(W * 1.04, H);
  ctx.lineTo(-W * 0.04, H);
  ctx.closePath();
  ctx.fill();
  // Lane markings converging on the vanishing point.
  ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
  for (const off of [-0.0115, 0.0115]) {
    for (let i = 0; i < 7; i++) {
      const t0 = i / 7;
      const t1 = t0 + 0.055;
      const y0 = vy + (H - vy) * t0 * t0 * 1.6;
      const y1 = vy + (H - vy) * Math.min(1, t1 * t1 * 1.6 + 0.02);
      if (y0 > H) continue;
      const x0 = vx + (off * W) * (0.06 + t0 * 2.6);
      const x1 = vx + (off * W) * (0.06 + t1 * 2.6);
      ctx.fillRect(Math.min(x0, x1) - 1.5, y0, Math.abs(x1 - x0) + 3, Math.max(2, y1 - y0));
    }
  }
  ctx.fillStyle = 'rgba(240, 240, 235, 0.75)';
  for (const off of [-0.035, 0.035]) {
    ctx.beginPath();
    ctx.moveTo(vx + off * W * 0.94, vy);
    ctx.lineTo(vx + off * W * 27.4, H);
    ctx.lineTo(vx + off * W * 27.4 + (off < 0 ? -6 : 6), H);
    ctx.lineTo(vx + off * W * 0.94 + (off < 0 ? -1 : 1), vy);
    ctx.closePath();
    ctx.fill();
  }
  // Receding palm rows.
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const y = vy + (H - vy) * Math.pow(t, 1.7);
    const s = H * (0.05 + Math.pow(t, 1.7) * 0.5);
    const spread = 0.045 + Math.pow(t, 1.7) * 0.52;
    palm(ctx, W * (0.5 - spread), y, s, '#150c20', 0.2);
    palm(ctx, W * (0.5 + spread), y, s * 0.94, '#150c20', -0.2);
  }
  // Road sign.
  const sx = W * 0.755;
  const sy = H * 0.52;
  ctx.fillStyle = '#0e0a16';
  ctx.fillRect(sx, sy, 8, H * 0.17);
  ctx.fillRect(sx + W * 0.075, sy, 8, H * 0.17);
  ctx.fillStyle = '#0d6e4f';
  rr(ctx, sx - W * 0.012, sy - H * 0.085, W * 0.115, H * 0.088, 10);
  ctx.fill();
  ctx.strokeStyle = '#e8f4ec';
  ctx.lineWidth = 3;
  rr(ctx, sx - W * 0.012, sy - H * 0.085, W * 0.115, H * 0.088, 10);
  ctx.stroke();
  ctx.fillStyle = '#e8f4ec';
  ctx.textAlign = 'center';
  ctx.font = `bold ${H * 0.0225}px sans-serif`;
  ctx.fillText('PALM SHORES', sx + W * 0.045, sy - H * 0.045);
  ctx.font = `${H * 0.02}px sans-serif`;
  ctx.fillText('EXIT 12 · 2 MILES', sx + W * 0.045, sy - H * 0.014);
  // Sports car from behind, tail-light bar lit. It sits high enough in the
  // frame that a cover's caption along the foot does not swallow it whole.
  const cx = W * 0.5;
  const cy = H * 0.845;
  const cw = W * 0.37;
  const chh = H * 0.145;
  ctx.fillStyle = 'rgba(255, 70, 60, 0.14)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + chh * 0.32, cw * 0.52, chh * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // A warm pool of sunset light under the car lifts the silhouette off the
  // asphalt; without it the dark body vanishes into the dark road.
  const pool = ctx.createRadialGradient(cx, cy + chh * 0.28, 10, cx, cy + chh * 0.28, cw * 0.62);
  pool.addColorStop(0, 'rgba(255, 140, 80, 0.34)');
  pool.addColorStop(1, 'rgba(255, 140, 80, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(cx - cw * 0.62, cy - chh * 0.2, cw * 1.24, chh * 1.1);
  ctx.fillStyle = '#100a18';
  ctx.beginPath();
  ctx.ellipse(cx, cy + chh * 0.3, cw * 0.5, chh * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  const bodyGrad = ctx.createLinearGradient(0, cy - chh, 0, cy + chh * 0.3);
  bodyGrad.addColorStop(0, '#53284a');
  bodyGrad.addColorStop(0.55, '#2a1830');
  bodyGrad.addColorStop(1, '#150b1e');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.5, cy + chh * 0.22);
  ctx.quadraticCurveTo(cx - cw * 0.52, cy - chh * 0.34, cx - cw * 0.36, cy - chh * 0.52);
  ctx.quadraticCurveTo(cx - cw * 0.3, cy - chh * 0.94, cx - cw * 0.19, cy - chh * 0.98);
  ctx.lineTo(cx + cw * 0.19, cy - chh * 0.98);
  ctx.quadraticCurveTo(cx + cw * 0.3, cy - chh * 0.94, cx + cw * 0.36, cy - chh * 0.52);
  ctx.quadraticCurveTo(cx + cw * 0.52, cy - chh * 0.34, cx + cw * 0.5, cy + chh * 0.22);
  ctx.closePath();
  ctx.fill();
  // Rear window and sunset rim.
  ctx.fillStyle = 'rgba(255, 158, 94, 0.5)';
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.17, cy - chh * 0.92);
  ctx.lineTo(cx + cw * 0.17, cy - chh * 0.92);
  ctx.lineTo(cx + cw * 0.22, cy - chh * 0.6);
  ctx.lineTo(cx - cw * 0.22, cy - chh * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 170, 100, 0.95)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.36, cy - chh * 0.52);
  ctx.quadraticCurveTo(cx, cy - chh * 1.06, cx + cw * 0.36, cy - chh * 0.52);
  ctx.stroke();
  // Sheen strokes down the rear haunches, catching the sunset.
  ctx.strokeStyle = 'rgba(255, 150, 90, 0.4)';
  ctx.lineWidth = 7;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * cw * 0.44, cy - chh * 0.3);
    ctx.quadraticCurveTo(cx + side * cw * 0.47, cy - chh * 0.05, cx + side * cw * 0.42, cy + chh * 0.16);
    ctx.stroke();
  }
  // Spoiler on two pylons.
  ctx.fillStyle = '#0d0814';
  ctx.fillRect(cx - cw * 0.3, cy - chh * 1.18, cw * 0.035, chh * 0.3);
  ctx.fillRect(cx + cw * 0.265, cy - chh * 1.18, cw * 0.035, chh * 0.3);
  rr(ctx, cx - cw * 0.44, cy - chh * 1.3, cw * 0.88, chh * 0.13, 8);
  ctx.fill();
  // Full-width tail-light bar.
  ctx.save();
  ctx.shadowColor = '#ff2a3c';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff3547';
  rr(ctx, cx - cw * 0.4, cy - chh * 0.42, cw * 0.8, chh * 0.11, 6);
  ctx.fill();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 240, 230, 0.9)';
  rr(ctx, cx - cw * 0.055, cy + chh * 0.02, cw * 0.11, chh * 0.14, 3);
  ctx.fill();
  for (const ex of [cx - cw * 0.3, cx + cw * 0.3]) {
    ctx.fillStyle = '#05030a';
    ctx.beginPath();
    ctx.arc(ex, cy + chh * 0.2, chh * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  void rand;
}

// ------------------------------------------------------------------ registry

const PAINTERS = {
  'sunset-pier': paintSunsetPier,
  'neon-boulevard': paintNeonBoulevard,
  'beach-day': paintBeachDay,
  'downtown-dusk': paintDowntownDusk,
  'palm-highway': paintPalmHighway,
};

const cache = new Map();

/** Returns the painted 1920 x 1200 canvas for an illustrated scene id. */
export function sceneCanvas(id) {
  if (!cache.has(id)) {
    const c = canvas(SCENE_WIDTH, SCENE_HEIGHT);
    PAINTERS[id](c.getContext('2d'), SCENE_WIDTH, SCENE_HEIGHT);
    cache.set(id, c);
  }
  return cache.get(id);
}

/** The sample photo path for a photo scene id. */
export function scenePhotoUrl(id) {
  return id === 'boulevard-photo' ? 'samples/boulevard.jpg' : 'samples/pier.jpg';
}
