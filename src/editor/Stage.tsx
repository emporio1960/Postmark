// The live editing surface: the card canvas plus a transparent overlay that
// handles selecting, moving, resizing, rotating and cropping with mouse or touch.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { RotateCw } from 'lucide-react';
import type { CardDoc, CardElement, FaceKey, ImageEl } from '../types';
import { cardSize } from '../types';
import { elementBox, renderFace, type Box } from '../render/renderer';
import { drawableSize, getDrawable, onAssetsChanged } from '../render/images';
import { clamp, cx } from '../lib/utils';
import { patchEl } from './ops';
import type { Apply } from './useHistory';

type Mode = 'move' | 'scale' | 'width' | 'rotate' | 'pan';
interface Drag {
  id: string; mode: Mode; sx: number; sy: number; start: CardElement; box: Box; key: string; moved: boolean;
  cx: number; cy: number; // element centre in client pixels (for rotation)
  extraX: number; extraY: number; // spare photo pixels (card units) available for panning
}

interface Props {
  doc: CardDoc; face: FaceKey; selectedId: string | null; cropMode: boolean;
  onSelect: (id: string | null) => void; onEditText: () => void; onToggleCrop: () => void; apply: Apply<CardDoc>;
}

/** How far a photo can be panned inside its frame, in card units. */
function panRoom(el: ImageEl): { x: number; y: number } {
  const d = getDrawable(el.src, 'none');
  if (!d) return { x: 0, y: 0 };
  const s = drawableSize(d), pad = el.frame === 'white' ? Math.min(el.w, el.h) * 0.05 : 0;
  const iw = el.w - pad * 2, ih = el.h - pad * 2, sc = Math.max(iw / s.w, ih / s.h) * el.zoom;
  return { x: s.w * sc - iw, y: s.h * sc - ih };
}

