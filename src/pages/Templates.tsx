import { useEffect, useMemo, useState } from 'react';
import { Search, SearchX, X } from 'lucide-react';
import type { Params } from '../lib/router';
import { COLLECTIONS, OCCASIONS, STYLES, type StyleId } from '../data/occasions';
import { searchTemplates } from '../data/templates';
import { GRID, TemplateCard } from '../components/cards';
import { Button, Chip, EmptyState, PageHeader } from '../components/ui';

export function Templates({ params }: { params: Params }) {
  const [q, setQ] = useState(params.q ?? '');
  const [occasion, setOccasion] = useState(params.occasion ?? '');
  const [style, setStyle] = useState<string>(params.style ?? '');
  const [collection, setCollection] = useState(params.collection ?? '');

  // Follow navigation from elsewhere in the app (e.g. tapping an occasion on Home).
  useEffect(() => {
    setQ(params.q ?? ''); setOccasion(params.occasion ?? ''); setStyle(params.style ?? ''); setCollection(params.collection ?? '');
  }, [params]);

  const coll = COLLECTIONS.find((c) => c.id === collection);
  const results = useMemo(() => {
    const styles: string[] | undefined = style ? [style] : coll ? (coll.styles as StyleId[]) : undefined;
    return searchTemplates(q, occasion || undefined, styles);
  }, [q, occasion, style, coll]);
  const filtered = !!(q || occasion || style || collection);
  const clear = () => { setQ(''); setOccasion(''); setStyle(''); setCollection(''); };

  return (
    <div>
      <PageHeader eyebrow="Template library" title={coll ? coll.title : 'Find the perfect design'}
        intro={coll ? coll.blurb : 'Every design is fully editable — change the words, colours, artwork and layout to make it yours.'} />

      <div className="sticky top-16 z-20 -mx-4 mb-6 space-y-3 border-b border-ivory-300/60 bg-ivory-100/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-mute" />
          <input type="search" className="field !rounded-full !pl-11" placeholder="Search by name, occasion or style" aria-label="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by occasion">
          <Chip active={!occasion} onClick={() => setOccasion('')}>All occasions</Chip>
          {OCCASIONS.map((o) => <Chip key={o.id} active={occasion === o.id} onClick={() => setOccasion(occasion === o.id ? '' : o.id)}><span aria-hidden>{o.emoji}</span>{o.label}</Chip>)}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by style">
          <Chip active={!style && !collection} onClick={() => { setStyle(''); setCollection(''); }}>All styles</Chip>
          {STYLES.map((s) => <Chip key={s.id} active={style === s.id} onClick={() => { setCollection(''); setStyle(style === s.id ? '' : s.id); }}>{s.label}</Chip>)}
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-mute" aria-live="polite">{results.length} design{results.length === 1 ? '' : 's'}{coll ? ` in ${coll.title}` : ''}</p>
        {filtered && <Button size="sm" variant="ghost" onClick={clear} icon={<X className="h-3.5 w-3.5" />}>Clear filters</Button>}
      </div>

      {results.length ? (
        <div className={GRID}>{results.map((t) => <TemplateCard key={t.id} template={t} />)}</div>
      ) : (
        <EmptyState icon={<SearchX className="h-6 w-6" />} title="No designs found" message="Nothing matches those filters yet. Try another occasion or style, or clear the filters to see everything."
          action={<Button variant="primary" onClick={clear}>Show all designs</Button>} />
      )}
    </div>
  );
}
