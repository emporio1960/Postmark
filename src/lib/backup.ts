// Backup and restore: everything the app stores, in one JSON file the user keeps.
import type { Contact, OccasionReminder, SavedCard, Settings } from '../types';

export interface Backup {
  app: 'greeting-card-studio';
  version: 1;
  exportedAt: string;
  cards: SavedCard[];
  favTemplates: string[];
  recentTemplates: string[];
  occasions: OccasionReminder[];
  contacts: Contact[];
  settings: Partial<Settings>;
}

export function makeBackup(data: Omit<Backup, 'app' | 'version' | 'exportedAt'>): Blob {
  const backup: Backup = { app: 'greeting-card-studio', version: 1, exportedAt: new Date().toISOString(), ...data };
  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Reads and validates a backup file. Throws a friendly Error if it is not one of ours. */
export async function readBackup(file: File): Promise<Backup> {
  if (file.size > 400 * 1024 * 1024) throw new Error('That file is too large to be a Greeting Card Studio backup.');
  let data: unknown;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('That file could not be read. Choose a backup file saved from this app.'); }
  if (!isObj(data) || data.app !== 'greeting-card-studio' || !Array.isArray(data.cards)) throw new Error('That file is not a Greeting Card Studio backup.');
  const cards = (data.cards as unknown[]).filter((c): c is SavedCard => {
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string') return false;
    const ok = (f: unknown) => isObj(f) && Array.isArray(f.elements) && isObj(f.background);
    return ok(c.front) && ok(c.inside) && ['portrait', 'landscape', 'square'].includes(String(c.orientation));
  });
  const withId = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => isObj(x) && typeof x.id === 'string') as T[]) : []);
  return {
    app: 'greeting-card-studio', version: 1, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    cards, favTemplates: strings(data.favTemplates), recentTemplates: strings(data.recentTemplates),
    occasions: withId<OccasionReminder>(data.occasions), contacts: withId<Contact>(data.contacts),
    settings: isObj(data.settings) ? (data.settings as Partial<Settings>) : {},
  };
}
