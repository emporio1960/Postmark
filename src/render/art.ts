// Procedural background artwork. Every style is drawn from a palette and a
// seed, so templates stay crisp at any export size and can be re-coloured.
import type { Art, ArtKind } from '../types';
import { mulberry32, rgba } from '../lib/utils';

type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;

export const ART_LABELS: Record<ArtKind, string> = {
  none: 'None', floral: 'Floral', wash: 'Watercolour', confetti: 'Confetti', arcs: 'Rainbow arcs',
  botanical: 'Botanical', wreath: 'Wreath', stars: 'Starlight', snow: 'Snowfall', hearts: 'Hearts',
  sunburst: 'Sunburst', hills: 'Landscape', terrazzo: 'Terrazzo', stripes: 'Stripes', balloons: 'Balloons', geo: 'Geometric',
};

export const ART_PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Champagne', colors: ['#C2A05A', '#DEC892', '#A8843F', '#EBDDB9', '#86682F'] },
  { name: 'Blush', colors: ['#E8A7A1', '#F3C9B5', '#D98C8C', '#8FA58A', '#F7E3A1'] },
  { name: 'Garden', colors: ['#7D9479', '#A9B8A0', '#5E7A63', '#C9D4BF', '#2F4A3A'] },
  { name: 'Pastel', colors: ['#F4B6C2', '#B8D8E8', '#F9E0A8', '#CDB4DB', '#BDE0D0'] },
  { name: 'Festive', colors: ['#B5362F', '#2F4A3A', '#C2A05A', '#E8D9B5', '#7A1F1B'] },
  { name: 'Sunset', colors: ['#F2B84B', '#F0A07A', '#D9826A', '#9C6B7A', '#5B5273'] },
  { name: 'Modern', colors: ['#E07A5F', '#F2CC8F', '#81B29A', '#3D405B', '#F4F1DE'] },
  { name: 'Midnight', colors: ['#E9D5A5', '#F5EFE2', '#C2A05A', '#8FA3C8', '#FFFFFF'] },
];

const pick = (p: string[], i: number) => p[((i % p.length) + p.length) % p.length];

function heartPath(ctx: Ctx, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.38);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.05, -s * 0.5, -s * 0.55, -s * 0.22, -s * 0.5);
  ctx.bezierCurveTo(-s * 0.08, -s * 0.48, 0, -s * 0.36, 0, -s * 0.26);
  ctx.bezierCurveTo(0, -s * 0.36, s * 0.08, -s * 0.48, s * 0.22, -s * 0.5);
  ctx.bezierCurveTo(s * 0.5, -s * 0.55, s * 0.6, -s * 0.05, 0, s * 0.38);
  ctx.closePath();
}

function leaf(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, alpha = 0.9) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.3, 0, 0);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.35; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, len * 0.02);
  ctx.beginPath(); ctx.moveTo(len * 0.08, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  ctx.restore();
}

function flower(ctx: Ctx, x: number, y: number, r: number, color: string, center: string, rot: number, petals = 5) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  for (let i = 0; i < petals; i++) {
    ctx.rotate((Math.PI * 2) / petals);
    ctx.globalAlpha = 0.82; ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.34, r * 0.56, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.16, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = center;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function sparkle(ctx: Ctx, x: number, y: number, s: number, color: string, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
  ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s); ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
  ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s); ctx.fill();
  ctx.restore();
}

/** Random point that mostly avoids the calm centre where text usually sits. */
function edgePoint(rnd: Rnd, W: number, H: number, keep = 0.1): [number, number] {
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W, y = rnd() * H;
    const dx = (x - W / 2) / (W * 0.4), dy = (y - H / 2) / (H * 0.33);
    if (dx * dx + dy * dy > 1 || rnd() < keep) return [x, y];
  }
  return [rnd() * W, rnd() * H * 0.12];
}

function branch(ctx: Ctx, rnd: Rnd, x: number, y: number, angle: number, length: number, p: string[]) {
  const steps = 10; let cx = x, cy = y, a = angle;
  ctx.save();
  ctx.strokeStyle = pick(p, 2); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(cx, cy);
  const pts: [number, number, number][] = [];
  for (let i = 0; i < steps; i++) {
    a += (rnd() - 0.5) * 0.22;
    cx += Math.cos(a) * (length / steps); cy += Math.sin(a) * (length / steps);
    ctx.lineTo(cx, cy); pts.push([cx, cy, a]);
  }
  ctx.stroke(); ctx.restore();
  pts.forEach(([px, py, pa], i) => {
    const size = (length / steps) * (1.5 - i * 0.07);
    leaf(ctx, px, py, size, pa + (i % 2 ? 0.85 : -0.85), pick(p, i % 2), 0.88);
  });
}

