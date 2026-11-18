// Full-screen preview with flip animation, envelope designer and every
// way of saving or sending a card.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ClipboardCopy, Clapperboard, Download, FileText, Link2, Mail, Maximize2, MessageCircle, MessageSquareText, Printer, RefreshCw, Share2, X } from 'lucide-react';
import type { CardDoc, EnvelopeSpec, FaceKey } from '../types';
import { cardSize } from '../types';
import { useStore } from '../lib/store';
import { cardLink } from '../lib/share';
import { canPrint, canShare, canText, cardMessage, copyText, EMBEDDED, fileBase, printCard, renderPDF, renderPNG, saveBlob, shareCard, smsLink } from '../render/export';
import { canRecordVideo, renderVideo } from '../render/video';
import { ENVELOPE, ENVELOPE_STYLES, renderEnvelope } from '../render/envelope';
import { onAssetsChanged } from '../render/images';
import { CardCanvas } from './CardCanvas';
import { Button, Chip, IconButton, Segmented, useToast } from './ui';

type View = FaceKey | 'envelope';
interface Props { doc: CardDoc; name: string; recipient?: string; envelope?: EnvelopeSpec; onEnvelopeChange?: (e: EnvelopeSpec) => void; onClose: () => void }

function EnvelopeCanvas({ doc, spec }: { doc: CardDoc; spec: EnvelopeSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => onAssetsChanged(() => setTick((t) => t + 1)), []);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const src = renderEnvelope(doc, spec, Math.min(1.2, ((c.clientWidth || 600) * Math.min(window.devicePixelRatio || 1, 2)) / ENVELOPE.w));
    c.width = src.width; c.height = src.height;
    c.getContext('2d')?.drawImage(src, 0, 0);
  }, [doc, spec, tick]);
  return <canvas ref={ref} role="img" aria-label="Envelope preview" className="block h-full w-full rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]" />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300">{label}</span>
      <div className="no-scrollbar -mr-4 flex flex-1 gap-2 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:pr-0">{children}</div>
    </div>
  );
}

