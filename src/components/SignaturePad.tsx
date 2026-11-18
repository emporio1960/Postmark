// Draw a signature with a finger, stylus or mouse. Saved as a tightly
// cropped transparent PNG that stays on this device.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Eraser } from 'lucide-react';
import { cx } from '../lib/utils';
import { Button, Modal } from './ui';

const INKS = ['#2B2622', '#1F2A44', '#A8843F', '#8E2F3C'];

export function SignaturePad({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [ink, setInk] = useState(INKS[0]);
  const [empty, setEmpty] = useState(true);
  const [error, setError] = useState('');

  const clear = () => {
    const c = ref.current; if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setEmpty(true); setError('');
  };
  useEffect(() => { if (open) { clear(); } }, [open]);

  const point = (e: RPointerEvent) => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const down = (e: RPointerEvent) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = point(e); last.current = p;
    const ctx = ref.current!.getContext('2d')!;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
    setEmpty(false); setError('');
  };
  const moveTo = (e: RPointerEvent) => {
    if (!last.current) return;
    const p = point(e), ctx = ref.current!.getContext('2d')!;
    ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure ? 3 + e.pressure * 7 : 7;
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const up = () => { last.current = null; };

  const save = () => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || x1 - x0 < 12) { setError('Please sign in the box first.'); return; }
    const pad = 12, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    out.getContext('2d')!.drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
    onSave(out.toDataURL('image/png'));
  };

  return (
    <Modal open={open} onClose={onClose} title="Your signature" wide footer={<>
      <Button onClick={clear} icon={<Eraser className="h-4 w-4" />} disabled={empty}>Clear</Button>
      <Button variant="primary" onClick={save}>Save signature</Button>
    </>}>
      <p className="mb-3 text-sm text-ink-soft">Sign with your finger, a stylus or the mouse. Your signature is kept on this device and can be added to any card.</p>
      <canvas ref={ref} width={1200} height={480} aria-label="Signature drawing area"
        onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up}
        className="w-full touch-none rounded-2xl border-2 border-dashed border-gold-400 bg-white" style={{ aspectRatio: '1200 / 480' }} />
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-ink-mute">Ink</span>
        {INKS.map((c) => <button key={c} type="button" aria-label={`Ink colour ${c}`} aria-pressed={ink === c} onClick={() => setInk(c)} className={cx('h-7 w-7 rounded-full border transition', ink === c ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-ivory-50' : 'border-ivory-400')} style={{ background: c }} />)}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rosewood">{error}</p>}
    </Modal>
  );
}
