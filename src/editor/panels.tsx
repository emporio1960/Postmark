// Editor side panels: design, text, photos and decorative elements.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, Bold, BringToFront, Copy, Crop, ImagePlus, Italic, PenTool, QrCode, RectangleHorizontal,
  RectangleVertical, Replace, SendToBack, Shuffle, Square, Trash2, Type,
} from 'lucide-react';
import type { Align, ArtKind, BorderKind, CardDoc, CardElement, FaceKey, ImageEl, Orientation, PhotoFrame, PhotoShape, StickerEl, TextEl } from '../types';
import { cx } from '../lib/utils';
import { FONTS } from '../data/fonts';
import { buildTemplate, reflow, TEMPLATES, templatePreview } from '../data/templates';
import { ART_LABELS, ART_PALETTES } from '../render/art';
import { EMOJI_STICKERS, drawSticker, STICKER_IDS, STICKERS } from '../render/stickers';
import { FILTERS, loadImage, processUpload } from '../render/images';
import { qrMatrix } from '../render/stickers';
import { useStore } from '../lib/store';
import { SignaturePad } from '../components/SignaturePad';
import { CardCanvas } from '../components/CardCanvas';
import { Button, Chip, ColorPicker, IconButton, Segmented, Slider, useToast } from '../components/ui';
import { addEl, applyPhotoLayout, centreEl, duplicateEl, makeImage, makeSignature, makeSticker, makeText, moveLayer, patchEl, PHOTO_LAYOUTS, removeEl, updateFace } from './ops';
import type { Apply } from './useHistory';

export interface PanelProps {
  doc: CardDoc; face: FaceKey; apply: Apply<CardDoc>;
  selected: CardElement | undefined; select: (id: string | null) => void;
  occasion: string; signature: string;
  cropMode: boolean; setCropMode: (on: boolean) => void;
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-ivory-300/60 pb-5 last:border-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="font-sans text-[13px] font-semibold text-ink">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ElementActions({ doc, face, apply, selected, select }: PanelProps) {
  if (!selected) return null;
  const id = selected.id;
  return (
    <>
    <Slider label="Rotation" value={selected.rotation ?? 0} min={-180} max={180} format={(v) => `${Math.round(v)}°`}
      onChange={(rotation) => apply((d) => patchEl(d, face, id, { rotation: Math.abs(rotation) < 3 ? 0 : rotation }), `rot-${id}`)} />
    <div className="flex items-center gap-0.5 rounded-full border border-ivory-300 bg-white/70 p-0.5">
      <IconButton label="Centre horizontally" onClick={() => apply((d) => centreEl(d, face, id))}><AlignHorizontalJustifyCenter className="h-4 w-4" /></IconButton>
      <IconButton label="Bring forward" onClick={() => apply((d) => moveLayer(d, face, id, 1))}><BringToFront className="h-4 w-4" /></IconButton>
      <IconButton label="Send backward" onClick={() => apply((d) => moveLayer(d, face, id, -1))}><SendToBack className="h-4 w-4" /></IconButton>
      <IconButton label="Duplicate" onClick={() => { const r = duplicateEl(doc, face, id); apply(() => r.doc); select(r.id); }}><Copy className="h-4 w-4" /></IconButton>
      <span className="flex-1" />
      <IconButton label="Delete element" className="hover:!bg-rosewood/10 hover:!text-rosewood" onClick={() => { apply((d) => removeEl(d, face, id)); select(null); }}><Trash2 className="h-4 w-4" /></IconButton>
    </div>
    </>
  );
}

/* ---------------- Design ---------------- */
const GRADIENTS: [string, string][] = [['#FBF7EF', '#EBDDB9'], ['#FBE4E1', '#F9E3C8'], ['#EAF3F5', '#CDB4DB'], ['#2C3350', '#1A1E30'], ['#2B4A37', '#18301F'], ['#8E2F3C', '#5E1A25']];
const BORDERS: { id: BorderKind; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'line', label: 'Fine line' }, { id: 'double', label: 'Double' }, { id: 'corners', label: 'Corners' }, { id: 'dashed', label: 'Dashed' }, { id: 'thick', label: 'Bold' }];

