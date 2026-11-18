// The card creation editor.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, Eye, Image as ImageIcon, Loader2, MessageSquareHeart, Palette, Redo2, Shapes, TriangleAlert, Type, Undo2, type LucideIcon } from 'lucide-react';
import type { CardDoc, CardElement, CardStatus, FaceKey, SavedCard, TextEl } from '../types';
import { cardSize } from '../types';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { cx, uid } from '../lib/utils';
import { splitMessage } from '../data/messages';
import type { OccasionId } from '../data/occasions';
import { Button, EmptyState, IconButton, Segmented, Spinner, useToast } from '../components/ui';
import { MessageWriter } from '../components/MessageWriter';
import { PreviewModal } from '../components/PreviewModal';
import { Stage } from './Stage';
import { useHistory } from './useHistory';
import { patchEl, removeEl, updateFace } from './ops';
import { DesignPanel, ElementsPanel, PhotoPanel, TextPanel, type PanelProps } from './panels';

type Tab = 'design' | 'text' | 'photo' | 'elements' | 'message';
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'photo', label: 'Photos', icon: ImageIcon },
  { id: 'elements', label: 'Stickers', icon: Shapes },
  { id: 'message', label: 'Message', icon: MessageSquareHeart },
];

export function Editor({ id }: { id: string }) {
  const { ready, cards } = useStore();
  const card = cards.find((c) => c.id === id);
  if (!ready) return <div className="fixed inset-0 flex items-center justify-center bg-ivory-100"><Spinner label="Opening your card…" /></div>;
  if (!card) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState icon={<TriangleAlert className="h-6 w-6" />} title="Card not found" message="This card may have been deleted, or it was created on a different device or browser."
          action={<Button variant="primary" onClick={() => navigate('cards')}>Go to My Cards</Button>} />
      </div>
    );
  }
  return <EditorInner key={card.id} initial={card} />;
}

