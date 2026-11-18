// Export helpers: PNG, PDF (dependency-free writer), Web Share and print.
import type { CardDoc, FaceKey } from '../types';
import { cardSize } from '../types';
import { loadImage } from './images';
import { renderToCanvas } from './renderer';
import { slugify } from '../lib/utils';

/** True when the app runs inside another page's frame (e.g. a hosted preview). */
export const EMBEDDED: boolean = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

type HostDownloads = { save(req: { filename: string; data: Blob }): Promise<{ status: string }> };
let hostDownloads: Promise<HostDownloads | null> | null = null;

/** Some hosts provide their own save dialog for framed pages; use it when present. */
function getHostDownloads(): Promise<HostDownloads | null> {
  if (!hostDownloads) {
    const host = (window as unknown as { claude?: { use?: (n: string) => Promise<HostDownloads | null> } }).claude;
    hostDownloads = host?.use ? host.use('downloads').catch(() => null) : Promise.resolve(null);
  }
  return hostDownloads;
}

export type SaveOutcome = 'saved' | 'cancelled' | 'unavailable';

/** Make sure every photo in the card is decoded before exporting. */
async function ensureImages(doc: CardDoc) {
  const srcs = new Set<string>();
  for (const f of [doc.front, doc.inside]) for (const el of f.elements) if (el.type === 'image') srcs.add(el.src);
  await Promise.allSettled([...srcs].map((s) => loadImage(s)));
  if (document.fonts?.ready) await document.fonts.ready;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Your browser could not create the image. Try a smaller export size.'))), type, quality);
  });
}

export async function saveBlob(blob: Blob, filename: string): Promise<SaveOutcome> {
  const host = await getHostDownloads();
  if (host) {
    try { await host.save({ filename, data: blob }); return 'saved'; }
    catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'cancelled';
      return 'unavailable';
    }
  }
  if (EMBEDDED) return 'unavailable';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
}

export function fileBase(name: string): string { return slugify(name || 'greeting-card'); }

export async function renderPNG(doc: CardDoc, face: FaceKey, scale: number): Promise<Blob> {
  await ensureImages(doc);
  return toBlob(renderToCanvas(doc, face, scale), 'image/png');
}

/** Minimal PDF writer: one page per face, each a full-bleed JPEG at print size. */
export async function renderPDF(doc: CardDoc, scale: number): Promise<Blob> {
  await ensureImages(doc);
  const { w, h } = cardSize(doc.orientation);
  const pw = (w * 72) / 200, ph = (h * 72) / 200; // 200 card units per inch
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes); pos += bytes.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = pos; push(`${n} 0 obj\n`);
    if (typeof body === 'string') push(body); else body();
    push('\nendobj\n');
  };
  const faces: FaceKey[] = ['front', 'inside'];
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${faces.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${faces.length} >>`);
  for (let i = 0; i < faces.length; i++) {
    const canvas = renderToCanvas(doc, faces[i], scale);
    const jpeg = new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.94)).arrayBuffer());
    const page = 3 + i * 3, content = page + 1, image = page + 2;
    const stream = `q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} 0 0 cm /Im0 Do Q`;
    obj(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    obj(content, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    obj(image, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
      push(jpeg); push('\nendstream');
    });
  }
  const total = 2 + faces.length * 3;
  const xref = pos;
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= total; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export function canShare(): boolean {
  return !EMBEDDED && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareCard(doc: CardDoc, name: string, scale: number, text: string): Promise<SaveOutcome> {
  if (!canShare()) return 'unavailable';
  const base = fileBase(name);
  const files = [
    new File([await renderPNG(doc, 'front', scale)], `${base}-front.png`, { type: 'image/png' }),
    new File([await renderPNG(doc, 'inside', scale)], `${base}-inside.png`, { type: 'image/png' }),
  ];
  try {
    if (navigator.canShare?.({ files })) await navigator.share({ files, title: name, text });
    else await navigator.share({ title: name, text: text || name });
    return 'saved';
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    throw new Error('Sharing was blocked by the browser. You can download the card instead.');
  }
}

export function canPrint(): boolean { return !EMBEDDED && typeof window.print === 'function'; }

/** Print both faces, one per page, at the card's real size. */
export async function printCard(doc: CardDoc): Promise<void> {
  await ensureImages(doc);
  const { w, h } = cardSize(doc.orientation);
  const root = document.createElement('div');
  root.id = 'print-root';
  const style = document.createElement('style');
  style.textContent = `@page { size: ${w / 200 + 1}in ${h / 200 + 1}in; margin: 0.5in; }`;
  root.appendChild(style);
  for (const face of ['front', 'inside'] as FaceKey[]) {
    const img = document.createElement('img');
    img.src = renderToCanvas(doc, face, 1.5).toDataURL('image/png');
    img.alt = `Card ${face}`;
    img.style.width = `${w / 200}in`; img.style.height = `${h / 200}in`;
    root.appendChild(img);
  }
  document.body.appendChild(root);
  await Promise.all([...root.querySelectorAll('img')].map((i) => (i.decode ? i.decode().catch(() => undefined) : undefined)));
  const cleanup = () => { root.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 60_000);
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove();
    return ok;
  } catch { return false; }
}

/** All the words written inside a card, for "copy message". */
export function cardMessage(doc: CardDoc): string {
  return doc.inside.elements.filter((e) => e.type === 'text').map((e) => (e.type === 'text' ? e.text.trim() : '')).filter(Boolean).join('\n\n');
}

/** Texting is offered on phones/tablets outside embedded frames. */
export function canText(): boolean {
  if (EMBEDDED || typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

/** Opens the device's messaging app with the text prefilled (images can't be attached this way). */
export function smsLink(text: string): string {
  const ios = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  return `sms:${ios ? '&' : '?'}body=${encodeURIComponent(text)}`;
}
