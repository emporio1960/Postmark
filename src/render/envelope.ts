// Matching envelope: drawn from the card's own colours and artwork.
import type { CardDoc, EnvelopeSpec, EnvelopeStyle } from '../types';
import { luminance } from '../lib/utils';
import { drawArt } from './art';
import { drawBackground, renderToCanvas } from './renderer';

/** Envelope for a 5 × 7 card: 7.25 × 5.25 in (200 units per inch). */
export const ENVELOPE = { w: 1450, h: 1050 };

export const ENVELOPE_STYLES: { id: EnvelopeStyle; label: string }[] = [
  { id: 'match', label: 'Match the card' }, { id: 'ivory', label: 'Ivory' }, { id: 'kraft', label: 'Kraft' }, { id: 'white', label: 'White' },
];

const PAPER: Record<Exclude<EnvelopeStyle, 'match'>, string> = { ivory: '#FBF7EF', kraft: '#C8A67A', white: '#FFFFFF' };

export function renderEnvelope(doc: CardDoc, spec: EnvelopeSpec, scale: number): HTMLCanvasElement {
  const { w: W, h: H } = ENVELOPE;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const bg = doc.front.background;
  const base = spec.style === 'match' ? (bg.kind === 'solid' ? bg.color : bg.from) : PAPER[spec.style];
  if (spec.style === 'match') {
    drawBackground(ctx, bg, W, H);
    ctx.save(); ctx.globalAlpha = 0.5; drawArt(ctx, doc.front.art, W, H); ctx.restore();
    // keep the address area calm and legible
    const calm = ctx.createRadialGradient(W / 2, H * 0.56, 0, W / 2, H * 0.56, W * 0.46);
    const [r, g, b] = [parseInt(base.slice(1, 3), 16), parseInt(base.slice(3, 5), 16), parseInt(base.slice(5, 7), 16)];
    calm.addColorStop(0, `rgba(${r},${g},${b},.92)`); calm.addColorStop(0.7, `rgba(${r},${g},${b},.6)`); calm.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = calm; ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  }
  const dark = luminance(base) < 0.5;
  const ink = dark ? '#F5EFE2' : '#2B2622', accent = dark ? '#DEC892' : '#A8843F';
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(34, 34, W - 68, H - 68);

  // Stamp: a miniature of the card front inside a perforated frame.
  const sw = 150, sh = 196, sx = W - 34 - 40 - sw, sy = 34 + 40;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx - 12, sy - 12, sw + 24, sh + 24);
  ctx.fillStyle = base;
  for (let x = sx - 12; x <= sx + sw + 12; x += 16) { ctx.beginPath(); ctx.arc(x, sy - 12, 4.5, 0, Math.PI * 2); ctx.arc(x, sy + sh + 12, 4.5, 0, Math.PI * 2); ctx.fill(); }
  for (let y = sy - 12; y <= sy + sh + 12; y += 16) { ctx.beginPath(); ctx.arc(sx - 12, y, 4.5, 0, Math.PI * 2); ctx.arc(sx + sw + 12, y, 4.5, 0, Math.PI * 2); ctx.fill(); }
  const mini = renderToCanvas({ ...doc, orientation: doc.orientation }, 'front', 0.3);
  const ms = Math.max(sw / mini.width, sh / mini.height);
  ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  ctx.drawImage(mini, sx + (sw - mini.width * ms) / 2, sy + (sh - mini.height * ms) / 2, mini.width * ms, mini.height * ms);
  ctx.restore();

  // Recipient
  const name = spec.name.trim() || 'Recipient name';
  const lines = spec.lines.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink;
  let size = 124;
  ctx.font = `400 ${size}px "Great Vibes", cursive`;
  const maxW = W * 0.66;
  const wName = ctx.measureText(name).width;
  if (wName > maxW) { size = Math.max(54, (size * maxW) / wName); ctx.font = `400 ${size}px "Great Vibes", cursive`; }
  const blockH = size * 1.1 + (lines.length ? 26 + lines.length * 56 : 0);
  let y = H * 0.56 - blockH / 2 + size * 0.55;
  ctx.globalAlpha = spec.name.trim() ? 1 : 0.4;
  ctx.fillText(name, W / 2, y);
  ctx.globalAlpha = 1;
  y += size * 0.55 + 26;
  if (lines.length) {
    ctx.fillStyle = accent; ctx.fillRect(W / 2 - 60, y - 14, 120, 2);
    ctx.fillStyle = ink; ctx.font = '400 44px "Cormorant Garamond", Georgia, serif';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 28 + i * 56, W * 0.7));
  }
  return canvas;
}
