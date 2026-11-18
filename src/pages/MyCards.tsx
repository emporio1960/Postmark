import { useMemo, useState } from 'react';
import { FolderHeart, Heart, Plus, Search, SearchX } from 'lucide-react';
import type { SavedCard } from '../types';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { occasionLabel } from '../data/occasions';
import { GRID, SavedCardTile } from '../components/cards';
import { PreviewModal } from '../components/PreviewModal';
import { Button, Chip, ConfirmDialog, EmptyState, PageHeader, Spinner, useToast } from '../components/ui';
import { TEMPLATE_MAP } from '../data/templates';
import { TemplateCard } from '../components/cards';

type Filter = 'all' | 'draft' | 'completed' | 'favourite';
type Sort = 'edited' | 'created' | 'name';

export function MyCards() {
  const { ready, cards, deleteCard, persistent, saveCard } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('edited');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<SavedCard | null>(null);
  const [toDelete, setToDelete] = useState<SavedCard | null>(null);

  const counts = useMemo(() => ({
    all: cards.length, draft: cards.filter((c) => c.status === 'draft').length,
    completed: cards.filter((c) => c.status === 'completed').length, favourite: cards.filter((c) => c.favourite).length,
  }), [cards]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cards
      .filter((c) => (filter === 'all' ? true : filter === 'favourite' ? c.favourite : c.status === filter))
      .filter((c) => !term || `${c.name} ${occasionLabel(c.occasion)} ${[...c.front.elements, ...c.inside.elements].map((e) => (e.type === 'text' ? e.text : '')).join(' ')}`.toLowerCase().includes(term))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));
  }, [cards, filter, q, sort]);

  if (!ready) return <Spinner label="Loading your cards…" />;

  return (
    <div>
      <PageHeader eyebrow="My Cards" title="Your card library" intro="Drafts save automatically as you work. Everything here is stored on this device."
        action={<Button variant="primary" onClick={() => navigate('create')} icon={<Plus className="h-4 w-4" />}>New card</Button>} />

      {!persistent && (
        <p role="alert" className="mb-5 rounded-2xl border border-rosewood/30 bg-rosewood/5 px-4 py-3 text-sm text-rosewood">
          This browser is blocking local storage, so cards will only be kept until you close this tab. Download anything you want to keep.
        </p>
      )}

      {cards.length === 0 ? (
        <EmptyState icon={<FolderHeart className="h-6 w-6" />} title="No cards yet" message="When you create a card it is saved here automatically, ready to edit, duplicate or export whenever you like."
          action={<Button variant="primary" onClick={() => navigate('create')}>Create your first card</Button>} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter cards">
              {([['all', 'All'], ['draft', 'Drafts'], ['completed', 'Completed'], ['favourite', 'Favourites']] as [Filter, string][]).map(([id, label]) => (
                <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{label} <span className="opacity-70">{counts[id]}</span></Chip>
              ))}
            </div>
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
              <input type="search" className="field !rounded-full !py-2 !pl-10" placeholder="Search saved cards" aria-label="Search saved cards" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-mute">
              Sort
              <select className="field !w-auto !rounded-full !py-2 !pr-8" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort cards">
                <option value="edited">Recently edited</option><option value="created">Newest</option><option value="name">Name</option>
              </select>
            </label>
          </div>

          {list.length ? (
            <div className={GRID}>{list.map((c) => <SavedCardTile key={c.id} card={c} onPreview={setPreview} onDelete={setToDelete} />)}</div>
          ) : (
            <EmptyState icon={<SearchX className="h-6 w-6" />} title="Nothing to show" message={q ? `No saved cards match “${q}”.` : 'There are no cards in this view yet.'}
              action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Show all cards</Button>} />
          )}
        </>
      )}

      {preview && <PreviewModal doc={preview} name={preview.name} recipient={preview.recipient} envelope={preview.envelope} onEnvelopeChange={(envelope) => { saveCard({ ...preview, envelope }).catch(() => undefined); }} onClose={() => setPreview(null)} />}
      <ConfirmDialog open={!!toDelete} title="Delete this card?" confirmLabel="Delete card" onClose={() => setToDelete(null)}
        message={`“${toDelete?.name ?? ''}” will be permanently removed from this device. This cannot be undone.`}
        onConfirm={() => { if (toDelete) { deleteCard(toDelete.id); toast('Card deleted'); } }} />
    </div>
  );
}

export function Favourites() {
  const { ready, cards, favTemplates, saveCard } = useStore();
  const [preview, setPreview] = useState<SavedCard | null>(null);
  const templates = favTemplates.map((id) => TEMPLATE_MAP[id]).filter(Boolean);
  const favCards = cards.filter((c) => c.favourite).sort((a, b) => b.updatedAt - a.updatedAt);
  if (!ready) return <Spinner />;
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Favourites" title="The ones you love" intro="Templates and cards you’ve marked with a heart, all in one place." />
      {!templates.length && !favCards.length && (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No favourites yet" message="Tap the heart on any template or saved card and it will be kept here."
          action={<Button variant="primary" onClick={() => navigate('templates')}>Browse templates</Button>} />
      )}
      {templates.length > 0 && (
        <section>
          <h2 className="mb-4 text-3xl font-semibold">Favourite templates <span className="text-lg text-ink-mute">({templates.length})</span></h2>
          <div className={GRID}>{templates.map((t) => <TemplateCard key={t.id} template={t} />)}</div>
        </section>
      )}
      {favCards.length > 0 && (
        <section>
          <h2 className="mb-4 text-3xl font-semibold">Favourite cards <span className="text-lg text-ink-mute">({favCards.length})</span></h2>
          <div className={GRID}>{favCards.map((c) => <SavedCardTile key={c.id} card={c} onPreview={setPreview} />)}</div>
        </section>
      )}
      {preview && <PreviewModal doc={preview} name={preview.name} recipient={preview.recipient} envelope={preview.envelope} onEnvelopeChange={(envelope) => { saveCard({ ...preview, envelope }).catch(() => undefined); }} onClose={() => setPreview(null)} />}
    </div>
  );
}
