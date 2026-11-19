// iCloud sync engine.
//
// Rules, in plain words:
//  • Each card syncs on its own; the newest edit (by its "last edited" time) wins.
//  • Favourites, occasions, people and shared preferences sync together as one bundle.
//    If two devices changed the bundle at once, the lists are merged by item.
//  • Deleting a card deletes it everywhere, unless another device edited it afterwards.
//  • Nothing is uploaded while a card is open in the editor – it syncs when you leave it.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CloudConfig, Contact, OccasionReminder, SavedCard, Settings } from '../types';
import { CLOUDKIT } from '../config';
import { EMBEDDED } from '../render/export';
import { connect, deleteItem, describeError, ensureZone, fetchItem, isAuthError, pullChanges, pushItem, type Cloud, type Stamp } from './cloud';
import { storage } from './storage';
import { useStore } from './store';

export type SyncStatus = 'unavailable' | 'unconfigured' | 'connecting' | 'signedOut' | 'idle' | 'syncing' | 'error';

interface SyncState {
  user: string;
  env: string;
  token: string | null;
  zoneReady: boolean;
  pushed: Record<string, Stamp>;
  retry: Record<string, Stamp>;
  metaJson: string;
}
const EMPTY: SyncState = { user: '', env: '', token: null, zoneReady: false, pushed: {}, retry: {}, metaJson: '' };

interface Meta { favTemplates: string[]; occasions: OccasionReminder[]; contacts: Contact[]; settings: Partial<Settings> }
const SHARED_SETTINGS: (keyof Settings)[] = ['defaultOrientation', 'signature', 'exportScale', 'signatureImage', 'aiEndpoint'];
const META_KEY = 'meta.main';
const cardKey = (id: string) => `card.${id}`;

interface SyncApi {
  status: SyncStatus;
  message: string;
  lastSynced: number | null;
  config: CloudConfig | null;
  fromBuild: boolean;
  signedIn: boolean;
  syncNow(): Promise<void>;
  /** Ask CloudKit to draw its sign-in / sign-out button into the Settings page. */
  showButtons(): void;
}

const Ctx = createContext<SyncApi | null>(null);

