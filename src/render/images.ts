// Image loading, caching, simple pixel filters and upload processing.
// Photos are kept on the device as data URLs – nothing is uploaded anywhere.
import type { PhotoFilter } from '../types';
import { clamp } from '../lib/utils';

type Drawable = HTMLImageElement | HTMLCanvasElement;

const images = new Map<string, HTMLImageElement | 'loading' | 'error'>();
const filtered = new Map<string, HTMLCanvasElement>();
const listeners = new Set<() => void>();

/** Subscribe to "something finished loading, please redraw" notifications. */
export function onAssetsChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export function notifyAssetsChanged() { listeners.forEach((l) => l()); }

function load(src: string) {
  images.set(src, 'loading');
  const img = new Image();
  img.onload = () => { images.set(src, img); notifyAssetsChanged(); };
  img.onerror = () => { images.set(src, 'error'); notifyAssetsChanged(); };
  img.src = src;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const cached = images.get(src);
    if (cached && typeof cached !== 'string') return resolve(cached);
    const img = new Image();
    img.onload = () => { images.set(src, img); resolve(img); };
    img.onerror = () => { images.set(src, 'error'); reject(new Error('This image could not be read.')); };
    img.src = src;
  });
}

export const FILTERS: { id: PhotoFilter; label: string }[] = [
  { id: 'none', label: 'Original' }, { id: 'mono', label: 'Mono' }, { id: 'sepia', label: 'Sepia' },
  { id: 'warm', label: 'Warm' }, { id: 'cool', label: 'Cool' }, { id: 'vivid', label: 'Vivid' }, { id: 'fade', label: 'Fade' },
];

function applyFilter(d: Uint8ClampedArray, f: PhotoFilter) {
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    switch (f) {
      case 'mono': r = g = b = clamp((l - 128) * 1.08 + 128, 0, 255); break;
      case 'sepia': {
        const nr = 0.393 * r + 0.769 * g + 0.189 * b, ng = 0.349 * r + 0.686 * g + 0.168 * b, nb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = nr; g = ng; b = nb; break;
      }
      case 'warm': r = r * 1.08 + 8; g = g * 1.01; b = b * 0.9; break;
      case 'cool': r = r * 0.92; g = g * 1.0; b = b * 1.08 + 6; break;
      case 'vivid': r = (l + (r - l) * 1.4 - 128) * 1.1 + 128; g = (l + (g - l) * 1.4 - 128) * 1.1 + 128; b = (l + (b - l) * 1.4 - 128) * 1.1 + 128; break;
      case 'fade': r = (l + (r - l) * 0.8) * 0.84 + 30; g = (l + (g - l) * 0.8) * 0.84 + 30; b = (l + (b - l) * 0.8) * 0.84 + 34; break;
      default: break;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

/** Returns something drawable right now, or undefined while the photo loads. */
export function getDrawable(src: string, filter: PhotoFilter): Drawable | undefined {
  const entry = images.get(src);
  if (!entry) { load(src); return undefined; }
  if (typeof entry === 'string') return undefined;
  if (filter === 'none') return entry;
  const key = filter + '|' + src;
  const hit = filtered.get(key);
  if (hit) return hit;
  try {
    const c = document.createElement('canvas');
    c.width = entry.naturalWidth; c.height = entry.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(entry, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    applyFilter(data.data, filter);
    ctx.putImageData(data, 0, 0);
    if (filtered.size > 24) filtered.delete(filtered.keys().next().value as string);
    filtered.set(key, c);
    return c;
  } catch {
    return entry;
  }
}

export function imageFailed(src: string): boolean { return images.get(src) === 'error'; }

export function drawableSize(d: Drawable): { w: number; h: number } {
  return d instanceof HTMLImageElement ? { w: d.naturalWidth, h: d.naturalHeight } : { w: d.width, h: d.height };
}

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_DIMENSION = 1800;

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('The file could not be read.'));
    r.readAsDataURL(file);
  });
}

/**
 * Validates an uploaded photo, scales it to a sensible working size and
 * returns a data URL plus its dimensions. Throws a friendly Error otherwise.
 */
export async function processUpload(file: File): Promise<{ src: string; w: number; h: number }> {
  const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|svg)$/i.test(file.name);
  if (!looksLikeImage) throw new Error('Please choose an image file (JPG, PNG, WebP, GIF or similar).');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That photo is larger than 30 MB. Please choose a smaller one.');
  const raw = await readAsDataURL(file);
  let img: HTMLImageElement;
  try { img = await loadImage(raw); } catch {
    throw new Error('Your browser could not open this image format. Try a JPG or PNG instead.');
  }
  const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(iw, ih));
  const keepAlpha = /png|webp|gif|svg/i.test(file.type);
  if (scale === 1 && file.size < 1.5 * 1024 * 1024 && !/svg/i.test(file.type)) return { src: raw, w: iw, h: ih };
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(iw * scale)); c.height = Math.max(1, Math.round(ih * scale));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const src = keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
  images.delete(raw);
  return { src, w: c.width, h: c.height };
}
