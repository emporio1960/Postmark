// Pure helpers that produce new card documents (never mutate).
import type { CardDoc, CardElement, Face, FaceKey, ImageEl, StickerEl, TextEl } from '../types';
import { cardSize } from '../types';
import { uid } from '../lib/utils';
import { elementBox } from '../render/renderer';

export function updateFace(doc: CardDoc, face: FaceKey, fn: (f: Face) => Face): CardDoc {
  return { ...doc, [face]: fn(doc[face]) };
}

export function patchEl(doc: CardDoc, face: FaceKey, id: string, patch: Partial<TextEl> | Partial<ImageEl> | Partial<StickerEl>): CardDoc {
  return updateFace(doc, face, (f) => ({ ...f, elements: f.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CardElement) : e)) }));
}

export function addEl(doc: CardDoc, face: FaceKey, el: CardElement): CardDoc {
  return updateFace(doc, face, (f) => ({ ...f, elements: [...f.elements, el] }));
}

export function removeEl(doc: CardDoc, face: FaceKey, id: string): CardDoc {
  return updateFace(doc, face, (f) => ({ ...f, elements: f.elements.filter((e) => e.id !== id) }));
}

export function moveLayer(doc: CardDoc, face: FaceKey, id: string, dir: 1 | -1): CardDoc {
  return updateFace(doc, face, (f) => {
    const i = f.elements.findIndex((e) => e.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= f.elements.length) return f;
    const els = f.elements.slice();
    [els[i], els[j]] = [els[j], els[i]];
    return { ...f, elements: els };
  });
}

export function duplicateEl(doc: CardDoc, face: FaceKey, id: string): { doc: CardDoc; id: string } {
  const src = doc[face].elements.find((e) => e.id === id);
  if (!src) return { doc, id };
  const copy = { ...src, id: uid(), x: src.x + 36, y: src.y + 36 } as CardElement;
  return { doc: addEl(doc, face, copy), id: copy.id };
}

export function centreEl(doc: CardDoc, face: FaceKey, id: string): CardDoc {
  const el = doc[face].elements.find((e) => e.id === id);
  if (!el) return doc;
  const { w: W } = cardSize(doc.orientation);
  return patchEl(doc, face, id, { x: (W - elementBox(el).w) / 2 });
}

export type TextPreset = 'heading' | 'body' | 'script';

export function makeText(doc: CardDoc, face: FaceKey, preset: TextPreset): TextEl {
  const { w: W, h: H } = cardSize(doc.orientation);
  const n = doc[face].elements.length;
  const base = { id: uid(), type: 'text' as const, align: 'center' as const, bold: false, italic: false, spacing: 0, x: W * 0.12, w: W * 0.76, y: H * 0.4 + (n % 5) * 34, color: '#2B2622' };
  if (preset === 'heading') return { ...base, text: 'Your heading', font: 'Playfair Display', size: 96, lineHeight: 1.14 };
  if (preset === 'script') return { ...base, text: 'With love', font: 'Great Vibes', size: 120, lineHeight: 1.08 };
  return { ...base, text: 'Write something from the heart.', font: 'Cormorant Garamond', size: 42, lineHeight: 1.4 };
}

export function makeImage(doc: CardDoc, src: string, iw: number, ih: number): ImageEl {
  const { w: W, h: H } = cardSize(doc.orientation);
  const max = Math.min(W, H) * 0.6;
  const s = Math.min(max / iw, max / ih);
  const w = iw * s, h = ih * s;
  return { id: uid(), type: 'image', src, x: (W - w) / 2, y: (H - h) / 2, w, h, zoom: 1, ox: 0, oy: 0, filter: 'none', shape: 'rect', frame: 'white' };
}

export function makeSticker(doc: CardDoc, face: FaceKey, kind: string, color: string): StickerEl {
  const { w: W, h: H } = cardSize(doc.orientation);
  const n = doc[face].elements.length;
  const s = 150;
  return { id: uid(), type: 'sticker', kind, color, x: (W - s) / 2 + ((n % 4) - 1.5) * 40, y: H * 0.18 + (n % 3) * 30, w: s, h: s };
}
