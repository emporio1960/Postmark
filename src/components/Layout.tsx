// App chrome: top navigation on desktop, refined bottom bar on mobile.
import { useState, type ReactNode } from 'react';
import { CalendarHeart, FolderHeart, Heart, Home, LayoutGrid, MoreHorizontal, Plus, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { navigate, type View } from '../lib/router';
import { cx } from '../lib/utils';
import { Button } from './ui';

interface NavItem { view: View; label: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'create', label: 'Create Card', icon: Sparkles },
  { view: 'templates', label: 'Templates', icon: LayoutGrid },
  { view: 'cards', label: 'My Cards', icon: FolderHeart },
  { view: 'occasions', label: 'Occasions', icon: CalendarHeart },
  { view: 'favourites', label: 'Favourites', icon: Heart },
  { view: 'preferences', label: 'Settings', icon: Settings },
];

export function Logo({ small }: { small?: boolean }) {
  return (
    <button type="button" onClick={() => navigate('home')} className="flex items-center gap-2.5" aria-label="Greeting Card Studio – home">
      <span className={cx('flex items-center justify-center rounded-[10px] bg-gradient-to-br from-gold-300 to-gold-600 text-white shadow-[0_6px_14px_-6px_rgba(168,132,63,.9)]', small ? 'h-8 w-8' : 'h-9 w-9')}>
        <Heart className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
      </span>
      <span className="text-left leading-none">
        <span className="block font-display text-[21px] font-semibold tracking-tight">Greeting Card</span>
        <span className="block text-[9.5px] font-semibold uppercase tracking-[0.42em] text-gold-700">Studio</span>
      </span>
    </button>
  );
}

export function Layout({ view, children }: { view: View; children: ReactNode }) {
  const [more, setMore] = useState(false);
  const moreViews: View[] = ['occasions', 'favourites', 'preferences'];
  const go = (v: View) => { setMore(false); navigate(v); };
  const tab = (item: NavItem) => {
    const active = view === item.view;
    return (
      <button key={item.view} type="button" onClick={() => go(item.view)} aria-current={active ? 'page' : undefined}
        className={cx('flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-medium transition', active ? 'text-gold-700' : 'text-ink-mute')}>
        <item.icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.7} />
        {item.label}
      </button>
    );
  };
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-ivory-300/60 bg-ivory-100/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {NAV.filter((n) => n.view !== 'create').map((n) => (
              <button key={n.view} type="button" onClick={() => go(n.view)} aria-current={view === n.view ? 'page' : undefined}
                className={cx('relative rounded-full px-3 py-2 text-sm font-medium transition lg:px-3.5', view === n.view ? 'text-ink' : 'text-ink-mute hover:text-ink')}>
                {n.label}
                {view === n.view && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gold-500" />}
              </button>
            ))}
          </nav>
          <Button variant="primary" onClick={() => go('create')} icon={<Plus className="h-4 w-4" />} className="hidden md:inline-flex">Create a Card</Button>
          <Button variant="primary" size="sm" onClick={() => go('create')} icon={<Plus className="h-4 w-4" />} className="md:hidden">Create</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl animate-fade px-4 py-6 sm:px-6 sm:py-10 lg:px-8">{children}</main>

      <footer className="mx-auto hidden max-w-7xl px-8 pb-10 pt-6 text-center text-xs text-ink-mute md:block">
        Your cards, photos and reminders are stored only on this device.
      </footer>

      {/* Mobile bottom navigation */}
      {more && <div className="fixed inset-0 z-40 bg-ink/30 md:hidden" onClick={() => setMore(false)} />}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
        {more && (
          <div className="mx-3 mb-2 animate-rise overflow-hidden rounded-2xl border border-ivory-300 bg-ivory-50 shadow-lift">
            {NAV.filter((n) => moreViews.includes(n.view)).map((n) => (
              <button key={n.view} type="button" onClick={() => go(n.view)} className={cx('flex w-full items-center gap-3 border-b border-ivory-200 px-5 py-3.5 text-left text-sm font-medium last:border-0', view === n.view ? 'text-gold-700' : 'text-ink')}>
                <n.icon className="h-[18px] w-[18px]" /> {n.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end border-t border-ivory-300/70 bg-ivory-50/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1 backdrop-blur-md">
          {tab(NAV[0])}
          {tab(NAV[2])}
          <button type="button" onClick={() => go('create')} aria-label="Create a card" aria-current={view === 'create' ? 'page' : undefined} className="flex flex-1 flex-col items-center gap-1 pb-2 text-[10.5px] font-medium text-gold-700">
            <span className="-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 text-white shadow-[0_10px_22px_-8px_rgba(168,132,63,.95)] ring-4 ring-ivory-50">
              <Plus className="h-6 w-6" />
            </span>
            Create
          </button>
          {tab(NAV[3])}
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className={cx('flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-medium', more || moreViews.includes(view) ? 'text-gold-700' : 'text-ink-mute')}>
            <MoreHorizontal className="h-[21px] w-[21px]" strokeWidth={1.7} />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
