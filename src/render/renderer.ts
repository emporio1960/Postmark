// The single card renderer. Thumbnails, the live editor, the full-screen
// preview and every export all go through renderFace(), which guarantees
// that what you see is exactly what you download.
import type { Background, Border, CardDoc, CardElement, Face, FaceKey, ImageEl, Orientation, PhotoShape, TextEl } from '../types';
import { cardSize } from '../types';
import { drawArt } from './art';
import { drawSticker } from './stickers';
import { drawableSize, getDrawable, imageFailed } from './images';

type Ctx = CanvasRenderingContext2D;

let measureCtx: Ctx | null = null;
function mctx(): Ctx {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!;
  return measureCtx;
}

export function fontString(el: Pick<TextEl, 'font' | 'size' | 'bold' | 'italic'>): string {
  return `${el.italic ? 'italic ' : ''}${el.bold ? '700' : '400'} ${el.size}px "${el.font}", Georgia, serif`;
}

const supportsSpacing = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;

function setSpacing(ctx: Ctx, spacing: number) {
  if (supportsSpacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
}

function widthOf(ctx: Ctx, s: string, spacing: number): number {
  const w = ctx.measureText(s).width;
  return supportsSpacing || !spacing ? w : w + spacing * s.length;
}

export interface TextLayout { lines: string[]; lineH: number; height: number }

export function layoutText(el: TextEl, ctx: Ctx = mctx()): TextLayout {
  ctx.save();
  ctx.font = fontString(el);
  setSpacing(ctx, el.spacing);
  const lines: string[] = [];
  for (const para of el.text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = line + ' ' + words[i];
      if (widthOf(ctx, next, el.spacing) <= el.w) line = next;
      else { lines.push(line); line = words[i]; }
    }
    lines.push(line);
  }
  ctx.restore();
  const lineH = el.size * el.lineHeight;
  return { lines, lineH, height: Math.max(lineH, lines.length * lineH) };
}

export interface Box { x: number; y: number; w: number; h: number }

