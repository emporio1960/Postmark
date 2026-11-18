// Full-screen preview with flip animation and every export option.
import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, Download, MessageSquareText, FileText, Maximize2, Printer, RefreshCw, Share2, X } from 'lucide-react';
import type { CardDoc, FaceKey } from '../types';
import { cardSize } from '../types';
import { useStore } from '../lib/store';
import { canPrint, canShare, canText, cardMessage, copyText, EMBEDDED, fileBase, printCard, renderPDF, renderPNG, saveBlob, shareCard, smsLink } from '../render/export';
import { CardCanvas } from './CardCanvas';
import { Button, IconButton, Segmented, useToast } from './ui';

export function PreviewModal({ doc, name, onClose }: { doc: CardDoc; name: string; onClose: () => void }) {
  const { settings } = useStore();
  const toast = useToast();
  const [face, setFace] = useState<FaceKey>('front');
  const [busy, setBusy] = useState<string | null>(null);
  const [saveImage, setSaveImage] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const { w, h } = cardSize(doc.orientation);
  const scale = settings.exportScale;
  const px = `${Math.round(w * scale)} × ${Math.round(h * scale)} px`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setFace((f) => (f === 'front' ? 'inside' : 'front')); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => () => { if (saveImage) URL.revokeObjectURL(saveImage); }, [saveImage]);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { toast((e as Error).message || 'Something went wrong. Please try again.', 'error'); }
    finally { setBusy(null); }
  };

  const downloadPNG = () => run('png', async () => {
    const blob = await renderPNG(doc, face, scale);
    const outcome = await saveBlob(blob, `${fileBase(name)}-${face}.png`);
    if (outcome === 'saved') toast(`${face === 'front' ? 'Front' : 'Inside'} saved as PNG`);
    else if (outcome === 'unavailable') setSaveImage(URL.createObjectURL(blob));
  });

  const downloadPDF = () => run('pdf', async () => {
    const blob = await renderPDF(doc, Math.max(scale, 1.5));
    const outcome = await saveBlob(blob, `${fileBase(name)}.pdf`);
    if (outcome === 'saved') toast('PDF saved – front and inside, at print size');
    else if (outcome === 'unavailable') toast('PDF download is blocked in this embedded preview. Open the app in its own tab to export PDFs.', 'error');
  });

  const share = () => run('share', async () => {
    const outcome = await shareCard(doc, name, scale, cardMessage(doc));
    if (outcome === 'unavailable') toast('Sharing is not supported in this browser. Download the card instead.', 'error');
  });

  const print = () => run('print', async () => { await printCard(doc); });

  const copy = () => run('copy', async () => {
    const text = cardMessage(doc);
    if (!text) { toast('There is no message inside this card yet.', 'error'); return; }
    const ok = await copyText(text);
    toast(ok ? 'Message copied' : 'Copying is blocked by the browser', ok ? 'ok' : 'error');
  });

  const textMessage = () => {
    const text = cardMessage(doc);
    if (!text) { toast('There is no message inside this card yet.', 'error'); return; }
    try { window.location.href = smsLink(text); } catch { toast('This device could not open a messaging app.', 'error'); }
  };

  const fullscreen = () => { try { (document.fullscreenElement ? document.exitFullscreen() : root.current?.requestFullscreen())?.catch?.(() => undefined); } catch { /* unsupported */ } };

  return (
    <div ref={root} className="fixed inset-0 z-[60] flex animate-fade flex-col bg-[#211D1A] text-ivory-50" role="dialog" aria-modal="true" aria-label={`Preview of ${name}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-300">Preview</p>
          <h2 className="truncate text-2xl font-semibold">{name}</h2>
        </div>
        <div className="flex items-center gap-1">
          {typeof document !== 'undefined' && document.fullscreenEnabled && !EMBEDDED && (
            <IconButton label="Toggle full screen" onClick={fullscreen} className="!text-ivory-200 hover:!bg-white/10"><Maximize2 className="h-5 w-5" /></IconButton>
          )}
          <IconButton label="Close preview" onClick={onClose} className="!text-ivory-200 hover:!bg-white/10"><X className="h-5 w-5" /></IconButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-2">
        <div className="flip-scene" style={{ width: `min(88vw, calc((100dvh - 250px) * ${w / h}))` }}>
          <button type="button" onClick={() => setFace((f) => (f === 'front' ? 'inside' : 'front'))} aria-label={`Showing the ${face}. Flip the card`}
            className={`flip-card block w-full ${face === 'inside' ? 'is-flipped' : ''}`} style={{ aspectRatio: `${w} / ${h}` }}>
            <span className="flip-face overflow-hidden rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"><CardCanvas doc={doc} face="front" eager label="Card front" /></span>
            <span className="flip-face back overflow-hidden rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"><CardCanvas doc={doc} face="inside" eager label="Card inside" /></span>
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 sm:px-6">
        <div className="flex items-center justify-center gap-3">
          <Segmented label="Card side" value={face} onChange={setFace} options={[{ id: 'front', label: 'Front' }, { id: 'inside', label: 'Inside' }]} />
          <Button size="sm" variant="ghost" className="!text-ivory-200 hover:!bg-white/10" onClick={() => setFace((f) => (f === 'front' ? 'inside' : 'front'))} icon={<RefreshCw className="h-3.5 w-3.5" />}>Flip</Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" busy={busy === 'png'} onClick={downloadPNG} icon={<Download className="h-4 w-4" />}>PNG ({face})</Button>
          <Button busy={busy === 'pdf'} onClick={downloadPDF} icon={<FileText className="h-4 w-4" />}>PDF</Button>
          {canShare() && <Button busy={busy === 'share'} onClick={share} icon={<Share2 className="h-4 w-4" />}>Share</Button>}
          {canPrint() && <Button busy={busy === 'print'} onClick={print} icon={<Printer className="h-4 w-4" />}>Print</Button>}
          {canText() && <Button onClick={textMessage} icon={<MessageSquareText className="h-4 w-4" />}>Text the message</Button>}
          <Button busy={busy === 'copy'} onClick={copy} icon={<ClipboardCopy className="h-4 w-4" />}>Copy message</Button>
        </div>
        <p className="text-center text-[11px] text-ivory-300/70">Exports at {px} · {w / 200} × {h / 200} in. Change quality in Settings.</p>
      </div>

      {saveImage && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#211D1A]/95 p-6 text-center">
          <p className="max-w-sm text-sm text-ivory-200">This preview window can’t start downloads. <strong>Press and hold</strong> (or right-click) the image below and choose <strong>Save image</strong> — it is the full-resolution export.</p>
          <img src={saveImage} alt={`${name} – ${face}`} className="max-h-[60dvh] max-w-full rounded-md shadow-lift" />
          <Button onClick={() => setSaveImage(null)}>Done</Button>
        </div>
      )}
    </div>
  );
}
