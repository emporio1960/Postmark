// Thin wrapper around Apple's CloudKit JS for the sync engine.
//
// Everything is stored in the signed-in person's PRIVATE database, in one
// custom zone, as "StudioBlob" records. An item (a card, or the shared
// settings bundle) is JSON split into chunks so that cards with photos stay
// under CloudKit's 1 MB-per-record limit without needing asset uploads.
import type { CloudConfig } from '../types';

export const ZONE = 'GreetingCardStudio';
const TYPE = 'StudioBlob';
const CHUNK = 300_000; // characters per record
const SCRIPT = 'https://cdn.apple-cloudkit.com/ck/2/cloudkit.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type CK = any;
export interface Cloud { container: CK; db: CK }
export interface Stamp { stamp: number; count: number }

let loading: Promise<CK> | null = null;
let configured = '';

function loadCloudKit(): Promise<CK> {
  const w = window as unknown as { CloudKit?: CK };
  if (w.CloudKit) return Promise.resolve(w.CloudKit);
  if (!loading) {
    loading = new Promise<CK>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT; s.async = true;
      s.onload = () => (w.CloudKit ? resolve(w.CloudKit) : reject(new Error('iCloud could not be loaded.')));
      s.onerror = () => { loading = null; reject(new Error('iCloud could not be reached. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function connect(cfg: CloudConfig): Promise<Cloud> {
  const CloudKit = await loadCloudKit();
  const key = JSON.stringify(cfg);
  if (configured !== key) {
    CloudKit.configure({
      containers: [{
        containerIdentifier: cfg.containerId,
        apiTokenAuth: {
          apiToken: cfg.apiToken, persist: true,
          signInButton: { id: 'apple-sign-in-button', theme: 'black' },
          signOutButton: { id: 'apple-sign-out-button', theme: 'black' },
        },
        environment: cfg.environment,
      }],
    });
    configured = key;
  }
  const container = CloudKit.getDefaultContainer();
  return { container, db: container.privateCloudDatabase };
}

export function describeError(e: unknown): string {
  const err = e as { reason?: string; serverErrorCode?: string; ckErrorCode?: string; message?: string } | undefined;
  const code = err?.serverErrorCode || err?.ckErrorCode || '';
  if (/AUTHENTICATION/.test(code)) return 'Your iCloud sign-in has expired. Please sign in again.';
  if (code === 'QUOTA_EXCEEDED') return 'Your iCloud storage is full.';
  if (code === 'ZONE_NOT_FOUND') return 'The iCloud sync zone is missing. Try “Sync now” again.';
  return err?.reason || err?.message || code || 'iCloud sync ran into a problem.';
}

export function isAuthError(e: unknown): boolean {
  const err = e as { serverErrorCode?: string; ckErrorCode?: string } | undefined;
  return /AUTHENTICATION/.test(err?.serverErrorCode || err?.ckErrorCode || '');
}

function check(res: CK): CK {
  if (res?.hasErrors) throw res.errors?.[0] ?? new Error('iCloud error');
  return res;
}

export async function ensureZone({ db }: Cloud): Promise<void> {
  try { await db.saveRecordZones({ zoneName: ZONE }); } catch (e) { if (isAuthError(e)) throw e; /* already exists */ }
}

const val = (r: CK, f: string) => r?.fields?.[f]?.value;

/** Everything that changed in the zone since `token` (metadata only – no payloads). */
export async function pullChanges({ db }: Cloud, token: string | null): Promise<{ token: string | null; changed: Map<string, Stamp>; deleted: Set<string> }> {
  const changed = new Map<string, Stamp>(), deleted = new Set<string>();
  let more = true, guard = 0;
  while (more && guard++ < 200) {
    const res = check(await db.fetchRecordZoneChanges({ zoneID: { zoneName: ZONE }, ...(token ? { syncToken: token } : {}), resultsLimit: 200, desiredKeys: ['item', 'idx', 'count', 'stamp'] }));
    const zone = res.zones?.[0];
    for (const r of zone?.records ?? []) {
      const name = String(r.recordName ?? '');
      if (r.deleted) {
        // Only the first chunk going away means the whole item was deleted.
        if (name.endsWith('.0')) { const key = name.slice(0, -2); deleted.add(key); changed.delete(key); }
      } else {
        const key = String(val(r, 'item') ?? name.replace(/\.\d+$/, ''));
        changed.set(key, { stamp: Number(val(r, 'stamp')) || 0, count: Number(val(r, 'count')) || 1 });
        deleted.delete(key);
      }
    }
    token = zone?.syncToken ?? token;
    more = !!zone?.moreComing;
  }
  return { token, changed, deleted };
}

/** Download and reassemble one item. Returns null if its chunks are mid-upload elsewhere. */
export async function fetchItem({ db }: Cloud, key: string, expect: Stamp): Promise<string | null> {
  const parts: string[] = [];
  for (let i = 0; i < expect.count; i += 3) {
    const names = Array.from({ length: Math.min(3, expect.count - i) }, (_, k) => `${key}.${i + k}`);
    const res = await db.fetchRecords(names, { zoneID: ZONE });
    if (res?.hasErrors) return null;
    const got = new Map<string, CK>((res.records ?? []).map((r: CK) => [r.recordName, r]));
    for (const n of names) {
      const r = got.get(n);
      if (!r || Number(val(r, 'stamp')) !== expect.stamp || typeof val(r, 'data') !== 'string') return null;
      parts.push(val(r, 'data'));
    }
  }
  return parts.join('');
}

/** Upload one item as chunk records (last write wins), removing chunks left over from a longer version. */
export async function pushItem({ db }: Cloud, key: string, json: string, stamp: number, previousCount: number): Promise<Stamp> {
  const count = Math.max(1, Math.ceil(json.length / CHUNK));
  // Write the last chunk first and chunk 0 last, so other devices only see the item once it is complete.
  for (let i = count - 1; i >= 0; i--) {
    const record = {
      recordType: TYPE, recordName: `${key}.${i}`,
      fields: { item: { value: key }, idx: { value: i }, count: { value: count }, stamp: { value: stamp }, data: { value: json.slice(i * CHUNK, (i + 1) * CHUNK) } },
    };
    check(await db.newRecordsBatch({ zoneID: ZONE }).forceReplace(record).commit());
  }
  if (previousCount > count) {
    const extra = Array.from({ length: previousCount - count }, (_, k) => ({ recordName: `${key}.${count + k}` }));
    try { await db.newRecordsBatch({ zoneID: ZONE }).forceDelete(extra).commit(); } catch { /* harmless leftovers */ }
  }
  return { stamp, count };
}

export async function deleteItem({ db }: Cloud, key: string, count: number): Promise<void> {
  const records = Array.from({ length: Math.max(1, count) }, (_, i) => ({ recordName: `${key}.${i}` }));
  try { await db.newRecordsBatch({ zoneID: ZONE }).forceDelete(records).commit(); } catch (e) { if (isAuthError(e)) throw e; }
}