function EditorInner({ initial }: { initial: SavedCard }) {
  const { saveCard, settings, cards } = useStore();
  const toast = useToast();
  const { doc, apply, undo, redo, canUndo, canRedo } = useHistory<CardDoc>({ orientation: initial.orientation, front: initial.front, inside: initial.inside });
  const [name, setName] = useState(initial.name);
  const [status, setStatus] = useState<CardStatus>(initial.status);
  const [face, setFace] = useState<FaceKey>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('design');
  const [panelOpen, setPanelOpen] = useState(true);
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [focusSignal, setFocusSignal] = useState(0);
  const selected: CardElement | undefined = doc[face].elements.find((e) => e.id === selectedId);

  // ----- autosave -----
  const latest = useRef({ doc, name, status });
  latest.current = { doc, name, status };
  const favourite = cards.find((c) => c.id === initial.id)?.favourite ?? initial.favourite;
  const favRef = useRef(favourite); favRef.current = favourite;
  const base = useRef(initial).current; // stable id / occasion / createdAt
  const timer = useRef<number | null>(null);
  const first = useRef(true);
  const persist = useCallback(() => {
    timer.current = null;
    const { doc: d, name: n, status: s } = latest.current;
    return saveCard({ ...base, ...d, name: n.trim() || 'Untitled card', status: s, favourite: favRef.current, updatedAt: Date.now() })
      .then(() => setSaveState('saved')).catch(() => setSaveState('error'));
  }, [base, saveCard]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaveState('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(persist, 450);
  }, [doc, name, status, persist]);

  useEffect(() => () => { if (timer.current) { window.clearTimeout(timer.current); void persist(); } }, [persist]);

  // ----- selection -----
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    const el = latest.current.doc[face].elements.find((e) => e.id === id);
    if (el) setTab(el.type === 'text' ? 'text' : el.type === 'image' ? 'photo' : 'elements');
  }, [face]);

  const switchFace = (f: FaceKey) => { setFace(f); setSelectedId(null); };

  // ----- keyboard shortcuts -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (preview) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
      if (typing || !selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); apply((d) => removeEl(d, face, selectedId)); setSelectedId(null); }
      else if (e.key === 'Escape') setSelectedId(null);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 4;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        apply((d) => { const el = d[face].elements.find((x) => x.id === selectedId); return el ? patchEl(d, face, selectedId, { x: el.x + dx, y: el.y + dy }) : d; }, 'nudge-' + selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply, face, preview, redo, selectedId, undo]);

  // ----- message writer → inside of the card -----
  const applyMessage = (message: string) => {
    const { greeting, body, signoff } = splitMessage(message);
    apply((d) => updateFace(d, 'inside', (f) => {
      const { w: W, h: H } = cardSize(d.orientation);
      const els = f.elements.slice();
      const put = (role: TextEl['role'], text: string, fallback: Partial<TextEl>) => {
        const i = els.findIndex((e) => e.type === 'text' && e.role === role);
        if (i >= 0) { if (text) els[i] = { ...(els[i] as TextEl), text }; }
        else if (text) els.push({ id: uid(), type: 'text', role, text, x: W * 0.14, w: W * 0.72, y: H * 0.3, font: 'Cormorant Garamond', size: 42, color: '#2B2622', align: 'center', bold: false, italic: false, spacing: 0, lineHeight: 1.45, ...fallback });
      };
      put('title', greeting, { y: H * 0.15, font: 'Playfair Display', size: 64, lineHeight: 1.15 });
      put('message', body, {});
      put('signoff', signoff, { y: H * 0.74, italic: true, size: 44, lineHeight: 1.3 });
      return { ...f, elements: els };
    }));
    switchFace('inside');
    toast('Message added inside your card');
  };

  const panel: PanelProps = { doc, face, apply, selected, select, occasion: initial.occasion, signature: settings.signature };

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-ivory-100">
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-ivory-300/70 bg-ivory-50/90 px-2 backdrop-blur sm:gap-2 sm:px-4">
        <IconButton label="Back to My Cards" onClick={() => navigate('cards')}><ArrowLeft className="h-5 w-5" /></IconButton>
        <input aria-label="Card name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 py-1 font-display text-xl font-semibold outline-none transition hover:bg-ivory-200/70 focus:bg-white focus:ring-2 focus:ring-gold-300" />
        <span className="hidden items-center gap-1.5 px-1 text-xs text-ink-mute sm:flex" role="status">
          {saveState === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : saveState === 'error' ? <span className="flex items-center gap-1.5 text-rosewood"><TriangleAlert className="h-3.5 w-3.5" /> Not saved</span> : <><Check className="h-3.5 w-3.5 text-gold-600" /> Saved</>}
        </span>
        <IconButton label="Undo" disabled={!canUndo} onClick={undo}><Undo2 className="h-[18px] w-[18px]" /></IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={redo}><Redo2 className="h-[18px] w-[18px]" /></IconButton>
        <IconButton label={status === 'completed' ? 'Completed – mark as draft' : 'Mark as completed'} active={status === 'completed'}
          onClick={() => { const next = status === 'completed' ? 'draft' : 'completed'; setStatus(next); toast(next === 'completed' ? 'Marked as completed' : 'Moved back to drafts'); }}>
          {status === 'completed' ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <Circle className="h-[18px] w-[18px]" />}
        </IconButton>
        <Button variant="primary" size="sm" onClick={() => setPreview(true)} icon={<Eye className="h-4 w-4" />} className="ml-1 !px-4 !py-2">
          Preview<span className="hidden sm:inline">&nbsp;&amp; export</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col lg:order-2" aria-label="Card canvas">
          <div className="flex shrink-0 items-center justify-center gap-3 pt-3">
            <Segmented<FaceKey> label="Card side" value={face} onChange={switchFace} options={[{ id: 'front', label: 'Front' }, { id: 'inside', label: 'Inside' }]} />
            {saveState === 'error' && <span className="text-xs text-rosewood sm:hidden">Not saved</span>}
          </div>
          <Stage doc={doc} face={face} selectedId={selectedId} onSelect={select} apply={apply}
            onEditText={() => { setTab('text'); setPanelOpen(true); setFocusSignal((n) => n + 1); }} />
        </section>

        <aside className={cx('flex shrink-0 flex-col border-t border-ivory-300/70 bg-ivory-50 shadow-[0_-10px_30px_-18px_rgba(70,52,20,.35)] lg:order-1 lg:h-auto lg:w-[392px] lg:border-r lg:border-t-0 lg:shadow-none', panelOpen ? 'h-[46dvh]' : 'h-auto')} aria-label="Editing tools">
          <div className="flex shrink-0 items-stretch border-b border-ivory-300/70" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setPanelOpen(true); }}
                className={cx('relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition', tab === t.id ? 'text-gold-800' : 'text-ink-mute hover:text-ink')}>
                <t.icon className="h-[18px] w-[18px]" />{t.label}
                {tab === t.id && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gold-500" />}
              </button>
            ))}
            <button type="button" onClick={() => setPanelOpen((o) => !o)} aria-label={panelOpen ? 'Collapse tools' : 'Expand tools'} aria-expanded={panelOpen} className="flex w-10 items-center justify-center text-ink-mute lg:hidden">
              {panelOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>
          </div>
          {panelOpen && (
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4" role="tabpanel">
              {tab === 'design' && <DesignPanel {...panel} />}
              {tab === 'text' && <TextPanel {...panel} focusSignal={focusSignal} />}
              {tab === 'photo' && <PhotoPanel {...panel} />}
              {tab === 'elements' && <ElementsPanel {...panel} />}
              {tab === 'message' && <MessageWriter occasion={initial.occasion as OccasionId} onUse={applyMessage} />}
            </div>
          )}
        </aside>
      </div>

      {preview && <PreviewModal doc={doc} name={name.trim() || 'Untitled card'} onClose={() => setPreview(false)} />}
    </div>
  );
}
