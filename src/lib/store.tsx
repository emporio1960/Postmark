// Application store: saved cards, favourites, recents, occasions, settings.
// Everything is persisted locally through ./storage.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Contact, OccasionReminder, SavedCard, Settings } from '../types';
import type { Backup } from './backup';
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
  contacts: Contact[];
  settings: Settings;
  saveCard(card: SavedCard): Promise<void>;
  deleteCard(id: string): Promise<void>;
  duplicateCard(id: string): Promise<SavedCard | null>;
  toggleCardFavourite(id: string): void;
  toggleTemplateFavourite(id: string): void;
  markTemplateUsed(id: string): void;
  saveOccasion(o: OccasionReminder): void;
  deleteOccasion(id: string): void;
  saveContact(c: Contact): void;
  deleteContact(id: string): void;
  /** Card ids deleted here that iCloud has not been told about yet. */
  deletedCards: string[];
  clearDeletedCards(ids: string[]): void;
  /** Re-read cards from storage (after sync wrote to it). */
  reloadCards(): Promise<void>;
  /** Replace the synced lists with a version that arrived from iCloud. */
  replaceMeta(m: { favTemplates: string[]; occasions: OccasionReminder[]; contacts: Contact[]; settings: Partial<Settings> }): void;
  /** Merge a backup into what is already on this device. */
  restore(b: Backup): Promise<{ cards: number }>;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deletedCards, setDeletedCards] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, f, r, o, s, p, k, dc] = await Promise.all([
          storage.allCards(), storage.get<string[]>('favTemplates', []), storage.get<string[]>('recentTemplates', []),
          storage.get<OccasionReminder[]>('occasions', []), storage.get<Partial<Settings>>('settings', {}), storage.isPersistent(),
          storage.get<Contact[]>('contacts', []), storage.get<string[]>('deletedCards', []),
        ]);
        if (!alive) return;
        setCards(c); setFavTemplates(f); setRecentTemplates(r); setOccasions(o); setContacts(k); setDeletedCards(dc);
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
    setDeletedCards((list) => { const next = [...new Set([...list, id])]; safe(storage.set('deletedCards', next)); return next; });
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

  const saveContact = useCallback((c: Contact) => {
    setContacts((list) => {
      const next = list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [...list, c];
      safe(storage.set('contacts', next)); return next;
    });
  }, [safe]);

  const deleteContact = useCallback((id: string) => {
    setContacts((list) => { const next = list.filter((x) => x.id !== id); safe(storage.set('contacts', next)); return next; });
  }, [safe]);

  const clearDeletedCards = useCallback((ids: string[]) => {
    setDeletedCards((list) => { const next = list.filter((x) => !ids.includes(x)); safe(storage.set('deletedCards', next)); return next; });
  }, [safe]);

  const reloadCards = useCallback(async () => { setCards(await storage.allCards()); }, []);

  const replaceMeta = useCallback((m: { favTemplates: string[]; occasions: OccasionReminder[]; contacts: Contact[]; settings: Partial<Settings> }) => {
    setFavTemplates(m.favTemplates); safe(storage.set('favTemplates', m.favTemplates));
    setContacts(m.contacts); safe(storage.set('contacts', m.contacts));
    // Reminder bookkeeping (lastNotified) is per device, so keep this device's copy.
    setOccasions((list) => {
      const mine = new Map(list.map((o) => [o.id, o.lastNotified]));
      const next = m.occasions.map((o) => ({ ...o, lastNotified: mine.get(o.id) }));
      safe(storage.set('occasions', next)); return next;
    });
    setSettings((s) => { const next = { ...s, ...m.settings }; safe(storage.set('settings', next)); return next; });
  }, [safe]);

  const restore = useCallback(async (b: Backup) => {
    const byId = <T extends { id: string }>(current: T[], incoming: T[]) => {
      const map = new Map(current.map((x) => [x.id, x]));
      for (const x of incoming) map.set(x.id, x);
      return [...map.values()];
    };
    for (const card of b.cards) await storage.putCard(card);
    const all = await storage.allCards();
    const fav = [...new Set([...b.favTemplates, ...favTemplates])];
    const rec = [...new Set([...recentTemplates, ...b.recentTemplates])].slice(0, 12);
    const occ = byId(occasions, b.occasions), con = byId(contacts, b.contacts);
    const set = { ...settings, ...b.settings };
    await Promise.all([storage.set('favTemplates', fav), storage.set('recentTemplates', rec), storage.set('occasions', occ), storage.set('contacts', con), storage.set('settings', set)]);
    setCards(all); setFavTemplates(fav); setRecentTemplates(rec); setOccasions(occ); setContacts(con); setSettings(set);
    return { cards: b.cards.length };
  }, [favTemplates, recentTemplates, occasions, contacts, settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => { const next = { ...s, ...patch }; safe(storage.set('settings', next)); return next; });
  }, [safe]);

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    setDeletedCards([]); setCards([]); setFavTemplates([]); setRecentTemplates([]); setOccasions([]); setContacts([]); setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<Store>(() => ({
    ready, persistent: persistentOk, cards, favTemplates, recentTemplates, occasions, contacts, settings, saveContact, deleteContact, restore, deletedCards, clearDeletedCards, reloadCards, replaceMeta,
    saveCard, deleteCard, duplicateCard, toggleCardFavourite, toggleTemplateFavourite, markTemplateUsed,
    saveOccasion, deleteOccasion, updateSettings, clearAll,
  }), [ready, persistentOk, cards, favTemplates, recentTemplates, occasions, contacts, settings, saveContact, deleteContact, restore, deletedCards, clearDeletedCards, reloadCards, replaceMeta, saveCard, deleteCard, duplicateCard,
    toggleCardFavourite, toggleTemplateFavourite, markTemplateUsed, saveOccasion, deleteOccasion, updateSettings, clearAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
