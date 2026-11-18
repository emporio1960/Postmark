// Animated export: a short video of the card being opened.
import type { CardDoc } from '../types';
import { cardSize } from '../types';
import { loadImage } from './images';
import { renderToCanvas } from './renderer';

const TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

function pickType(): string | null {
  if (typeof MediaRecorder === 'undefined' || !('captureStream' in HTMLCanvasElement.prototype)) return null;
  return TYPES.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) ?? null;
}

export function canRecordVideo(): boolean { return pickType() !== null; }

const FRONT = 1300, FLIP = 1100, INSIDE = 2600;

/** Records roughly five seconds: the front, a flip, then the inside. */
export async function renderVideo(doc: CardDoc): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const type = pickType();
  if (!type) throw new Error('This browser cannot record video. Try the PNG or PDF export instead.');
  const srcs = new Set<string>();
  for (const f of [doc.front, doc.inside]) for (const el of f.elements) if (el.type === 'image') srcs.add(el.src);
  await Promise.allSettled([...srcs].map((s) => loadImage(s)));

  const { w, h } = cardSize(doc.orientation);
  const scale = 900 / Math.max(w, h);
  const front = renderToCanvas(doc, 'front', scale), inside = renderToCanvas(doc, 'inside', scale);
  const even = (n: number) => Math.round(n / 2) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = even(front.width * 1.24); canvas.height = even(front.height * 1.2);
  const ctx = canvas.getContext('2d')!;

  const draw = (t: number) => {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7);
    g.addColorStop(0, '#3A332D'); g.addColorStop(1, '#1D1917');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let p = (t - FRONT) / FLIP; p = Math.min(1, Math.max(0, p));
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const sx = Math.max(0.012, Math.abs(Math.cos(eased * Math.PI)));
    const face = eased < 0.5 ? front : inside;
    const lift = 1 + Math.sin(eased * Math.PI) * 0.05;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(sx * lift, lift);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.drawImage(face, -face.width / 2, -face.height / 2);
    ctx.restore();
  };

  draw(0);
  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => (chunks.length ? resolve(new Blob(chunks, { type: type.split(';')[0] })) : reject(new Error('The recording was empty. Please try again.')));
    recorder.onerror = () => reject(new Error('The video could not be recorded on this device.'));
  });
  recorder.start(200);
  const total = FRONT + FLIP + INSIDE;
  await new Promise<void>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      draw(t);
      if (t < total) setTimeout(tick, 1000 / 30); else resolve();
    };
    tick();
  });
  recorder.stop();
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: await done, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' };
}
