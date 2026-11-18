// Viewer for a card opened from a shared link (#card=…).
import { useEffect, useState } from 'react';
import { Heart, RefreshCw, Save, Sparkles, TriangleAlert } from 'lucide-react';
import type { CardDoc, FaceKey } from '../types';
import { cardSize } from '../types';
import { decodeCard } from '../lib/share';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { uid } from '../lib/utils';
import { CardCanvas } from '../components/CardCanvas';
import { Button, Spinner, useToast } from '../components/ui';

export function Shared({ payload }: { payload: string }) {
  const { saveCard } = useStore();
  const toast = useToast();
  const [doc, setDoc] = useState<CardDoc | null>(null);
  const [failed, setFailed] = useState(false);
  const [face, setFace] = useState<FaceKey>('front');

  useEffect(() => {
    let alive = true;
    setDoc(null); setFailed(false); setFace('front');
    decodeCard(payload).then((d) => { if (alive) setDoc(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [payload]);

  const keep = async () => {
    if (!doc) return;
    const now = Date.now(), id = uid();
    try {
      await saveCard({ ...doc, id, name: 'A card for me', occasion: 'just-because', status: 'completed', favourite: false, createdAt: now, updatedAt: now });
      toast('Saved to My Cards');
      navigate('cards');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const size = doc ? cardSize(doc.orientation) : { w: 1000, h: 1400 };
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center bg-[#211D1A] text-ivory-50">
      <header className="flex w-full shrink-0 items-center justify-center gap-2.5 px-4 pb-1 pt-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-gold-300 to-gold-600 text-white"><Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} /></span>
        <div className="leading-none">
          <p className="font-display text-xl font-semibold">A card for you</p>
          <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.34em] text-gold-300">Greeting Card Studio</p>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-5 py-3">
        {failed ? (
          <div className="max-w-sm text-center">
            <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-gold-300" />
            <h1 className="text-3xl font-semibold">This card link is incomplete</h1>
            <p className="mt-2 text-sm leading-relaxed text-ivory-200/80">The link may have been cut short when it was copied or sent. Ask the sender to share it again.</p>
          </div>
        ) : !doc ? <Spinner label="Opening your card…" /> : (
          <div className="flip-scene animate-rise" style={{ width: `min(88vw, calc((100dvh - 230px) * ${size.w / size.h}))` }}>
            <button type="button" onClick={() => setFace((f) => (f === 'front' ? 'inside' : 'front'))} aria-label={`Showing the ${face}. Tap to ${face === 'front' ? 'open' : 'close'} the card`}
              className={`flip-card block w-full ${face === 'inside' ? 'is-flipped' : ''}`} style={{ aspectRatio: `${size.w} / ${size.h}` }}>
              <span className="flip-face overflow-hidden rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"><CardCanvas doc={doc} face="front" eager label="Card front" /></span>
              <span className="flip-face back overflow-hidden rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"><CardCanvas doc={doc} face="inside" eager label="Card inside" /></span>
            </button>
          </div>
        )}
      </div>

      <footer className="flex w-full shrink-0 flex-col items-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),18px)]">
        {doc && <p className="text-xs text-ivory-200/70">{face === 'front' ? 'Tap the card to open it' : 'Tap the card to close it'}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          {doc && <Button size="sm" onClick={() => setFace((f) => (f === 'front' ? 'inside' : 'front'))} icon={<RefreshCw className="h-3.5 w-3.5" />}>{face === 'front' ? 'Open card' : 'Close card'}</Button>}
          {doc && <Button size="sm" onClick={keep} icon={<Save className="h-3.5 w-3.5" />}>Keep this card</Button>}
          <Button size="sm" variant="primary" onClick={() => navigate('home')} icon={<Sparkles className="h-3.5 w-3.5" />}>Make your own</Button>
        </div>
      </footer>
    </div>
  );
}