function isCard(v: unknown): v is SavedCard {
  const c = v as SavedCard;
  return !!c && typeof c.id === 'string' && typeof c.updatedAt === 'number' && !!c.front && Array.isArray(c.front.elements) && !!c.inside && Array.isArray(c.inside.elements);
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map(a.map((x) => [x.id, x]));
  for (const x of b) map.set(x.id, x);
  return [...map.values()];
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { ready, settings } = store;
  const config = useMemo<CloudConfig | null>(() => {
    if (settings.cloud?.containerId && settings.cloud.apiToken) return settings.cloud;
    return CLOUDKIT.containerId && CLOUDKIT.apiToken ? { ...CLOUDKIT } : null;
  }, [settings.cloud]);
  const fromBuild = !settings.cloud?.containerId && !!config;
  const configKey = config ? JSON.stringify(config) : '';

  const [status, setStatus] = useState<SyncStatus>(EMBEDDED ? 'unavailable' : 'unconfigured');
  const [message, setMessage] = useState('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const cloud = useRef<Cloud | null>(null);
  const running = useRef(false);
  const again = useRef(false);
  const live = useRef(store);
  live.current = store;

  const localMeta = (): Meta => {
    const s = live.current;
    const shared: Partial<Settings> = {};
    for (const k of SHARED_SETTINGS) if (s.settings[k] !== undefined) (shared as Record<string, unknown>)[k] = s.settings[k];
    return {
      favTemplates: [...s.favTemplates].sort(),
      occasions: [...s.occasions].map(({ lastNotified: _n, ...o }) => o as OccasionReminder).sort((a, b) => a.id.localeCompare(b.id)),
      contacts: [...s.contacts].sort((a, b) => a.id.localeCompare(b.id)),
      settings: shared,
    };
  };

  const runSync = useCallback(async () => {
    const c = cloud.current;
    if (!c || !user || !config) return;
    if (running.current) { again.current = true; return; }
    running.current = true;
    setStatus('syncing'); setMessage('');
    try {
      let st = await storage.get<SyncState>('syncState', EMPTY);
      // A different Apple ID or environment is a different database: start clean.
      if (st.user !== user || st.env !== config.environment) st = { ...EMPTY, user, env: config.environment };
      if (!st.zoneReady) { await ensureZone(c); st.zoneReady = true; }

      // ---- 1. What changed in iCloud ----
      const pulled = await pullChanges(c, st.token);
      const changed = new Map<string, Stamp>([...Object.entries(st.retry), ...pulled.changed]);
      let adopted = false;
      st.retry = {};
      const local = new Map((await storage.allCards()).map((card) => [card.id, card]));

      for (const key of pulled.deleted) {
        if (key.startsWith('card.')) {
          const id = key.slice(5), mine = local.get(id), known = st.pushed[key];
          if (mine && known && mine.updatedAt <= known.stamp) { await storage.deleteCard(id); local.delete(id); }
        }
        delete st.pushed[key];
      }

      for (const [key, remote] of changed) {
        if (st.pushed[key]?.stamp === remote.stamp) { st.pushed[key] = remote; continue; } // our own upload coming back
        if (key.startsWith('card.')) {
          const mine = local.get(key.slice(5));
          if (mine && mine.updatedAt >= remote.stamp) continue; // this device has the newer edit; it uploads below
          const json = await fetchItem(c, key, remote);
          if (json === null) { st.retry[key] = remote; continue; }
          try {
            const card = JSON.parse(json) as unknown;
            if (isCard(card)) { await storage.putCard(card); local.set(card.id, card); st.pushed[key] = remote; }
          } catch { /* unreadable item – leave local data alone */ }
        } else if (key === META_KEY) {
          const json = await fetchItem(c, key, remote);
          if (json === null) { st.retry[key] = remote; continue; }
          try {
            const theirs = JSON.parse(json) as Meta;
            const mine = localMeta();
            // On a device's first sync (no record of the last upload) always merge, so nothing local is lost.
            const changedHere = JSON.stringify(mine) !== st.metaJson;
            const next: Meta = changedHere
              ? { favTemplates: [...new Set([...theirs.favTemplates, ...mine.favTemplates])].sort(), occasions: mergeById(theirs.occasions, mine.occasions), contacts: mergeById(theirs.contacts, mine.contacts), settings: { ...theirs.settings, ...mine.settings } }
              : theirs;
            live.current.replaceMeta(next);
            st.pushed[key] = remote;
            if (!changedHere) adopted = true; // in step with iCloud; nothing to upload
          } catch { /* ignore a damaged bundle */ }
        }
      }
      st.token = pulled.token;

      // ---- 2. Send what changed here ----
      const tombstones = live.current.deletedCards;
      for (const id of tombstones) {
        const key = cardKey(id);
        if (st.pushed[key] && !local.has(id)) await deleteItem(c, key, st.pushed[key].count);
        delete st.pushed[key];
      }
      if (tombstones.length) live.current.clearDeletedCards(tombstones);

      for (const card of local.values()) {
        const key = cardKey(card.id), known = st.pushed[key];
        if (known?.stamp === card.updatedAt) continue;
        st.pushed[key] = await pushItem(c, key, JSON.stringify(card), card.updatedAt, known?.count ?? 0);
        await storage.set('syncState', st); // remember progress if a long upload is interrupted
      }

      await new Promise((r) => setTimeout(r, 80)); // let replaceMeta settle before reading it back
      const metaJson = JSON.stringify(localMeta());
      if (adopted) st.metaJson = metaJson;
      if (metaJson !== st.metaJson) {
        st.pushed[META_KEY] = await pushItem(c, META_KEY, metaJson, Date.now(), st.pushed[META_KEY]?.count ?? 0);
        st.metaJson = metaJson;
      }

      await storage.set('syncState', st);
      await live.current.reloadCards();
      setLastSynced(Date.now());
      setStatus('idle');
    } catch (e) {
      if (isAuthError(e)) { setUser(null); setStatus('signedOut'); }
      else setStatus('error');
      setMessage(describeError(e));
    } finally {
      running.current = false;
      if (again.current) { again.current = false; setTimeout(() => { void runRef.current(); }, 500); }
    }
  }, [user, config]);
  const runRef = useRef(runSync);
  runRef.current = runSync;

  // Connect and find out whether someone is already signed in.
  useEffect(() => {
    if (EMBEDDED) { setStatus('unavailable'); return; }
    if (!ready) return;
    if (!config) { cloud.current = null; setUser(null); setStatus('unconfigured'); return; }
    let alive = true;
    setStatus('connecting'); setMessage('');
    (async () => {
      try {
        const c = await connect(config);
        if (!alive) return;
        cloud.current = c;
        const id = await c.container.setUpAuth();
        if (!alive) return;
        const name = (i: { userRecordName?: string } | null) => i?.userRecordName || 'signed-in';
        setUser(id ? name(id) : null);
        setStatus(id ? 'idle' : 'signedOut');
        const watch = () => {
          c.container.whenUserSignsIn().then((who: { userRecordName?: string }) => {
            if (!alive) return;
            setUser(name(who)); setStatus('idle');
            c.container.whenUserSignsOut().then(() => { if (!alive) return; setUser(null); setStatus('signedOut'); watch(); }).catch(() => undefined);
          }).catch(() => undefined);
        };
        if (id) c.container.whenUserSignsOut().then(() => { if (!alive) return; setUser(null); setStatus('signedOut'); watch(); }).catch(() => undefined);
        else watch();
      } catch (e) {
        if (alive) { setStatus('error'); setMessage(describeError(e)); }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, configKey]);

  // Sync on sign-in, when the app comes back to the front, and every few minutes.
  useEffect(() => {
    if (!user) return;
    void runRef.current();
    const onVisible = () => { if (document.visibilityState === 'visible') void runRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && !location.hash.startsWith('#edit-')) void runRef.current(); }, 180_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer); };
  }, [user]);

  // Sync shortly after anything changes locally (but not while a card is being edited).
  const fingerprint = `${store.cards.length}:${store.cards.reduce((m, c) => Math.max(m, c.updatedAt), 0)}:${store.deletedCards.length}:${store.favTemplates.length}:${JSON.stringify(store.occasions).length}:${JSON.stringify(store.contacts).length}:${settings.signature}:${settings.defaultOrientation}:${settings.exportScale}:${settings.signatureImage?.length ?? 0}`;
  const firstPrint = useRef(true);
  useEffect(() => {
    if (!user) return;
    if (firstPrint.current) { firstPrint.current = false; return; }
    const t = window.setTimeout(() => { if (!location.hash.startsWith('#edit-')) void runRef.current(); }, 4000);
    return () => window.clearTimeout(t);
  }, [fingerprint, user]);
  useEffect(() => {
    const onHash = () => { if (user && !location.hash.startsWith('#edit-')) window.setTimeout(() => { void runRef.current(); }, 1200); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [user]);

  const showButtons = useCallback(() => { cloud.current?.container.setUpAuth().catch(() => undefined); }, []);
  const syncNow = useCallback(() => runRef.current(), []);

  const value = useMemo<SyncApi>(() => ({ status, message, lastSynced, config, fromBuild, signedIn: !!user, syncNow, showButtons }), [status, message, lastSynced, config, fromBuild, user, syncNow, showButtons]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync(): SyncApi {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSync must be used inside <SyncProvider>');
  return s;
}
