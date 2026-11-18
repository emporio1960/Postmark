// Template and saved-card tiles, plus the "start a card" action they share.
import { useCallback } from 'react';
import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Orientation, SavedCard } from '../types';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { cx, timeAgo } from '../lib/utils';
import { newCard, templatePreview, type TemplateSpec } from '../data/templates';
import { occasionLabel, styleLabel, type OccasionId } from '../data/occasions';
import { CardCanvas } from './CardCanvas';
import { Button, FavouriteButton, IconButton, useToast } from './ui';

/** Creates a card (from a template or blank), saves it and opens the editor. */
export function useStartCard() {
  const { settings, saveCard, markTemplateUsed } = useStore();
  const toast = useToast();
  return useCallback(async (opts: { template?: TemplateSpec; orientation?: Orientation; occasion?: OccasionId; recipient?: string }) => {
    const card = newCard({ template: opts.template, orientation: opts.orientation ?? settings.defaultOrientation, occasion: opts.occasion, signature: settings.signature, recipient: opts.recipient });
    try { await saveCard(card); } catch (e) { toast((e as Error).message, 'error'); }
    if (opts.template) markTemplateUsed(opts.template.id);
    navigate('edit', {}, card.id);
  }, [settings.defaultOrientation, settings.signature, saveCard, markTemplateUsed, toast]);
}

export function TemplateCard({ template, compact, orientation, recipient }: { template: TemplateSpec; compact?: boolean; orientation?: Orientation; recipient?: string }) {
  const { favTemplates, toggleTemplateFavourite } = useStore();
  const start = useStartCard();
  const doc = templatePreview(template.id, orientation ?? 'portrait');
  const fav = favTemplates.includes(template.id);
  if (!doc) return null;
  const go = () => start({ template, orientation, recipient });
  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-xl shadow-card ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
        <button type="button" onClick={go} aria-label={`Customise ${template.name}`} className="block w-full">
          <CardCanvas doc={doc} label={`${template.name} – ${occasionLabel(template.occasion)} card design`} />
        </button>
        <div className="absolute right-2 top-2">
          <FavouriteButton active={fav} onToggle={() => toggleTemplateFavourite(template.id)} label={fav ? `Remove ${template.name} from favourites` : `Add ${template.name} to favourites`} />
        </div>
      </div>
      <div className="mt-3 px-0.5">
        <h3 className={cx('truncate font-display font-semibold leading-tight', compact ? 'text-lg' : 'text-xl')}>{template.name}</h3>
        <p className="mt-0.5 truncate text-xs text-ink-mute">{occasionLabel(template.occasion)} · {styleLabel(template.style)}</p>
        {!compact && <Button size="sm" className="mt-2.5" onClick={go} icon={<Pencil className="h-3.5 w-3.5" />}>Customise</Button>}
      </div>
    </article>
  );
}

export function SavedCardTile({ card, onPreview, onDelete, compact }: { card: SavedCard; onPreview?: (c: SavedCard) => void; onDelete?: (c: SavedCard) => void; compact?: boolean }) {
  const { toggleCardFavourite, duplicateCard } = useStore();
  const toast = useToast();
  const open = () => navigate('edit', {}, card.id);
  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-xl shadow-card ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
        <button type="button" onClick={open} aria-label={`Edit ${card.name}`} className="block w-full"><CardCanvas doc={card} label={`${card.name} card`} /></button>
        <span className={cx('absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-soft', card.status === 'completed' ? 'bg-ink text-ivory-50' : 'bg-white/90 text-ink-soft')}>
          {card.status === 'completed' ? 'Completed' : 'Draft'}
        </span>
        <div className="absolute right-2 top-2">
          <FavouriteButton active={card.favourite} onToggle={() => toggleCardFavourite(card.id)} label={card.favourite ? `Remove ${card.name} from favourites` : `Add ${card.name} to favourites`} />
        </div>
      </div>
      <div className="mt-3 px-0.5">
        <h3 className="truncate font-display text-lg font-semibold leading-tight">{card.name}</h3>
        <p className="mt-0.5 truncate text-xs text-ink-mute">{occasionLabel(card.occasion)} · edited {timeAgo(card.updatedAt)}</p>
        {!compact && (
          <div className="-ml-2 mt-1 flex items-center">
            <IconButton label={`Edit ${card.name}`} onClick={open}><Pencil className="h-4 w-4" /></IconButton>
            {onPreview && <IconButton label={`Preview ${card.name}`} onClick={() => onPreview(card)}><Eye className="h-4 w-4" /></IconButton>}
            <IconButton label={`Duplicate ${card.name}`} onClick={async () => { const c = await duplicateCard(card.id).catch(() => null); toast(c ? 'Card duplicated' : 'Could not duplicate this card', c ? 'ok' : 'error'); }}><Copy className="h-4 w-4" /></IconButton>
            {onDelete && <IconButton label={`Delete ${card.name}`} onClick={() => onDelete(card)} className="hover:!bg-rosewood/10 hover:!text-rosewood"><Trash2 className="h-4 w-4" /></IconButton>}
          </div>
        )}
      </div>
    </article>
  );
}

export const GRID = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5';

/** Horizontal, swipeable row used on the home screen. */
export function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-6 pt-1 sm:-mx-6 sm:gap-5 sm:px-6 lg:-mx-8 lg:px-8">
      {children}
    </div>
  );
}

export function ShelfItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[42vw] max-w-[200px] shrink-0 snap-start sm:w-[190px]">{children}</div>;
}