export function PreviewModal({ doc, name, recipient, envelope, onEnvelopeChange, onClose }: Props) {
  const { settings } = useStore();
  const toast = useToast();
  const [view, setView] = useState<View>('front');
  const [busy, setBusy] = useState<string | null>(null);
  const [saveImage, setSaveImage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null | undefined>(undefined);
  const [env, setEnv] = useState<EnvelopeSpec>(envelope ?? { name: recipient ?? '', lines: '', style: 'match' });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const face: FaceKey = view === 'inside' ? 'inside' : 'front';
  const isEnv = view === 'envelope';
  const { w, h } = isEnv ? ENVELOPE : cardSize(doc.orientation);
  const scale = settings.exportScale;
  const message = useMemo(() => cardMessage(doc), [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setView((v) => (v === 'front' ? 'inside' : 'front'));
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    const el = stage.current; if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { let alive = true; cardLink(doc).then((l) => { if (alive) setLink(l); }).catch(() => { if (alive) setLink(null); }); return () => { alive = false; }; }, [doc]);
  useEffect(() => () => { if (saveImage) URL.revokeObjectURL(saveImage); }, [saveImage]);

  const updateEnv = (patch: Partial<EnvelopeSpec>) => { const next = { ...env, ...patch }; setEnv(next); onEnvelopeChange?.(next); };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } catch (e) { toast((e as Error).message || 'Something went wrong. Please try again.', 'error'); }
    finally { setBusy(null); }
  };

  const downloadPNG = () => run('png', async () => {
    let blob: Blob;
    if (isEnv) {
      if (document.fonts?.ready) await document.fonts.ready;
      const c = renderEnvelope(doc, env, scale);
      blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('The envelope image could not be created.'))), 'image/png'));
    } else blob = await renderPNG(doc, face, scale);
    const outcome = await saveBlob(blob, `${fileBase(name)}-${view}.png`);
    if (outcome === 'saved') toast(`${view[0].toUpperCase() + view.slice(1)} saved as PNG`);
    else if (outcome === 'unavailable') setSaveImage(URL.createObjectURL(blob));
  });

  const downloadPDF = () => run('pdf', async () => {
    const outcome = await saveBlob(await renderPDF(doc, Math.max(scale, 1.5)), `${fileBase(name)}.pdf`);
    if (outcome === 'saved') toast('PDF saved – front and inside, at print size');
    else if (outcome === 'unavailable') toast('PDF download is blocked in this embedded preview. Open the app in its own tab to export PDFs.', 'error');
  });

  const downloadVideo = () => run('video', async () => {
    const { blob, ext } = await renderVideo(doc);
    const outcome = await saveBlob(blob, `${fileBase(name)}.${ext}`);
    if (outcome === 'saved') toast('Video of your card saved');
    else if (outcome === 'unavailable') toast('Video download is blocked in this embedded preview.', 'error');
  });

  const share = () => run('share', async () => {
    const outcome = await shareCard(doc, name, scale, message);
    if (outcome === 'unavailable') toast('Sharing is not supported in this browser. Download the card instead.', 'error');
  });

  const copy = (what: 'message' | 'link') => run(what, async () => {
    const text = what === 'link' ? link : message;
    if (!text) { toast(what === 'link' ? 'This card is too large for a link.' : 'There is no message inside this card yet.', 'error'); return; }
    const ok = await copyText(text);
    toast(ok ? (what === 'link' ? 'Card link copied' : 'Message copied') : 'Copying is blocked by the browser', ok ? 'ok' : 'error');
  });

  // What gets sent through messaging apps: the link when the card fits in one, otherwise its words.
  const sendText = link ? `I made you a card 💌\n${link}` : message;
  const open = (url: string, sameTab = false) => {
    if (!sendText) { toast('Add a message inside the card first.', 'error'); return; }
    try { if (sameTab) window.location.href = url; else if (!window.open(url, '_blank', 'noopener')) window.location.href = url; }
    catch { toast('This device could not open that app.', 'error'); }
  };

  const fullscreen = () => { try { (document.fullscreenElement ? document.exitFullscreen() : root.current?.requestFullscreen())?.catch?.(() => undefined); } catch { /* unsupported */ } };

  const fit = Math.min((box.w - 24) / w, (box.h - 16) / h);
  const size = fit > 0 ? { width: w * fit, height: h * fit } : { width: 0, height: 0 };
  const dark = '!text-ivory-200 hover:!bg-white/10';
  const linkNote = link === null ? 'This card includes photos, so it is too large for a link – messaging buttons send its words, and Share sends the images.' : '';

  return (
    <div ref={root} className="fixed inset-0 z-[60] flex animate-fade flex-col bg-[#211D1A] text-ivory-50" role="dialog" aria-modal="true" aria-label={`Preview of ${name}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-300">Preview</p>
          <h2 className="truncate text-2xl font-semibold">{name}</h2>
        </div>
        <div className="flex items-center gap-1">
          {typeof document !== 'undefined' && document.fullscreenEnabled && !EMBEDDED && (
            <IconButton label="Toggle full screen" onClick={fullscreen} className={dark}><Maximize2 className="h-5 w-5" /></IconButton>
          )}
          <IconButton label="Close preview" onClick={onClose} className={dark}><X className="h-5 w-5" /></IconButton>
        </div>
      </div>

      <div ref={stage} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        {size.width > 0 && (isEnv ? (
          <div style={size}><EnvelopeCanvas doc={doc} spec={env} /></div>
        ) : (
          <div className="flip-scene" style={size}>
            <button type="button" onClick={() => setView((v) => (v === 'front' ? 'inside' : 'front'))} aria-label={`Showing the ${face}. Flip the card`}
              className={`flip-card block h-full w-full ${face === 'inside' ? 'is-flipped' : ''}`}>
              <span className="flip-face overflow-hidden rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"><CardCanvas doc={doc} face="front" eager label="Card front" /></span>
              <span className="flip-face back overflow-hidden rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"><CardCanvas doc={doc} face="inside" eager label="Card inside" /></span>
            </button>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-3xl shrink-0 space-y-2.5 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <Segmented<View> label="What to preview" value={view} onChange={setView} options={[{ id: 'front', label: 'Front' }, { id: 'inside', label: 'Inside' }, { id: 'envelope', label: 'Envelope' }]} />
          {!isEnv && <IconButton label="Flip the card" className={dark} onClick={() => setView((v) => (v === 'front' ? 'inside' : 'front'))}><RefreshCw className="h-4 w-4" /></IconButton>}
        </div>

        {isEnv && (
          <div className="grid gap-2 rounded-2xl bg-white/5 p-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300">Addressed to</span>
              <input className="field !border-white/15 !bg-white/10 !text-ivory-50 placeholder:!text-ivory-300/50" value={env.name} maxLength={50} placeholder="Recipient name" onChange={(e) => updateEnv({ name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300">Address (optional)</span>
              <textarea className="field !border-white/15 !bg-white/10 !text-ivory-50 placeholder:!text-ivory-300/50" rows={2} value={env.lines} maxLength={220} placeholder={'12 Wattle Street\nAdelaide SA 5000'} onChange={(e) => updateEnv({ lines: e.target.value })} />
            </label>
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {ENVELOPE_STYLES.map((s) => <Chip key={s.id} active={env.style === s.id} onClick={() => updateEnv({ style: s.id })}>{s.label}</Chip>)}
            </div>
          </div>
        )}

        <Row label="Save">
          <Button size="sm" variant="primary" busy={busy === 'png'} onClick={downloadPNG} icon={<Download className="h-3.5 w-3.5" />} className="shrink-0">PNG ({view})</Button>
          <Button size="sm" busy={busy === 'pdf'} onClick={downloadPDF} icon={<FileText className="h-3.5 w-3.5" />} className="shrink-0">PDF</Button>
          {canRecordVideo() && <Button size="sm" busy={busy === 'video'} onClick={downloadVideo} icon={<Clapperboard className="h-3.5 w-3.5" />} className="shrink-0">{busy === 'video' ? 'Recording…' : 'Video'}</Button>}
          {canPrint() && <Button size="sm" busy={busy === 'print'} onClick={() => run('print', () => printCard(doc))} icon={<Printer className="h-3.5 w-3.5" />} className="shrink-0">Print</Button>}
        </Row>
        <Row label="Send">
          {canShare() && <Button size="sm" busy={busy === 'share'} onClick={share} icon={<Share2 className="h-3.5 w-3.5" />} className="shrink-0">Share</Button>}
          {!EMBEDDED && link && <Button size="sm" busy={busy === 'link'} onClick={() => copy('link')} icon={<Link2 className="h-3.5 w-3.5" />} className="shrink-0">Copy link</Button>}
          {!EMBEDDED && <Button size="sm" onClick={() => open(`https://wa.me/?text=${encodeURIComponent(sendText)}`)} icon={<MessageCircle className="h-3.5 w-3.5" />} className="shrink-0">WhatsApp</Button>}
          {!EMBEDDED && <Button size="sm" onClick={() => open(`mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(sendText)}`, true)} icon={<Mail className="h-3.5 w-3.5" />} className="shrink-0">Email</Button>}
          {canText() && <Button size="sm" onClick={() => open(smsLink(sendText), true)} icon={<MessageSquareText className="h-3.5 w-3.5" />} className="shrink-0">Text</Button>}
          <Button size="sm" busy={busy === 'message'} onClick={() => copy('message')} icon={<ClipboardCopy className="h-3.5 w-3.5" />} className="shrink-0">Copy message</Button>
        </Row>
        <p className="text-center text-[11px] leading-snug text-ivory-300/70">
          {linkNote || `Exports at ${Math.round(w * scale)} × ${Math.round(h * scale)} px · ${w / 200} × ${h / 200} in.${link ? ' WhatsApp, Email and Text send a link that opens this card.' : ''}`}
        </p>
      </div>

      {saveImage && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#211D1A]/95 p-6 text-center">
          <p className="max-w-sm text-sm text-ivory-200">This preview window can’t start downloads. <strong>Press and hold</strong> (or right-click) the image below and choose <strong>Save image</strong> — it is the full-resolution export.</p>
          <img src={saveImage} alt={`${name} – ${view}`} className="max-h-[60dvh] max-w-full rounded-md shadow-lift" />
          <Button onClick={() => setSaveImage(null)}>Done</Button>
        </div>
      )}
    </div>
  );
}