const draw: Record<ArtKind, (ctx: Ctx, W: number, H: number, p: string[], rnd: Rnd) => void> = {
  none: () => {},

  floral(ctx, W, H, p, rnd) {
    const cluster = (cx: number, cy: number, R: number, n: number) => {
      for (let i = 0; i < n + 4; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * R;
        leaf(ctx, cx + Math.cos(a) * d * 0.7, cy + Math.sin(a) * d * 0.7, 70 + rnd() * 90, rnd() * Math.PI * 2, pick(p, 3), 0.75);
      }
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.8) * R;
        flower(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 38 + rnd() * 62, pick(p, i % 3), pick(p, 4), rnd() * 6, rnd() > 0.5 ? 5 : 6);
      }
    };
    const R = Math.min(W, H) * 0.3;
    cluster(W * 0.04, H * 0.03, R, 8);
    cluster(W * 0.96, H * 0.97, R, 8);
    cluster(W * 0.98, H * 0.04, R * 0.5, 3);
    cluster(W * 0.02, H * 0.96, R * 0.5, 3);
  },

  wash(ctx, W, H, p, rnd) {
    const spots: [number, number][] = [[0.18, 0.14], [0.84, 0.2], [0.14, 0.86], [0.86, 0.84], [0.5, 0.06], [0.5, 0.95]];
    spots.forEach(([fx, fy], k) => {
      const color = pick(p, k);
      for (let i = 0; i < 9; i++) {
        const x = fx * W + (rnd() - 0.5) * W * 0.3, y = fy * H + (rnd() - 0.5) * H * 0.22;
        const r = Math.min(W, H) * (0.14 + rnd() * 0.2);
        const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
        g.addColorStop(0, rgba(color, 0.2)); g.addColorStop(0.7, rgba(color, 0.1)); g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    });
    for (let i = 0; i < 26; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0.02);
      ctx.fillStyle = rgba(pick(p, i), 0.35);
      ctx.beginPath(); ctx.arc(x, y, 2 + rnd() * 7, 0, Math.PI * 2); ctx.fill();
    }
  },

  confetti(ctx, W, H, p, rnd) {
    for (let i = 0; i < 130; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0.05);
      const s = 8 + rnd() * 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI);
      ctx.fillStyle = pick(p, i); ctx.globalAlpha = 0.6 + rnd() * 0.4;
      const t = rnd();
      if (t < 0.4) ctx.fillRect(-s / 2, -s / 5, s, s / 2.5);
      else if (t < 0.75) { ctx.beginPath(); ctx.arc(0, 0, s / 3, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
  },

  arcs(ctx, W, H, p) {
    const cx = W / 2, cy = H * 0.98, R = Math.min(W * 0.4, H * 0.42), step = R / 5.6;
    ctx.save(); ctx.lineCap = 'butt';
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = pick(p, i); ctx.lineWidth = step * 0.66;
      ctx.beginPath(); ctx.arc(cx, cy, R - i * step, Math.PI, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = pick(p, 1); ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(W * 0.84, H * 0.1, Math.min(W, H) * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pick(p, 2); ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(W * 0.12, H * 0.16, Math.min(W, H) * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  botanical(ctx, W, H, p, rnd) {
    const L = Math.min(W, H) * 0.52;
    branch(ctx, rnd, W * 0.02, H * 1.0, -1.15, L, p);
    branch(ctx, rnd, W * 0.16, H * 1.02, -1.45, L * 0.8, p);
    branch(ctx, rnd, -W * 0.02, H * 0.86, -0.7, L * 0.7, p);
    branch(ctx, rnd, W * 0.98, 0, 2.0, L, p);
    branch(ctx, rnd, W * 0.84, -H * 0.02, 1.7, L * 0.8, p);
    branch(ctx, rnd, W * 1.02, H * 0.14, 2.45, L * 0.7, p);
  },

  wreath(ctx, W, H, p, rnd) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.39, n = 54;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = R + (rnd() - 0.5) * 26;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      leaf(ctx, x, y, 62 + rnd() * 34, a + Math.PI / 2 + (i % 2 ? 0.75 : -0.75), pick(p, i % 2), 0.88);
    }
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, r = R + (rnd() - 0.5) * 40;
      ctx.fillStyle = pick(p, 2); ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 8 + rnd() * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  stars(ctx, W, H, p, rnd) {
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = rgba(pick(p, 0), 0.25 + rnd() * 0.6);
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0.03);
      sparkle(ctx, x, y, 10 + rnd() * 26, pick(p, i % 2), 0.6 + rnd() * 0.4);
    }
  },

  snow(ctx, W, H, p, rnd) {
    for (let i = 0; i < 110; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0.25);
      ctx.fillStyle = rgba(pick(p, 0), 0.25 + rnd() * 0.6);
      ctx.beginPath(); ctx.arc(x, y, 2 + rnd() * 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0);
      const s = 20 + rnd() * 30;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd()); ctx.strokeStyle = rgba(pick(p, 0), 0.8); ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s);
        ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.22, -s * 0.82); ctx.moveTo(0, -s * 0.6); ctx.lineTo(-s * 0.22, -s * 0.82); ctx.stroke();
      }
      ctx.restore();
    }
  },

  hearts(ctx, W, H, p, rnd) {
    for (let i = 0; i < 44; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0.04);
      ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.9);
      ctx.fillStyle = pick(p, i); ctx.globalAlpha = 0.55 + rnd() * 0.4;
      heartPath(ctx, 26 + rnd() * 70); ctx.fill(); ctx.restore();
    }
  },

  sunburst(ctx, W, H, p) {
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H), n = 28;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = pick(p, i % 2);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2); ctx.closePath(); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.55);
    g.addColorStop(0, rgba(pick(p, 1), 1)); g.addColorStop(0.6, rgba(pick(p, 1), 0.85)); g.addColorStop(1, rgba(pick(p, 1), 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  hills(ctx, W, H, p, rnd) {
    ctx.fillStyle = pick(p, 0); ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(W * 0.7, H * 0.56, Math.min(W, H) * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (let l = 0; l < 4; l++) {
      const base = H * (0.62 + l * 0.1), amp = H * (0.05 - l * 0.006), ph = rnd() * 6, f = 1.2 + rnd() * 1.4;
      ctx.fillStyle = pick(p, l + 1);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base + Math.sin((x / W) * Math.PI * f + ph) * amp + Math.sin((x / W) * 9 + ph * 2) * amp * 0.25);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
  },

  terrazzo(ctx, W, H, p, rnd) {
    for (let i = 0; i < 90; i++) {
      const [x, y] = edgePoint(rnd, W, H, 0.04);
      const s = 14 + rnd() * 44, n = 4 + Math.floor(rnd() * 3);
      ctx.fillStyle = pick(p, i); ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd() * 0.5, r = s * (0.55 + rnd() * 0.45);
        k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  stripes(ctx, W, H, p) {
    const band = H * 0.035;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = pick(p, i);
      ctx.fillRect(0, H - band * (i + 1) * 1.6 - H * 0.04, W, band);
      ctx.fillRect(0, H * 0.04 + band * i * 1.6, W, band);
    }
  },

  balloons(ctx, W, H, p, rnd) {
    const n = W > H ? 8 : 6;
    for (let i = 0; i < n; i++) {
      const x = W * (0.1 + (i / (n - 1)) * 0.8) + (rnd() - 0.5) * 40;
      const y = H * (0.14 + rnd() * 0.14), rx = Math.min(W, H) * (0.062 + rnd() * 0.02), ry = rx * 1.22;
      ctx.strokeStyle = rgba('#6B625A', 0.4); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y + ry + 12);
      ctx.bezierCurveTo(x + 24, y + ry + H * 0.08, x - 24, y + ry + H * 0.14, x + (W / 2 - x) * 0.5, y + ry + H * 0.22); ctx.stroke();
      ctx.fillStyle = pick(p, i);
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y + ry - 2); ctx.lineTo(x - 9, y + ry + 14); ctx.lineTo(x + 9, y + ry + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - ry * 0.35, rx * 0.16, ry * 0.26, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  },

  geo(ctx, W, H, p) {
    const m = Math.min(W, H);
    ctx.strokeStyle = pick(p, 0); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(W * 0.92, H * 0.1, m * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = pick(p, 2);
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, m * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pick(p, 0); ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(W * 0.06, H * 0.98, m * 0.2, Math.PI, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = pick(p, 1); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(W * 0.36, H * 0.93); ctx.lineTo(W * 0.92, H * 0.93); ctx.stroke();
  },
};

export function drawArt(ctx: Ctx, art: Art, W: number, H: number) {
  if (!art || art.kind === 'none') return;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  draw[art.kind]?.(ctx, W, H, art.palette.length ? art.palette : ['#C2A05A'], mulberry32(art.seed || 1));
  ctx.restore();
}
