// Tiny hash router. Views are plain names (#templates, #edit-<id>) so links
// work on any static host; filters travel in memory alongside the view.
import { useSyncExternalStore } from 'react';

export type View = 'home' | 'create' | 'templates' | 'cards' | 'occasions' | 'favourites' | 'preferences' | 'edit' | 'shared';
export type Params = Record<string, string | undefined>;
export interface Route { view: View; id?: string; params: Params }

const VIEWS: View[] = ['home', 'create', 'templates', 'cards', 'occasions', 'favourites', 'preferences'];
const store: Partial<Record<View, Params>> = {};
let current: Route = parse();
const listeners = new Set<() => void>();

function parse(): Route {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, '');
  if (h.startsWith('card=')) return { view: 'shared', id: h.slice(5), params: {} };
  if (h.startsWith('edit-')) return { view: 'edit', id: h.slice(5), params: {} };
  const view = (VIEWS as string[]).includes(h) ? (h as View) : 'home';
  return { view, params: store[view] ?? {} };
}

function emit() { current = parse(); listeners.forEach((l) => l()); }

if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { emit(); window.scrollTo(0, 0); });

export function navigate(view: View, p: Params = {}, id?: string) {
  store[view] = p;
  const hash = view === 'edit' ? `#edit-${id}` : `#${view}`;
  if (location.hash === hash) emit();
  else {
    try { location.hash = hash; } catch { /* ignore */ }
    // Some embedded hosts ignore hash changes – keep the app usable regardless.
    if (location.hash !== hash) { current = { view, id, params: p }; listeners.forEach((l) => l()); }
  }
  window.scrollTo(0, 0);
}

export function goBack(fallback: View = 'home') {
  if (history.length > 1) history.back(); else navigate(fallback);
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => current,
  );
}
