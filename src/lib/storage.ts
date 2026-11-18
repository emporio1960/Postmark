// Local persistence on IndexedDB, with an in-memory fallback so the app
// still works (for the current session) when storage is blocked.
import type { SavedCard } from '../types';

const DB_NAME = 'greeting-card-studio';
const DB_VERSION = 1;
const CARDS = 'cards';
const KV = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memCards = new Map<string, SavedCard>();
const memKV = new Map<string, unknown>();
export let persistent = true;

function open(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(CARDS)) db.createObjectStore(CARDS, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { persistent = false; resolve(null); };
        req.onblocked = () => { persistent = false; resolve(null); };
      } catch {
        persistent = false; resolve(null);
      }
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then((db) => {
    if (!db) return undefined;
    return new Promise<T | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error('Storage error'));
        tx.onabort = () => reject(tx.error ?? new Error('Storage is full or unavailable'));
      } catch (e) { reject(e); }
    });
  });
}

export const storage = {
  async allCards(): Promise<SavedCard[]> {
    const db = await open();
    if (!db) return [...memCards.values()];
    return ((await run<SavedCard[]>(CARDS, 'readonly', (s) => s.getAll())) ?? []) as SavedCard[];
  },
  async putCard(card: SavedCard): Promise<void> {
    memCards.set(card.id, card);
    await run(CARDS, 'readwrite', (s) => s.put(card));
  },
  async deleteCard(id: string): Promise<void> {
    memCards.delete(id);
    await run(CARDS, 'readwrite', (s) => s.delete(id));
  },
  async get<T>(key: string, fallback: T): Promise<T> {
    const db = await open();
    if (!db) return (memKV.has(key) ? memKV.get(key) : fallback) as T;
    const v = await run<T>(KV, 'readonly', (s) => s.get(key));
    return v === undefined ? fallback : v;
  },
  async set(key: string, value: unknown): Promise<void> {
    memKV.set(key, value);
    await run(KV, 'readwrite', (s) => s.put(value, key));
  },
  async clearAll(): Promise<void> {
    memCards.clear(); memKV.clear();
    await run(CARDS, 'readwrite', (s) => s.clear());
    await run(KV, 'readwrite', (s) => s.clear());
  },
  async usage(): Promise<number | null> {
    try {
      const est = await navigator.storage?.estimate?.();
      return est?.usage ?? null;
    } catch { return null; }
  },
  async isPersistent(): Promise<boolean> { return (await open()) !== null; },
};
