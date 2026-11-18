// Undo / redo for the editor. Rapid changes that share a key (dragging,
// slider scrubbing, typing) are merged into a single history step.
import { useCallback, useRef, useState } from 'react';

interface State<T> { past: T[]; present: T; future: T[] }

export function useHistory<T>(initial: T) {
  const [state, setState] = useState<State<T>>({ past: [], present: initial, future: [] });
  const last = useRef<{ key: string; t: number } | null>(null);

  const apply = useCallback((fn: (doc: T) => T, key?: string, sticky = false) => {
    const now = Date.now();
    const prev = last.current;
    const merge = !!key && !!prev && prev.key === key && (sticky || now - prev.t < 900);
    last.current = key ? { key, t: now } : null;
    setState((s) => {
      const next = fn(s.present);
      if (next === s.present) return s;
      return { past: merge ? s.past : [...s.past, s.present].slice(-80), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = null;
    setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    last.current = null;
    setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);

  return { doc: state.present, apply, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

export type Apply<T> = (fn: (doc: T) => T, key?: string, sticky?: boolean) => void;