export function Stage({ doc, face, selectedId, cropMode, onSelect, onEditText, onToggleCrop, apply }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number; key: string } | null>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [guides, setGuides] = useState({ v: false, h: false });
  const [tick, setTick] = useState(0);
  const { w: W, h: H } = cardSize(doc.orientation);
  const scale = Math.max(0, Math.min(avail.w / W, avail.h / H));

  useEffect(() => onAssetsChanged(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setAvail({ w: Math.max(0, el.clientWidth - 32), h: Math.max(0, el.clientHeight - 56) });
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
    const target = e.currentTarget as HTMLElement;
    try { target.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const cropping = mode === 'move' && cropMode && el.type === 'image' && el.id === selectedId;
    if (cropping) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: (el as ImageEl).zoom, key: `pinch-${el.id}-${Date.now()}` };
        drag.current = null;
        return;
      }
    }
    const boxEl = (mode === 'move' ? target : target.parentElement) ?? target;
    const r = boxEl.getBoundingClientRect();
    const room = cropping ? panRoom(el as ImageEl) : { x: 0, y: 0 };
    drag.current = {
      id: el.id, mode: cropping ? 'pan' : mode, sx: e.clientX, sy: e.clientY, start: el, box: elementBox(el), key: `drag-${el.id}-${Date.now()}`, moved: false,
      cx: r.left + r.width / 2, cy: r.top + r.height / 2, extraX: room.x, extraY: room.y,
    };
  };

  const move = (e: RPointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinch.current;
    if (p && pointers.current.size >= 2 && selectedId) {
      e.stopPropagation();
      const [a, b] = [...pointers.current.values()];
      const zoom = clamp((p.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / p.dist, 1, 3);
      apply((d) => patchEl(d, face, selectedId, { zoom }), p.key, true);
      return;
    }
    const d = drag.current;
    if (!d || !scale) return;
    e.stopPropagation();
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
    d.moved = true;
    const s = d.start;
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    // The same movement expressed in the element's own (possibly rotated) frame.
    const t = ((s.rotation ?? 0) * Math.PI) / 180;
    const lx = dx * Math.cos(t) + dy * Math.sin(t), ly = -dx * Math.sin(t) + dy * Math.cos(t);
    if (d.mode === 'move') {
      let x = s.x + dx, y = s.y + dy;
      const snap = 9 / Math.max(scale, 0.2);
      const v = Math.abs(x + d.box.w / 2 - W / 2) < snap, h = Math.abs(y + d.box.h / 2 - H / 2) < snap;
      if (v) x = W / 2 - d.box.w / 2;
      if (h) y = H / 2 - d.box.h / 2;
      x = clamp(x, -d.box.w + 40, W - 40); y = clamp(y, -d.box.h + 40, H - 40);
      setGuides({ v, h });
      apply((doc) => patchEl(doc, face, d.id, { x, y }), d.key, true);
    } else if (d.mode === 'pan' && s.type === 'image') {
      const ox = d.extraX > 1 ? clamp(s.ox - (2 * lx) / d.extraX, -1, 1) : s.ox;
      const oy = d.extraY > 1 ? clamp(s.oy - (2 * ly) / d.extraY, -1, 1) : s.oy;
      apply((doc) => patchEl(doc, face, d.id, { ox, oy }), d.key, true);
    } else if (d.mode === 'rotate') {
      let a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI + 90;
      a = ((a + 540) % 360) - 180;
      const near = Math.round(a / 45) * 45;
      if (Math.abs(a - near) < 4) a = near;
      apply((doc) => patchEl(doc, face, d.id, { rotation: Math.round(a) }), d.key, true);
    } else if (d.mode === 'width') {
      apply((doc) => patchEl(doc, face, d.id, { w: clamp(s.w + lx, 60, W * 1.2) }), d.key, true);
    } else if (s.type === 'image') {
      apply((doc) => patchEl(doc, face, d.id, { w: clamp(s.w + lx, 50, W * 1.5), h: clamp(s.h + ly, 50, H * 1.5) }), d.key, true);
    } else {
      const f = clamp((d.box.w + lx) / d.box.w, 0.15, 8);
      if (s.type === 'text') apply((doc) => patchEl(doc, face, d.id, { w: s.w * f, size: clamp(Math.round(s.size * f), 10, 600) }), d.key, true);
      else apply((doc) => patchEl(doc, face, d.id, { w: clamp(s.w * f, 24, 1400), h: clamp(s.h * f, 24, 1400) }), d.key, true);
    }
  };

  const end = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    setGuides({ v: false, h: false });
  };

  const handle = 'absolute z-10 h-4 w-4 rounded-full border-2 border-gold-600 bg-white shadow-md before:absolute before:-inset-3 before:content-[""]';
  const grips = (el: CardElement, mode: Mode) => ({
    onPointerDown: (e: RPointerEvent) => begin(e, el, mode), onPointerMove: move, onPointerUp: end, onPointerCancel: end,
  });

  return (
    <div ref={wrap} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4" onPointerDown={() => onSelect(null)}>
      {scale > 0 && (
        <div className="relative shrink-0 shadow-card" style={{ width: W * scale, height: H * scale }}>
          <canvas ref={canvas} className="absolute inset-0 h-full w-full rounded-[3px]" role="img" aria-label={`Card ${face} – live preview`} />
          {guides.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-rosewood/70" />}
          {guides.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-rosewood/70" />}
          {doc[face].elements.map((el) => {
            const b = elementBox(el);
            const sel = el.id === selectedId;
            const cropping = sel && cropMode && el.type === 'image';
            const name = el.type === 'text' ? `Text: ${el.text.slice(0, 30)}` : el.type === 'image' ? 'Photo' : 'Sticker';
            return (
              <div
                key={el.id} role="button" tabIndex={0} aria-label={`${name}${sel ? ' (selected)' : ''}`} aria-pressed={sel}
                {...grips(el, 'move')}
                onDoubleClick={() => { if (el.type === 'text') onEditText(); else if (el.type === 'image') onToggleCrop(); }}
                onWheel={(e) => { if (cropping && el.type === 'image') apply((d) => patchEl(d, face, el.id, { zoom: clamp(el.zoom - e.deltaY * 0.002, 1, 3) }), `wheel-${el.id}`); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { onSelect(el.id); if (el.type === 'text') onEditText(); } }}
                className={cx('absolute touch-none select-none outline-none', cropping ? 'cursor-grab ring-2 ring-rosewood ring-offset-1 active:cursor-grabbing' : 'cursor-move',
                  !cropping && (sel ? 'ring-[1.5px] ring-gold-600' : 'hover:ring-1 hover:ring-gold-400/80 focus-visible:ring-1 focus-visible:ring-gold-500'))}
                style={{ left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
              >
                {sel && !cropping && (
                  <>
                    <span className={cx(handle, '-bottom-2 -right-2 cursor-nwse-resize')} aria-hidden {...grips(el, 'scale')} />
                    {el.type === 'text' && <span className={cx(handle, '-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize !rounded-md')} aria-hidden {...grips(el, 'width')} />}
                    <span className="pointer-events-none absolute -top-5 left-1/2 h-5 w-px bg-gold-600" aria-hidden />
                    <span className={cx(handle, '-top-9 left-1/2 flex !h-5 !w-5 -translate-x-1/2 cursor-grab items-center justify-center')} aria-hidden {...grips(el, 'rotate')}>
                      <RotateCw className="h-2.5 w-2.5 text-gold-700" />
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {cropMode && selectedId && (
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/85 px-3.5 py-1.5 text-[11px] font-medium text-ivory-50">
          Drag to reposition · pinch or scroll to zoom
        </p>
      )}
    </div>
  );
}