export function elementBox(el: CardElement): Box {
  if (el.type === 'text') return { x: el.x, y: el.y, w: el.w, h: layoutText(el).height };
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

function drawText(ctx: Ctx, el: TextEl) {
  const { lines, lineH } = layoutText(el, ctx);
  ctx.save();
  ctx.font = fontString(el);
  setSpacing(ctx, el.spacing);
  ctx.fillStyle = el.color;
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    const y = el.y + lineH * (i + 0.5);
    if (!supportsSpacing && el.spacing) {
      // Manual tracking for browsers without canvas letter-spacing.
      const total = widthOf(ctx, line, el.spacing) - el.spacing;
      let x = el.align === 'left' ? el.x : el.align === 'right' ? el.x + el.w - total : el.x + (el.w - total) / 2;
      ctx.textAlign = 'left';
      for (const ch of line) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + el.spacing; }
    } else {
      ctx.textAlign = el.align;
      // canvas letter-spacing trails the last glyph; nudge so centring stays optical
      const fix = el.spacing ? (el.align === 'center' ? el.spacing / 2 : el.align === 'right' ? el.spacing : 0) : 0;
      const x = el.align === 'left' ? el.x : el.align === 'right' ? el.x + el.w : el.x + el.w / 2;
      ctx.fillText(line, x + fix, y);
    }
  });
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function shapePath(ctx: Ctx, shape: PhotoShape, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  if (shape === 'circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'rounded') roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.08);
  else if (shape === 'arch') {
    const r = Math.min(w / 2, h);
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + w / 2, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
  } else ctx.rect(x, y, w, h);
}

function drawImageEl(ctx: Ctx, el: ImageEl) {
  const { x, y, w, h } = el;
  ctx.save();
  if (el.frame === 'white' || el.frame === 'shadow') {
    ctx.save();
    ctx.shadowColor = 'rgba(50,38,20,.28)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#FFFFFF'; shapePath(ctx, el.shape, x, y, w, h); ctx.fill();
    ctx.restore();
  }
  const pad = el.frame === 'white' ? Math.min(w, h) * 0.05 : 0;
  const ix = x + pad, iy = y + pad, iw = w - pad * 2, ih = h - pad * 2;
  ctx.save();
  shapePath(ctx, el.shape, ix, iy, iw, ih); ctx.clip();
  const d = getDrawable(el.src, el.filter);
  if (d) {
    const s = drawableSize(d);
    const scale = Math.max(iw / s.w, ih / s.h) * el.zoom;
    const dw = s.w * scale, dh = s.h * scale;
    const dx = ix - (dw - iw) / 2 - (el.ox * (dw - iw)) / 2;
    const dy = iy - (dh - ih) / 2 - (el.oy * (dh - ih)) / 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(d, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#ECE5D8'; ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = '#8A8177'; ctx.font = '26px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(imageFailed(el.src) ? 'Photo unavailable' : 'Loading photo…', ix + iw / 2, iy + ih / 2);
  }
  ctx.restore();
  if (el.frame === 'gold' || el.frame === 'ink') {
    const c = el.frame === 'gold' ? '#C2A05A' : '#2B2622';
    ctx.strokeStyle = c; ctx.lineWidth = 7; shapePath(ctx, el.shape, x, y, w, h); ctx.stroke();
    ctx.lineWidth = 2; shapePath(ctx, el.shape, x - 14, y - 14, w + 28, h + 28); ctx.stroke();
  }
  ctx.restore();
}

export function drawBackground(ctx: Ctx, bg: Background, W: number, H: number) {
  if (bg.kind === 'solid') ctx.fillStyle = bg.color;
  else {
    const a = (bg.angle * Math.PI) / 180, cx = W / 2, cy = H / 2;
    const len = (Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a))) / 2;
    const g = ctx.createLinearGradient(cx - Math.sin(a) * len, cy + Math.cos(a) * len, cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    g.addColorStop(0, bg.from); g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, W, H);
}

function drawBorder(ctx: Ctx, b: Border, W: number, H: number) {
  if (!b || b.kind === 'none') return;
  const i = b.inset;
  ctx.save();
  ctx.strokeStyle = b.color; ctx.lineJoin = 'miter';
  const rect = (inset: number, lw: number) => { ctx.lineWidth = lw; ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2); };
  switch (b.kind) {
    case 'line': rect(i, 3); break;
    case 'double': rect(i, 5); rect(i + 14, 1.5); break;
    case 'thick': rect(i, 18); break;
    case 'dashed': ctx.setLineDash([16, 12]); rect(i, 3); break;
    case 'corners': {
      const L = Math.min(W, H) * 0.12; ctx.lineWidth = 4;
      ([[i, i, 1, 1], [W - i, i, -1, 1], [W - i, H - i, -1, -1], [i, H - i, 1, -1]] as number[][]).forEach(([x, y, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(x + L * sx, y); ctx.lineTo(x, y); ctx.lineTo(x, y + L * sy); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 16 * sx, y + 16 * sy, 4, 0, Math.PI * 2); ctx.fillStyle = b.color; ctx.fill();
      });
      break;
    }
  }
  ctx.restore();
}

function drawElement(ctx: Ctx, el: CardElement) {
  if (el.type === 'text') drawText(ctx, el);
  else if (el.type === 'image') drawImageEl(ctx, el);
  else drawSticker(ctx, el.kind, el.color, el.x, el.y, el.w, el.h);
}

/** Draw one face of a card. `scale` = output pixels per card unit. */
export function renderFace(ctx: Ctx, face: Face, orientation: Orientation, scale: number) {
  const { w: W, h: H } = cardSize(orientation);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, face.background, W, H);
  drawArt(ctx, face.art, W, H);
  drawBorder(ctx, face.border, W, H);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  for (const el of face.elements) {
    try { drawElement(ctx, el); } catch { /* a broken element must never blank the card */ }
  }
  ctx.restore();
}

export function renderToCanvas(doc: CardDoc, faceKey: FaceKey, scale: number): HTMLCanvasElement {
  const { w, h } = cardSize(doc.orientation);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  renderFace(canvas.getContext('2d')!, doc[faceKey], doc.orientation, scale);
  return canvas;
}
