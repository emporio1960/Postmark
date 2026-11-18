// Draws one face of a card onto a canvas that fills its parent's width.
// Rendering is deferred until the canvas is near the viewport.
import { memo, useEffect, useRef, useState } from 'react';
import type { CardDoc, FaceKey } from '../types';
import { cardSize } from '../types';
import { renderFace } from '../render/renderer';
import { onAssetsChanged } from '../render/images';
import { cx } from '../lib/utils';

interface Props { doc: CardDoc; face?: FaceKey; className?: string; label?: string; eager?: boolean }

function CardCanvasImpl({ doc, face = 'front', className, label, eager }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(!!eager);
  const [tick, setTick] = useState(0);
  const { w, h } = cardSize(doc.orientation);

  useEffect(() => onAssetsChanged(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
    let io: IntersectionObserver | undefined;
    if (!eager && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io?.disconnect(); } }, { rootMargin: '300px' });
      io.observe(el);
    } else setVisible(true);
    return () => { ro?.disconnect(); io?.disconnect(); };
  }, [eager]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !width || !visible) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const scale = (width * dpr) / w;
    const pw = Math.round(w * scale), ph = Math.round(h * scale);
    if (el.width !== pw || el.height !== ph) { el.width = pw; el.height = ph; }
    const ctx = el.getContext('2d');
    if (ctx) renderFace(ctx, doc[face], doc.orientation, scale);
  }, [doc, face, width, visible, tick, w, h]);

  return (
    <canvas
      ref={ref} role="img" aria-label={label ?? 'Card preview'}
      className={cx('block w-full bg-ivory-200', className)} style={{ aspectRatio: `${w} / ${h}` }}
    />
  );
}

export const CardCanvas = memo(CardCanvasImpl);