export function DesignPanel(p: PanelProps) {
  const { doc, face, apply, occasion, signature } = p;
  const f = doc[face];
  const toast = useToast();
  const [allDesigns, setAllDesigns] = useState(false);
  const designs = allDesigns ? TEMPLATES : TEMPLATES.filter((t) => t.occasion === occasion);
  const list = designs.length ? designs : TEMPLATES;
  const side = face === 'front' ? 'front' : 'inside';
  const layouts: { id: Orientation; label: string; icon: ReactNode }[] = [
    { id: 'portrait', label: 'Portrait', icon: <RectangleVertical className="h-4 w-4" /> },
    { id: 'landscape', label: 'Landscape', icon: <RectangleHorizontal className="h-4 w-4" /> },
    { id: 'square', label: 'Square', icon: <Square className="h-4 w-4" /> },
  ];
  return (
    <div className="space-y-5">
      <Section title="Card layout">
        <div className="grid grid-cols-3 gap-2">
          {layouts.map((l) => (
            <button key={l.id} type="button" aria-pressed={doc.orientation === l.id} onClick={() => apply((d) => reflow(d, l.id))}
              className={cx('flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition', doc.orientation === l.id ? 'border-gold-600 bg-gold-100 text-gold-800' : 'border-ivory-300 bg-white/70 text-ink-soft hover:border-gold-400')}>
              {l.icon}{l.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={`Background (${side})`}>
        <Segmented label="Background type" value={f.background.kind} onChange={(kind) => apply((d) => updateFace(d, face, (x) => ({
          ...x, background: kind === 'solid'
            ? { kind: 'solid', color: x.background.kind === 'gradient' ? x.background.from : x.background.color }
            : { kind: 'gradient', from: x.background.kind === 'solid' ? x.background.color : x.background.from, to: x.background.kind === 'solid' ? '#EBDDB9' : x.background.to, angle: 180 },
        })))} options={[{ id: 'solid', label: 'Solid' }, { id: 'gradient', label: 'Gradient' }]} />
        {f.background.kind === 'solid' ? (
          <ColorPicker label="Background colour" value={f.background.color} onChange={(color) => apply((d) => updateFace(d, face, (x) => ({ ...x, background: { kind: 'solid', color } })), 'bg')} />
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {GRADIENTS.map(([from, to]) => (
                <button key={from + to} type="button" aria-label={`Gradient ${from} to ${to}`} className="h-8 w-8 rounded-full border border-ivory-400 transition hover:scale-110" style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
                  onClick={() => apply((d) => updateFace(d, face, (x) => ({ ...x, background: { kind: 'gradient', from, to, angle: x.background.kind === 'gradient' ? x.background.angle : 180 } })))} />
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-soft">
              {(['from', 'to'] as const).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="color" className="h-7 w-7 rounded-full border border-ivory-400" value={f.background.kind === 'gradient' ? f.background[k] : '#ffffff'}
                    onChange={(e) => apply((d) => updateFace(d, face, (x) => (x.background.kind === 'gradient' ? { ...x, background: { ...x.background, [k]: e.target.value } } : x)), 'bg-' + k)} />
                  {k === 'from' ? 'Start' : 'End'}
                </label>
              ))}
            </div>
            <Slider label="Direction" value={f.background.angle} min={0} max={360} step={5} format={(v) => `${v}°`}
              onChange={(angle) => apply((d) => updateFace(d, face, (x) => (x.background.kind === 'gradient' ? { ...x, background: { ...x.background, angle } } : x)), 'bg-angle')} />
          </>
        )}
      </Section>

      <Section title={`Artwork (${side})`} action={f.art.kind !== 'none' && (
        <Button size="sm" variant="ghost" icon={<Shuffle className="h-3.5 w-3.5" />} onClick={() => apply((d) => updateFace(d, face, (x) => ({ ...x, art: { ...x.art, seed: Math.floor(Math.random() * 99999) + 1 } })))}>Shuffle</Button>
      )}>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ART_LABELS) as ArtKind[]).map((k) => (
            <Chip key={k} active={f.art.kind === k} onClick={() => apply((d) => updateFace(d, face, (x) => ({ ...x, art: { ...x.art, kind: k, palette: x.art.palette.length >= 3 ? x.art.palette : ART_PALETTES[0].colors } })))}>{ART_LABELS[k]}</Chip>
          ))}
        </div>
        {f.art.kind !== 'none' && (
          <div>
            <span className="label">Artwork palette</span>
            <div className="flex flex-wrap gap-2">
              {ART_PALETTES.map((pal) => (
                <button key={pal.name} type="button" title={pal.name} aria-label={`${pal.name} palette`} onClick={() => apply((d) => updateFace(d, face, (x) => ({ ...x, art: { ...x.art, palette: pal.colors } })))}
                  className={cx('flex overflow-hidden rounded-full border transition hover:scale-105', f.art.palette.join() === pal.colors.join() ? 'border-gold-700 ring-2 ring-gold-300' : 'border-ivory-400')}>
                  {pal.colors.slice(0, 4).map((c) => <span key={c} className="h-6 w-4" style={{ background: c }} />)}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title={`Border & frame (${side})`}>
        <div className="flex flex-wrap gap-1.5">
          {BORDERS.map((b) => <Chip key={b.id} active={f.border.kind === b.id} onClick={() => apply((d) => updateFace(d, face, (x) => ({ ...x, border: { ...x.border, kind: b.id } })))}>{b.label}</Chip>)}
        </div>
        {f.border.kind !== 'none' && (
          <>
            <ColorPicker label="Border colour" value={f.border.color} onChange={(color) => apply((d) => updateFace(d, face, (x) => ({ ...x, border: { ...x.border, color } })), 'border-color')} />
            <Slider label="Distance from edge" value={f.border.inset} min={16} max={140} onChange={(inset) => apply((d) => updateFace(d, face, (x) => ({ ...x, border: { ...x.border, inset } })), 'border-inset')} />
          </>
        )}
      </Section>

      <Section title="Change template" action={<Button size="sm" variant="ghost" onClick={() => setAllDesigns((a) => !a)}>{allDesigns ? 'This occasion' : 'Show all'}</Button>}>
        <p className="text-xs leading-relaxed text-ink-mute">Applying a template replaces the front and inside of this card. You can undo it.</p>
        <div className="grid grid-cols-3 gap-2.5">
          {list.map((t) => {
            const preview = templatePreview(t.id, doc.orientation);
            return preview && (
              <button key={t.id} type="button" title={t.name} aria-label={`Apply the ${t.name} template`}
                onClick={() => { apply((d) => buildTemplate(t, d.orientation, signature)); p.select(null); toast(`${t.name} applied`); }}
                className="overflow-hidden rounded-md shadow-soft ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-card">
                <CardCanvas doc={preview} label={t.name} />
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Text ---------------- */
export function TextPanel(p: PanelProps & { focusSignal: number }) {
  const { doc, face, apply, selected, select, focusSignal } = p;
  const el = selected?.type === 'text' ? selected : undefined;
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (focusSignal && area.current) { area.current.focus(); area.current.select(); } }, [focusSignal]);
  const set = (patch: Partial<TextEl>, key?: string) => el && apply((d) => patchEl(d, face, el.id, patch), key ? `${key}-${el.id}` : undefined);
  const add = (preset: 'heading' | 'body' | 'script') => { const t = makeText(doc, face, preset); apply((d) => addEl(d, face, t)); select(t.id); };
  const texts = doc[face].elements.filter((e): e is TextEl => e.type === 'text');
  const { settings, updateSettings } = useStore();
  const toast = useToast();
  const [pad, setPad] = useState(false);
  const addSignature = async (src: string) => {
    try {
      const img = await loadImage(src);
      const s = makeSignature(doc, src, img.naturalWidth, img.naturalHeight);
      apply((d) => addEl(d, face, s)); select(s.id);
    } catch { toast('Your signature could not be added. Try drawing it again.', 'error'); }
  };
  return (
    <div className="space-y-5">
      <SignaturePad open={pad} onClose={() => setPad(false)} onSave={(src) => { updateSettings({ signatureImage: src }); setPad(false); void addSignature(src); toast('Signature saved and added'); }} />
      <Section title="Add text">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => add('heading')} className="rounded-xl border border-ivory-300 bg-white/70 px-2 py-3 font-serif text-lg transition hover:border-gold-500">Heading</button>
          <button type="button" onClick={() => add('body')} className="rounded-xl border border-ivory-300 bg-white/70 px-2 py-3 font-display text-base transition hover:border-gold-500">Body text</button>
          <button type="button" onClick={() => add('script')} className="rounded-xl border border-ivory-300 bg-white/70 px-2 py-3 font-script text-2xl leading-none transition hover:border-gold-500">Script</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={<PenTool className="h-3.5 w-3.5" />} onClick={() => (settings.signatureImage ? void addSignature(settings.signatureImage) : setPad(true))}>
            {settings.signatureImage ? 'Add my signature' : 'Draw my signature'}
          </Button>
          {settings.signatureImage && <Button size="sm" variant="ghost" onClick={() => setPad(true)}>Redraw</Button>}
        </div>
      </Section>

      {el ? (
        <Section title="Edit text">
          <label className="block">
            <span className="label">Words</span>
            <textarea ref={area} className="field min-h-[84px] resize-y" rows={3} value={el.text} onChange={(e) => set({ text: e.target.value }, 'text')} placeholder="Type your text" />
          </label>
          <div>
            <span className="label">Font</span>
            <div className="grid grid-cols-2 gap-1.5">
              {FONTS.map((f) => (
                <button key={f.family} type="button" aria-pressed={el.font === f.family} onClick={() => set({ font: f.family })}
                  className={cx('truncate rounded-lg border px-2.5 py-2 text-left text-[17px] leading-tight transition', el.font === f.family ? 'border-gold-600 bg-gold-100' : 'border-ivory-300 bg-white/70 hover:border-gold-400')} style={{ fontFamily: `"${f.family}"` }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Size" value={el.size} min={12} max={420} onChange={(size) => set({ size }, 'size')} />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Align> label="Alignment" value={el.align} onChange={(align) => set({ align })} options={[
              { id: 'left', label: <AlignLeft className="h-4 w-4" />, title: 'Align left' }, { id: 'center', label: <AlignCenter className="h-4 w-4" />, title: 'Align centre' }, { id: 'right', label: <AlignRight className="h-4 w-4" />, title: 'Align right' },
            ]} />
            <IconButton label="Bold" active={el.bold} onClick={() => set({ bold: !el.bold })} className="border border-ivory-300"><Bold className="h-4 w-4" /></IconButton>
            <IconButton label="Italic" active={el.italic} onClick={() => set({ italic: !el.italic })} className="border border-ivory-300"><Italic className="h-4 w-4" /></IconButton>
          </div>
          <ColorPicker label="Text colour" value={el.color} onChange={(color) => set({ color }, 'color')} />
          <Slider label="Letter spacing" value={el.spacing} min={0} max={40} onChange={(spacing) => set({ spacing }, 'spacing')} />
          <Slider label="Line height" value={el.lineHeight} min={0.8} max={2.2} step={0.02} format={(v) => v.toFixed(2)} onChange={(lineHeight) => set({ lineHeight }, 'lh')} />
          <div className="space-y-3 rounded-2xl border border-ivory-300 bg-white/50 p-3">
            <span className="label">Text effects</span>
            <Slider label="Curve" value={el.curve ?? 0} min={-100} max={100} format={(v) => (Math.abs(v) < 2 ? 'Straight' : v > 0 ? `Arch ${Math.round(v)}` : `Smile ${Math.round(-v)}`)}
              onChange={(curve) => set({ curve: Math.abs(curve) < 4 ? 0 : curve }, 'curve')} />
            <Slider label="Outline" value={el.outline ?? 0} min={0} max={14} step={0.5} format={(v) => (v ? v.toFixed(1) : 'None')} onChange={(outline) => set({ outline }, 'outline')} />
            {!!el.outline && <ColorPicker label="Outline colour" value={el.outlineColor ?? '#FFFFFF'} onChange={(outlineColor) => set({ outlineColor }, 'outline-color')} />}
            <label className="flex items-center gap-2.5 text-sm text-ink-soft">
              <input type="checkbox" className="h-4 w-4 accent-[#A8843F]" checked={!!el.shadow} onChange={(e) => set({ shadow: e.target.checked })} /> Soft drop shadow
            </label>
          </div>
          <ElementActions {...p} />
        </Section>
      ) : (
        <Section title="Text on this side">
          {texts.length ? (
            <ul className="space-y-1.5">
              {texts.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => select(t.id)} className="flex w-full items-center gap-2.5 rounded-xl border border-ivory-300 bg-white/70 px-3 py-2.5 text-left text-sm transition hover:border-gold-500">
                    <Type className="h-4 w-4 shrink-0 text-gold-700" /> <span className="truncate">{t.text.replace(/\n/g, ' ') || 'Empty text'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-mute">No text here yet. Add a heading, body text or script above.</p>}
          <p className="text-xs leading-relaxed text-ink-mute">Tap any text on the card to edit it. Drag to move; use the corner handle to resize and the side handle to change its width.</p>
        </Section>
      )}
    </div>
  );
}

/* ---------------- Photos ---------------- */
const SHAPES: { id: PhotoShape; label: string }[] = [{ id: 'rect', label: 'Rectangle' }, { id: 'rounded', label: 'Rounded' }, { id: 'circle', label: 'Oval' }, { id: 'arch', label: 'Arch' }];
const FRAMES: { id: PhotoFrame; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'white', label: 'White mount' }, { id: 'gold', label: 'Gold' }, { id: 'ink', label: 'Ink' }, { id: 'shadow', label: 'Soft shadow' }];

export function PhotoPanel(p: PanelProps) {
  const { doc, face, apply, selected, select, cropMode, setCropMode } = p;
  const el = selected?.type === 'image' ? selected : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<ImageEl>, key?: string) => el && apply((d) => patchEl(d, face, el.id, patch), key ? `${key}-${el.id}` : undefined);
  const photos = doc[face].elements.filter((e): e is ImageEl => e.type === 'image' && !e.role);

  const onFile = async (list: FileList | null, replace: boolean) => {
    const files = list ? [...list].slice(0, 4) : [];
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      if (replace && el) {
        const img = await processUpload(files[0]);
        set({ src: img.src, zoom: 1, ox: 0, oy: 0 });
      } else {
        let lastId = '';
        for (const [i, file] of files.entries()) {
          const img = await processUpload(file);
          const n = makeImage(doc, img.src, img.w, img.h);
          n.x += i * 40; n.y += i * 40; lastId = n.id;
          apply((d) => addEl(d, face, n));
        }
        if (lastId) select(lastId);
      }
    } catch (e) {
      setError((e as Error).message || 'That photo could not be added.');
    } finally {
      setBusy(false);
      if (addInput.current) addInput.current.value = '';
      if (replaceInput.current) replaceInput.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <Section title="Add a photo">
        <input ref={addInput} type="file" accept="image/*" multiple className="sr-only" aria-label="Choose photos to upload" onChange={(e) => onFile(e.target.files, false)} />
        <Button variant="primary" busy={busy} className="w-full" icon={<ImagePlus className="h-4 w-4" />} onClick={() => addInput.current?.click()}>Upload from this device</Button>
        {error && <p role="alert" className="rounded-xl bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood">{error}</p>}
        <p className="text-xs leading-relaxed text-ink-mute">JPG, PNG, WebP and GIF are supported — choose up to four at once. Photos stay on this device — they are never uploaded to a server.</p>
      </Section>

      {el ? (
        <Section title="Edit photo">
          <input ref={replaceInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a replacement photo" onChange={(e) => onFile(e.target.files, true)} />
          <div className="flex gap-2">
            <Button size="sm" icon={<Replace className="h-3.5 w-3.5" />} onClick={() => replaceInput.current?.click()}>Replace</Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => { apply((d) => removeEl(d, face, el.id)); select(null); }}>Remove</Button>
          </div>
          <Button size="sm" variant={cropMode ? 'dark' : 'secondary'} icon={<Crop className="h-3.5 w-3.5" />} onClick={() => setCropMode(!cropMode)} aria-pressed={cropMode}>
            {cropMode ? 'Done cropping' : 'Crop on the card'}
          </Button>
          <p className="text-xs leading-relaxed text-ink-mute">{cropMode ? 'Drag the photo to reposition it; pinch or scroll to zoom.' : 'Or double-tap the photo. Fine-tune with the sliders below.'}</p>
          <Slider label="Crop zoom" value={el.zoom} min={1} max={3} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(zoom) => set({ zoom }, 'zoom')} />
          <Slider label="Reposition left / right" value={el.ox} min={-1} max={1} step={0.01} format={(v) => (v === 0 ? 'Centre' : v.toFixed(2))} onChange={(ox) => set({ ox }, 'ox')} />
          <Slider label="Reposition up / down" value={el.oy} min={-1} max={1} step={0.01} format={(v) => (v === 0 ? 'Centre' : v.toFixed(2))} onChange={(oy) => set({ oy }, 'oy')} />
          <div>
            <span className="label">Filter</span>
            <div className="flex flex-wrap gap-1.5">{FILTERS.map((f) => <Chip key={f.id} active={el.filter === f.id} onClick={() => set({ filter: f.id })}>{f.label}</Chip>)}</div>
          </div>
          <div>
            <span className="label">Crop shape</span>
            <div className="flex flex-wrap gap-1.5">{SHAPES.map((s) => <Chip key={s.id} active={el.shape === s.id} onClick={() => set({ shape: s.id })}>{s.label}</Chip>)}</div>
          </div>
          <div>
            <span className="label">Photo frame</span>
            <div className="flex flex-wrap gap-1.5">{FRAMES.map((f) => <Chip key={f.id} active={el.frame === f.id} onClick={() => set({ frame: f.id })}>{f.label}</Chip>)}</div>
          </div>
          <ElementActions {...p} />
        </Section>
      ) : (
        <Section title="Photos on this side">
          {photos.length ? (
            <div className="flex flex-wrap gap-2">
              {photos.map((ph, i) => (
                <button key={ph.id} type="button" onClick={() => select(ph.id)} aria-label={`Select photo ${i + 1}`} className="h-16 w-16 overflow-hidden rounded-lg border border-ivory-300 transition hover:border-gold-500">
                  <img src={ph.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-ink-mute">No photos yet. Upload one, then drag it into place and resize it from its corner.</p>}
        </Section>
      )}

      <Section title="Photo layouts">
        {PHOTO_LAYOUTS[Math.min(photos.length, 4)] ? (
          <>
            <div className="flex flex-wrap gap-2.5">
              {PHOTO_LAYOUTS[Math.min(photos.length, 4)].map((l) => (
                <button key={l.id} type="button" title={l.label} aria-label={`Apply the ${l.label} layout`} onClick={() => { apply((d) => applyPhotoLayout(d, face, l)); setCropMode(false); }}
                  className="rounded-xl border border-ivory-300 bg-white/70 p-2 text-center text-[11px] text-ink-soft transition hover:-translate-y-0.5 hover:border-gold-500">
                  <span className="relative mb-1 block h-12 w-16">
                    {l.rects.map(([x, y, w, h], i) => <span key={i} className="absolute rounded-[3px] bg-gold-400" style={{ left: `calc(${x * 100}% + 1px)`, top: `calc(${y * 100}% + 1px)`, width: `calc(${w * 100}% - 2px)`, height: `calc(${h * 100}% - 2px)` }} />)}
                  </span>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-ink-mute">Arranges the {photos.length > 4 ? 'first four photos' : photos.length === 1 ? 'photo' : `${photos.length} photos`} on this side into a collage. Use “Crop on the card” to adjust each one.</p>
          </>
        ) : <p className="text-sm text-ink-mute">Add one to four photos to this side to arrange them as a collage.</p>}
      </Section>
    </div>
  );
}

/* ---------------- Stickers & illustrations ---------------- */
function StickerThumb({ kind, color }: { kind: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    drawSticker(ctx, kind, color, 8, 8, c.width - 16, c.height - 16);
  }, [kind, color]);
  return <canvas ref={ref} width={96} height={96} className="h-11 w-11" aria-hidden />;
}

export function ElementsPanel(p: PanelProps) {
  const { doc, face, apply, selected, select } = p;
  const el = selected?.type === 'sticker' ? selected : undefined;
  const [color, setColor] = useState('#C2A05A');
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  const isVector = el && !el.kind.startsWith('emoji:') && !el.kind.startsWith('qr:');
  const add = (kind: string) => { const s = makeSticker(doc, face, kind, color); apply((d) => addEl(d, face, s)); select(s.id); };
  const set = (patch: Partial<StickerEl>, key?: string) => el && apply((d) => patchEl(d, face, el.id, patch), key ? `${key}-${el.id}` : undefined);
  return (
    <div className="space-y-5">
      {el && (
        <Section title="Edit element">
          <Slider label="Size" value={el.w} min={30} max={900} onChange={(w) => set({ w, h: (el.h / el.w) * w }, 'size')} />
          <ElementActions {...p} />
        </Section>
      )}
      <Section title="QR code">
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          const v = qr.trim();
          if (!v) { setQrError('Paste a link first, e.g. a video message or playlist.'); return; }
          const url = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v;
          if (!qrMatrix(url)) { setQrError('That link is too long for a QR code.'); return; }
          setQrError(''); const s = makeSticker(doc, face, 'qr:' + url, '#2B2622'); apply((d) => addEl(d, face, s)); select(s.id); setQr('');
        }}>
          <input className="field" inputMode="url" value={qr} onChange={(e) => setQr(e.target.value)} placeholder="Link to a video, playlist or page" aria-label="Link for the QR code" />
          <Button type="submit" variant="dark" icon={<QrCode className="h-4 w-4" />}>Add</Button>
        </form>
        {qrError && <p role="alert" className="text-xs text-rosewood">{qrError}</p>}
        {el?.kind.startsWith('qr:') && <p className="break-all text-xs text-ink-mute">Selected code opens: {el.kind.slice(3)}</p>}
        <p className="text-xs leading-relaxed text-ink-mute">Anyone who scans the code with their phone camera opens your link. Keep it at least 2 cm wide when printed.</p>
      </Section>
      <Section title="Decorative shapes">
        <ColorPicker label={isVector ? 'Colour of selected shape' : 'Shape colour'} value={isVector ? el.color : color} onChange={(c) => { setColor(c); if (isVector) set({ color: c }, 'color'); }} />
        <div className="grid grid-cols-6 gap-1.5">
          {STICKER_IDS.map((k) => (
            <button key={k} type="button" title={STICKERS[k].label} aria-label={`Add ${STICKERS[k].label}`} onClick={() => add(k)}
              className="flex aspect-square items-center justify-center rounded-xl border border-ivory-300 bg-white/70 transition hover:-translate-y-0.5 hover:border-gold-500">
              <StickerThumb kind={k} color={isVector ? el.color : color} />
            </button>
          ))}
        </div>
      </Section>
      <Section title="Stickers & illustrations">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_STICKERS.map((e) => (
            <button key={e} type="button" aria-label={`Add ${e} sticker`} onClick={() => add('emoji:' + e)} className="flex aspect-square items-center justify-center rounded-lg text-2xl transition hover:scale-125 hover:bg-white">
              {e}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-ink-mute">Stickers are added to the {face === 'front' ? 'front' : 'inside'} of your card. Drag to move and use the corner handle to resize.</p>
      </Section>
    </div>
  );
}
