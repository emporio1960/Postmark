// The live editing surface: the card canvas plus a transparent overlay that
// handles selecting, moving and resizing elements with mouse or touch.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { CardDoc, CardElement, FaceKey } from '../types';
import { cardSize } from '../types';
import { elementBox, renderFace, type Box } from '../render/renderer';
import { onAssetsChanged } from '../render/images';
import { clamp, cx } from '../lib/utils';
import { patchEl } from './ops';
import type { Apply } from './useHistory';

type Mode = 'move' | 'scale' | 'width';
interface Drag { id: string; mode: Mode; sx: number; sy: number; start: CardElement; box: Box; key: string; moved: boolean }

interface Props {
  doc: CardDoc; face: FaceKey; selectedId: string | null;
  onSelect: (id: string | null) => void; onEditText: () => void; apply: Apply<CardDoc>;
}

export function Stage({ doc, face, selectedId, onSelect, onEditText, apply }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [guides, setGuides] = useState({ v: false, h: false });
  const [tick, setTick] = useState(0);
  const { w: W, h: H } = cardSize(doc.orientation);
  const scale = Math.max(0, Math.min(avail.w / W, avail.h / H));

  useEffect(() => onAssetsChanged(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setAvail({ w: Math.max(0, el.clientWidth - 32), h: Math.max(0, el.clientHeight - 32) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !scale) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pw = Math.round(W * scale * dpr), ph = Math.round(H * scale * dpr);
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    const ctx = c.getContext('2d');
    if (ctx) renderFace(ctx, doc[face], doc.orientation, scale * dpr);
  }, [doc, face, scale, W, H, tick]);

  const begin = (e: RPointerEvent, el: CardElement, mode: Mode) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    onSelect(el.id);
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    drag.current = { id: el.id, mode, sx: e.clientX, sy: e.clientY, start: el, box: elementBox(el), key: `drag-${el.id}-${Date.now()}`, moved: false };
  };

  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || !scale) return;
    e.stopPropagation();
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
    d.moved = true;
    const s = d.start;
    if (d.mode === 'move') {
      let x = s.x + dx, y = s.y + dy;
      const snap = 9 / Math.max(scale, 0.2);
      const v = Math.abs(x + d.box.w / 2 - W / 2) < snap, h = Math.abs(y + d.box.h / 2 - H / 2) < snap;
      if (v) x = W / 2 - d.box.w / 2;
      if (h) y = H / 2 - d.box.h / 2;
      x = clamp(x, -d.box.w + 40, W - 40); y = clamp(y, -d.box.h + 40, H - 40);
      setGuides({ v, h });
      apply((doc) => patchEl(doc, face, d.id, { x, y }), d.key, true);
    } else if (d.mode === 'width') {
      apply((doc) => patchEl(doc, face, d.id, { w: clamp(s.w + dx, 60, W * 1.2) }), d.key, true);
    } else if (s.type === 'image') {
      apply((doc) => patchEl(doc, face, d.id, { w: clamp(s.w + dx, 50, W * 1.5), h: clamp(s.h + dy, 50, H * 1.5) }), d.key, true);
    } else {
      const f = clamp((d.box.w + dx) / d.box.w, 0.15, 8);
      if (s.type === 'text') apply((doc) => patchEl(doc, face, d.id, { w: s.w * f, size: clamp(Math.round(s.size * f), 10, 600) }), d.key, true);
      else apply((doc) => patchEl(doc, face, d.id, { w: clamp(s.w * f, 24, 1400), h: clamp(s.h * f, 24, 1400) }), d.key, true);
    }
  };

  const end = (e: RPointerEvent) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    setGuides({ v: false, h: false });
  };

  const handle = 'absolute z-10 h-4 w-4 rounded-full border-2 border-gold-600 bg-white shadow-md before:absolute before:-inset-3 before:content-[""]';

  return (
    <div ref={wrap} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4" onPointerDown={() => onSelect(null)}>
      {scale > 0 && (
        <div className="relative shrink-0 shadow-card" style={{ width: W * scale, height: H * scale }}>
          <canvas ref={canvas} className="absolute inset-0 h-full w-full rounded-[3px]" role="img" aria-label={`Card ${face} – live preview`} />
          {guides.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-rosewood/70" />}
          {guides.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-rosewood/70" />}
          {doc[face].elements.map((el) => {
            const b = elementBox(el);
            const sel = el.id === selectedId;
            const name = el.type === 'text' ? `Text: ${el.text.slice(0, 30)}` : el.type === 'image' ? 'Photo' : 'Sticker';
            return (
              <div
                key={el.id} role="button" tabIndex={0} aria-label={`${name}${sel ? ' (selected)' : ''}`} aria-pressed={sel}
                onPointerDown={(e) => begin(e, el, 'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
                onDoubleClick={() => { if (el.type === 'text') onEditText(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { onSelect(el.id); if (el.type === 'text') onEditText(); } }}
                className={cx('absolute cursor-move touch-none select-none outline-none', sel ? 'ring-[1.5px] ring-gold-600' : 'hover:ring-1 hover:ring-gold-400/80 focus-visible:ring-1 focus-visible:ring-gold-500')}
                style={{ left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale }}
              >
                {sel && (
                  <>
                    <span className={cx(handle, '-bottom-2 -right-2 cursor-nwse-resize')} aria-hidden
                      onPointerDown={(e) => begin(e, el, 'scale')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
                    {el.type === 'text' && (
                      <span className={cx(handle, '-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize !rounded-md')} aria-hidden
                        onPointerDown={(e) => begin(e, el, 'width')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
