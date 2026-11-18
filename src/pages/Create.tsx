import { useState } from 'react';
import { FilePlus2, RectangleHorizontal, RectangleVertical, Square } from 'lucide-react';
import type { Orientation } from '../types';
import { ORIENTATION_LABEL } from '../types';
import type { Params } from '../lib/router';
import { useStore } from '../lib/store';
import { cx } from '../lib/utils';
import { OCCASIONS, type OccasionId } from '../data/occasions';
import { TEMPLATES } from '../data/templates';
import { GRID, TemplateCard, useStartCard } from '../components/cards';
import { Button, Chip, PageHeader } from '../components/ui';

const LAYOUTS: { id: Orientation; icon: typeof Square }[] = [
  { id: 'portrait', icon: RectangleVertical }, { id: 'landscape', icon: RectangleHorizontal }, { id: 'square', icon: Square },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="surface p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-serif text-sm text-ivory-50">{n}</span>
        <h2 className="text-2xl font-semibold sm:text-[28px]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Create({ params }: { params: Params }) {
  const { settings } = useStore();
  const start = useStartCard();
  const [occasion, setOccasion] = useState<OccasionId>((params.occasion as OccasionId) || 'birthday');
  const [orientation, setOrientation] = useState<Orientation>(settings.defaultOrientation);
  const designs = TEMPLATES.filter((t) => t.occasion === occasion);
  const label = OCCASIONS.find((o) => o.id === occasion)?.label ?? '';

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Create a card" title="Let’s make something lovely" intro="Three quick choices and you’ll be in the editor, where everything can be changed." />

      <Step n={1} title="What’s the occasion?">
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => <Chip key={o.id} active={occasion === o.id} onClick={() => setOccasion(o.id)}><span aria-hidden>{o.emoji}</span>{o.label}</Chip>)}
        </div>
      </Step>

      <Step n={2} title="Choose a card shape">
        <div className="grid max-w-xl grid-cols-3 gap-3">
          {LAYOUTS.map((l) => (
            <button key={l.id} type="button" aria-pressed={orientation === l.id} onClick={() => setOrientation(l.id)}
              className={cx('flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition', orientation === l.id ? 'border-gold-600 bg-gold-100 text-gold-800 shadow-soft' : 'border-ivory-300 bg-white/70 text-ink-soft hover:border-gold-400')}>
              <l.icon className="h-7 w-7" strokeWidth={1.5} />
              <span className="text-[13px] font-semibold capitalize">{l.id}</span>
              <span className="text-[11px] text-ink-mute">{ORIENTATION_LABEL[l.id].split('· ')[1]}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={3} title={`Pick a ${label} design`}>
        <div className={cx(GRID, orientation === 'landscape' && '!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-3 xl:!grid-cols-4')}>
          {designs.map((t) => <TemplateCard key={t.id + orientation} template={t} orientation={orientation} />)}
          <article className="min-w-0">
            <button type="button" onClick={() => start({ orientation, occasion })}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gold-400 bg-ivory-50/70 px-3 text-center text-gold-800 transition hover:-translate-y-1 hover:border-gold-600 hover:bg-gold-100/50"
              style={{ aspectRatio: orientation === 'portrait' ? '1000 / 1400' : orientation === 'landscape' ? '1400 / 1000' : '1 / 1' }}>
              <FilePlus2 className="h-8 w-8" strokeWidth={1.4} />
              <span className="font-display text-xl font-semibold">Start from blank</span>
              <span className="max-w-[14ch] text-xs text-ink-mute">An empty card with a simple gold frame</span>
            </button>
          </article>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ivory-300/70 pt-5">
          <p className="text-sm text-ink-soft">Looking for a different style?</p>
          <Button size="sm" onClick={() => start({ orientation, occasion })}>Start from blank</Button>
        </div>
      </Step>
    </div>
  );
}
