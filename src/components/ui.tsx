// Shared UI primitives.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, Heart, Loader2, X } from 'lucide-react';
import { cx } from '../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-gold-400 to-gold-600 text-white shadow-[0_8px_20px_-8px_rgba(168,132,63,.8)] hover:from-gold-500 hover:to-gold-700',
  secondary: 'border border-ivory-400 bg-white/70 text-ink hover:border-gold-500 hover:bg-white',
  ghost: 'text-ink-soft hover:bg-ivory-200/80 hover:text-ink',
  danger: 'border border-rosewood/30 bg-white/70 text-rosewood hover:bg-rosewood hover:text-white',
  dark: 'bg-ink text-ivory-50 hover:bg-black',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm' | 'md' | 'lg'; busy?: boolean; icon?: ReactNode }

export function Button({ variant = 'secondary', size = 'md', busy, icon, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3.5 py-1.5 text-xs' : size === 'lg' ? 'px-7 py-3.5 text-base' : 'px-5 py-2.5 text-sm',
        VARIANT[variant], className,
      )}
      {...rest}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { label: string; active?: boolean; tone?: 'plain' | 'solid' }

export function IconButton({ label, active, tone = 'plain', className, children, ...rest }: IconBtnProps) {
  return (
    <button
      type="button" aria-label={label} title={label} aria-pressed={active}
      className={cx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-35',
        tone === 'solid' ? 'bg-white/90 text-ink shadow-soft hover:bg-white' : active ? 'bg-gold-100 text-gold-800' : 'text-ink-soft hover:bg-ivory-200 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={!!active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
        active ? 'border-gold-600 bg-gold-600 text-white shadow-sm' : 'border-ivory-300 bg-white/70 text-ink-soft hover:border-gold-400 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FavouriteButton({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button" aria-label={label} aria-pressed={active} title={label}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur transition hover:scale-105', active ? 'text-rosewood' : 'text-ink-soft hover:text-rosewood')}
    >
      <Heart className="h-[18px] w-[18px]" fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={cx('relative flex max-h-[92dvh] w-full animate-pop flex-col rounded-t-3xl bg-ivory-50 shadow-lift outline-none sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-center justify-between gap-4 border-b border-ivory-300/70 px-6 py-4">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="thin-scroll overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ivory-300/70 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
    </>}>
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
    </Modal>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-700">{icon}</div>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-[26px] font-semibold leading-tight sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl">{title}</h1>
        {intro && <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{intro}</p>}
      </div>
      {action}
    </header>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-mute" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span className="text-sm">{label}</span>
    </div>
  );
}

export const SWATCHES = ['#2B2622', '#5C544C', '#FFFFFF', '#FBF7EF', '#F3E9DC', '#C2A05A', '#A8843F', '#E9D5A5', '#F6E1DC', '#E8A7A1', '#B5362F', '#8E2F3C', '#F2B84B', '#E07A5F', '#A9B8A0', '#5E7A63', '#2F4A3A', '#B8D8E8', '#7FB7BE', '#1F2A44', '#CDB4DB', '#8C7AA8'];

export function ColorPicker({ value, onChange, label = 'Colour' }: { value: string; onChange: (c: string) => void; label?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value.toLowerCase() === c.toLowerCase()} onClick={() => onChange(c)}
            className={cx('h-7 w-7 rounded-full border transition hover:scale-110', value.toLowerCase() === c.toLowerCase() ? 'border-gold-700 ring-2 ring-gold-400 ring-offset-1 ring-offset-ivory-50' : 'border-ivory-400')}
            style={{ background: c }}
          />
        ))}
        <label className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-ivory-400" title="Custom colour" style={{ background: 'conic-gradient(#e8837e,#f2b84b,#8cc084,#7fb7be,#b79ad6,#e8837e)' }}>
          <input type="color" aria-label={`Custom ${label.toLowerCase()}`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#c2a05a'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full opacity-0" />
        </label>
      </div>
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <span className="text-xs tabular-nums text-ink-mute">{format ? format(value) : Math.round(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-ivory-300 bg-white/70 p-0.5">
      {options.map((o) => (
        <button
          key={o.id} type="button" title={o.title} aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={cx('inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition', value === o.id ? 'bg-ink text-ivory-50 shadow-sm' : 'text-ink-soft hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toasts ---------- */
interface Toast { id: number; text: string; kind: 'ok' | 'error' }
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'error') => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex max-w-md animate-rise items-center gap-2.5 rounded-full px-5 py-3 text-sm shadow-lift', t.kind === 'error' ? 'bg-rosewood text-white' : 'bg-ink text-ivory-50')}>
            {t.kind === 'ok' ? <Check className="h-4 w-4 shrink-0 text-gold-300" /> : <X className="h-4 w-4 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() { return useContext(ToastCtx); }
