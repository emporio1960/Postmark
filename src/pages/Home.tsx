import { useMemo, useState } from 'react';
import { ArrowRight, CalendarHeart, PenLine, Search, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { COLLECTIONS, OCCASIONS } from '../data/occasions';
import { searchTemplates, TEMPLATE_MAP, templatePreview, TEMPLATES } from '../data/templates';
import { describeDays, upcoming } from '../lib/dates';
import { CardCanvas } from '../components/CardCanvas';
import { SavedCardTile, Shelf, ShelfItem, TemplateCard } from '../components/cards';
import { Button, Modal, SectionHeader } from '../components/ui';
import { MessageWriter } from '../components/MessageWriter';

function HeroStack() {
  const ids = ['wed-botanical', 'bday-gilded', 'bday-bloom'];
  const tilt = ['-rotate-[9deg] -translate-x-[58%] translate-y-3', 'rotate-[8deg] translate-x-[58%] translate-y-4', 'rotate-0 z-10'];
  return (
    <div className="relative mx-auto h-[300px] w-[210px] sm:h-[380px] sm:w-[262px]" aria-hidden>
      {ids.map((id, i) => {
        const doc = templatePreview(id);
        return doc && (
          <div key={id} className={`absolute inset-0 overflow-hidden rounded-xl shadow-lift ring-1 ring-black/5 transition duration-500 hover:-translate-y-2 ${tilt[i]}`}>
            <CardCanvas doc={doc} eager label="" />
          </div>
        );
      })}
    </div>
  );
}

export function Home() {
  const { cards, favTemplates, recentTemplates, occasions } = useStore();
  const [q, setQ] = useState('');
  const [writer, setWriter] = useState(false);
  const results = useMemo(() => (q.trim() ? searchTemplates(q).slice(0, 10) : []), [q]);
  const recentCards = useMemo(() => [...cards].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [cards]);
  const trending = TEMPLATES.filter((t) => t.trending);
  const favs = favTemplates.map((id) => TEMPLATE_MAP[id]).filter(Boolean);
  const recents = recentTemplates.map((id) => TEMPLATE_MAP[id]).filter(Boolean);
  const next = upcoming(occasions).upcoming[0];

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-ivory-300/70 bg-gradient-to-br from-ivory-50 via-[#FBF3E6] to-[#F3E6CF] px-6 py-9 shadow-soft sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-300/25 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-rise">
            <p className="eyebrow mb-3">Digital stationery, made personal</p>
            <h1 className="text-[44px] font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              Cards worth <em className="font-display italic text-gold-700">keeping</em>, made in minutes.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft sm:text-base">
              Choose a design, add your words and photographs, then download, print or share a card that feels unmistakably yours.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={() => navigate('create')} icon={<Sparkles className="h-[18px] w-[18px]" />}>Create a Card</Button>
              <Button size="lg" onClick={() => navigate('templates')}>Browse templates</Button>
            </div>
            <form className="relative mt-7 max-w-md" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate('templates', { q: q.trim() }); }}>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-mute" />
              <input type="search" className="field !rounded-full !py-3 !pl-11" placeholder="Search cards — try “floral”" aria-label="Search greeting cards" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          </div>
          <div className="hidden pb-4 sm:block"><HeroStack /></div>
        </div>
      </section>

      {q.trim() && (
        <section aria-live="polite">
          <SectionHeader eyebrow="Search" title={results.length ? `Designs matching “${q.trim()}”` : `No designs match “${q.trim()}”`}
            action={results.length > 0 && <Button size="sm" variant="ghost" onClick={() => navigate('templates', { q: q.trim() })} icon={<ArrowRight className="h-3.5 w-3.5" />}>See all</Button>} />
          {results.length ? <Shelf>{results.map((t) => <ShelfItem key={t.id}><TemplateCard template={t} compact /></ShelfItem>)}</Shelf>
            : <p className="text-sm text-ink-soft">Try a different word, such as an occasion (“birthday”) or a style (“gold”, “minimalist”).</p>}
        </section>
      )}

      {/* Occasions */}
      <section>
        <SectionHeader eyebrow="Start with a moment" title="Popular occasions" />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-9">
          {OCCASIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => navigate('templates', { occasion: o.id })}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-ivory-300/70 bg-ivory-50/80 px-2 py-3.5 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-gold-400">
              <span className="flex h-11 w-11 items-center justify-center rounded-full text-[22px] transition group-hover:scale-110" style={{ background: o.tint }} aria-hidden>{o.emoji}</span>
              <span className="text-[12px] font-medium leading-tight text-ink-soft group-hover:text-ink">{o.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recently created */}
      <section>
        <SectionHeader eyebrow="Pick up where you left off" title="Recently created cards"
          action={cards.length > 0 && <Button size="sm" variant="ghost" onClick={() => navigate('cards')} icon={<ArrowRight className="h-3.5 w-3.5" />}>My Cards</Button>} />
        {recentCards.length ? <Shelf>{recentCards.map((c) => <ShelfItem key={c.id}><SavedCardTile card={c} compact /></ShelfItem>)}</Shelf> : (
          <div className="surface flex flex-wrap items-center justify-between gap-4 px-6 py-6">
            <div>
              <h3 className="text-xl font-semibold">Your first card is a few taps away</h3>
              <p className="mt-1 text-sm text-ink-soft">Cards you create are saved on this device and appear here.</p>
            </div>
            <Button variant="primary" onClick={() => navigate('create')}>Create a Card</Button>
          </div>
        )}
      </section>

      {/* Collections */}
      <section>
        <SectionHeader eyebrow="Curated for you" title="Featured collections" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((c) => {
            const doc = templatePreview(c.cover);
            const count = TEMPLATES.filter((t) => c.styles.includes(t.style)).length;
            return (
              <button key={c.id} type="button" onClick={() => navigate('templates', { collection: c.id })}
                className="group flex items-center gap-5 overflow-hidden rounded-2xl border border-ivory-300/70 bg-ivory-50/90 p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-card">
                <span className="w-[88px] shrink-0 -rotate-3 overflow-hidden rounded-md shadow-card ring-1 ring-black/5 transition group-hover:rotate-0">{doc && <CardCanvas doc={doc} label="" />}</span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl font-semibold leading-tight">{c.title}</span>
                  <span className="mt-1 block text-sm leading-snug text-ink-soft">{c.blurb}</span>
                  <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">{count} designs</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Trending */}
      <section>
        <SectionHeader eyebrow="Loved right now" title="Trending designs" action={<Button size="sm" variant="ghost" onClick={() => navigate('templates')} icon={<ArrowRight className="h-3.5 w-3.5" />}>All templates</Button>} />
        <Shelf>{trending.map((t) => <ShelfItem key={t.id}><TemplateCard template={t} compact /></ShelfItem>)}</Shelf>
      </section>

      {/* Helpers */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="surface flex items-start gap-4 p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700"><PenLine className="h-5 w-5" /></span>
          <div>
            <h3 className="text-2xl font-semibold">Stuck for words?</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">Tell the message writer who the card is for and the tone you’d like, and it will suggest something heartfelt, funny or formal.</p>
            <Button size="sm" className="mt-3" onClick={() => setWriter(true)}>Open message writer</Button>
          </div>
        </div>
        <div className="surface flex items-start gap-4 p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700"><CalendarHeart className="h-5 w-5" /></span>
          <div>
            <h3 className="text-2xl font-semibold">{next ? `${next.reminder.title} · ${describeDays(next.days).toLowerCase()}` : 'Never miss a moment'}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{next ? `Coming up on ${next.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}. Plenty of time to make something special.` : 'Add birthdays, anniversaries and other dates, and see what’s coming up at a glance.'}</p>
            <Button size="sm" className="mt-3" onClick={() => navigate('occasions')}>{next ? 'View occasions' : 'Add an occasion'}</Button>
          </div>
        </div>
      </section>

      {/* Favourites */}
      <section>
        <SectionHeader eyebrow="Saved by you" title="Favourite templates" action={favs.length > 0 && <Button size="sm" variant="ghost" onClick={() => navigate('favourites')} icon={<ArrowRight className="h-3.5 w-3.5" />}>Favourites</Button>} />
        {favs.length ? <Shelf>{favs.map((t) => <ShelfItem key={t.id}><TemplateCard template={t} compact /></ShelfItem>)}</Shelf>
          : <p className="surface px-6 py-5 text-sm text-ink-soft">Tap the heart on any design to keep it here for next time.</p>}
      </section>

      {/* Recently used */}
      <section>
        <SectionHeader eyebrow="Your go-to designs" title="Recently used designs" />
        {recents.length ? <Shelf>{recents.map((t) => <ShelfItem key={t.id}><TemplateCard template={t} compact /></ShelfItem>)}</Shelf>
          : <p className="surface px-6 py-5 text-sm text-ink-soft">Designs you customise will appear here so you can reuse them quickly.</p>}
      </section>

      <Modal open={writer} onClose={() => setWriter(false)} title="Message writer" wide>
        <MessageWriter />
      </Modal>
    </div>
  );
}
