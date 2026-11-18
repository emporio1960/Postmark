// Application store: saved cards, favourites, recents, occasions, settings.
// Everything is persisted locally through ./storage.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OccasionReminder, SavedCard, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { storage } from './storage';
import { uid } from './utils';

interface Store {
  ready: boolean;
  persistent: boolean;
  cards: SavedCard[];
  favTemplates: string[];
  recentTemplates: string[];
  occasions: OccasionReminder[];
  settings: Settings;
  saveCard(card: SavedCard): Promise<void>;
  deleteCard(id: string): Promise<void>;
  duplicateCard(id: string): Promise<SavedCard | null>;
  toggleCardFavourite(id: string): void;
  toggleTemplateFavourite(id: string): void;
  markTemplateUsed(id: string): void;
  saveOccasion(o: OccasionReminder): void;
  deleteOccasion(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  clearAll(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [persistentOk, setPersistentOk] = useState(true);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [favTemplates, setFavTemplates] = useState<string[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<OccasionReminder[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, f, r, o, s, p] = await Promise.all([
          storage.allCards(), storage.get<string[]>('favTemplates', []), storage.get<string[]>('recentTemplates', []),
          storage.get<OccasionReminder[]>('occasions', []), storage.get<Partial<Settings>>('settings', {}), storage.isPersistent(),
        ]);
        if (!alive) return;
        setCards(c); setFavTemplates(f); setRecentTemplates(r); setOccasions(o);
        setSettings({ ...DEFAULT_SETTINGS, ...s }); setPersistentOk(p);
      } catch {
        if (alive) setPersistentOk(false);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const safe = useCallback((p: Promise<unknown>) => { p.catch(() => setPersistentOk(false)); }, []);

  const saveCard = useCallback(async (card: SavedCard) => {
    setCards((list) => {
      const i = list.findIndex((c) => c.id === card.id);
      if (i === -1) return [card, ...list];
      const next = list.slice(); next[i] = card; return next;
    });
    try { await storage.putCard(card); } catch { setPersistentOk(false); throw new Error('Your card could not be saved – device storage may be full.'); }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    setCards((list) => list.filter((c) => c.id !== id));
    safe(storage.deleteCard(id));
  }, [safe]);

  const duplicateCard = useCallback(async (id: string) => {
    const src = cardsRef.current.find((c) => c.id === id);
    if (!src) return null;
    const now = Date.now();
    const reId = <T extends { id: string }>(els: T[]) => els.map((e) => ({ ...e, id: uid() }));
    const copy: SavedCard = {
      ...src, id: uid(), name: `${src.name} (copy)`, status: 'draft', favourite: false, createdAt: now, updatedAt: now,
      front: { ...src.front, elements: reId(src.front.elements) }, inside: { ...src.inside, elements: reId(src.inside.elements) },
    };
    await saveCard(copy);
    return copy;
  }, [saveCard]);

  const toggleCardFavourite = useCallback((id: string) => {
    const src = cardsRef.current.find((c) => c.id === id);
    if (src) saveCard({ ...src, favourite: !src.favourite }).catch(() => undefined);
  }, [saveCard]);

  const toggleTemplateFavourite = useCallback((id: string) => {
    setFavTemplates((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
      safe(storage.set('favTemplates', next)); return next;
    });
  }, [safe]);

  const markTemplateUsed = useCallback((id: string) => {
    setRecentTemplates((list) => {
      const next = [id, ...list.filter((x) => x !== id)].slice(0, 12);
      safe(storage.set('recentTemplates', next)); return next;
    });
  }, [safe]);

  const saveOccasion = useCallback((o: OccasionReminder) => {
    setOccasions((list) => {
      const next = list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? o : x)) : [...list, o];
      safe(storage.set('occasions', next)); return next;
    });
  }, [safe]);

  const deleteOccasion = useCallback((id: string) => {
    setOccasions((list) => { const next = list.filter((x) => x.id !== id); safe(storage.set('occasions', next)); return next; });
  }, [safe]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => { const next = { ...s, ...patch }; safe(storage.set('settings', next)); return next; });
  }, [safe]);

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    setCards([]); setFavTemplates([]); setRecentTemplates([]); setOccasions([]); setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<Store>(() => ({
    ready, persistent: persistentOk, cards, favTemplates, recentTemplates, occasions, settings,
    saveCard, deleteCard, duplicateCard, toggleCardFavourite, toggleTemplateFavourite, markTemplateUsed,
    saveOccasion, deleteOccasion, updateSettings, clearAll,
  }), [ready, persistentOk, cards, favTemplates, recentTemplates, occasions, settings, saveCard, deleteCard, duplicateCard,
    toggleCardFavourite, toggleTemplateFavourite, markTemplateUsed, saveOccasion, deleteOccasion, updateSettings, clearAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
