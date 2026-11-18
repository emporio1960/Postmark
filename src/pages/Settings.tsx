import { useEffect, useState } from 'react';
import { Crown, Database, ShieldCheck, Trash2 } from 'lucide-react';
import type { Orientation } from '../types';
import { ORIENTATION_LABEL } from '../types';
import { useStore } from '../lib/store';
import { storage } from '../lib/storage';
import { FEATURES } from '../lib/entitlements';
import { navigate } from '../lib/router';
import { Button, ConfirmDialog, PageHeader, Segmented, useToast } from '../components/ui';

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ivory-300/60 py-4 last:border-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-[15px] font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-sm leading-relaxed text-ink-mute">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-gold-600' : 'bg-ivory-400'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

const QUALITY = [{ id: '1', label: 'Standard' }, { id: '1.5', label: 'High' }, { id: '3', label: 'Ultra' }];

export function Settings() {
  const { settings, updateSettings, cards, occasions, favTemplates, clearAll, persistent } = useStore();
  const toast = useToast();
  const [usage, setUsage] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { storage.usage().then(setUsage); }, [cards.length]);
  const px = Math.round(1000 * settings.exportScale);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings" title="Preferences & privacy" />

      <section className="surface mb-6 px-5 py-2 sm:px-7">
        <Row title="Default card shape" hint="Used when you start a card from the template library.">
          <select className="field !w-auto" value={settings.defaultOrientation} aria-label="Default card shape" onChange={(e) => updateSettings({ defaultOrientation: e.target.value as Orientation })}>
            {(Object.keys(ORIENTATION_LABEL) as Orientation[]).map((o) => <option key={o} value={o}>{ORIENTATION_LABEL[o]}</option>)}
          </select>
        </Row>
        <Row title="Your name" hint="Added beneath the sign-off inside new cards and in written messages.">
          <input className="field !w-52" value={settings.signature} maxLength={40} placeholder="e.g. Sam" aria-label="Your name" onChange={(e) => updateSettings({ signature: e.target.value })} />
        </Row>
        <Row title="Export quality" hint={`Cards export at ${px} px on the short side${settings.exportScale >= 1.5 ? ' — print quality (300 dpi or better) at 5 × 7 in.' : ' — ideal for messaging and email.'}`}>
          <Segmented label="Export quality" value={String(settings.exportScale)} onChange={(v) => updateSettings({ exportScale: Number(v) })} options={QUALITY} />
        </Row>
        <Row title="Reduce motion" hint="Turns off the flip animation and other transitions.">
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(reduceMotion) => updateSettings({ reduceMotion })} />
        </Row>
        <Row title="Occasion reminders" hint="Manage browser notifications and reminder timing on the Occasions page.">
          <Button size="sm" onClick={() => navigate('occasions')}>Open Occasions</Button>
        </Row>
      </section>

      <section className="surface mb-6 p-5 sm:p-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700"><ShieldCheck className="h-5 w-5" /></span>
          <h2 className="text-2xl font-semibold">Your data stays with you</h2>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Cards, photographs, favourites, occasions and settings are stored only in this browser on this device.</li>
          <li>Photos you add are never uploaded to a server, and messages are written on your device.</li>
          <li>There are no accounts, no analytics and no third-party services.</li>
          <li>Clearing your browser’s site data, or using private browsing, will remove your cards — export anything you want to keep.</li>
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-ivory-200/60 px-4 py-3 text-sm text-ink-soft">
          <span className="flex items-center gap-2"><Database className="h-4 w-4 text-gold-700" /> {cards.length} card{cards.length === 1 ? '' : 's'} · {occasions.length} occasion{occasions.length === 1 ? '' : 's'} · {favTemplates.length} favourite design{favTemplates.length === 1 ? '' : 's'}</span>
          {usage !== null && <span>About {(usage / 1024 / 1024).toFixed(usage > 10485760 ? 0 : 1)} MB used</span>}
          {!persistent && <span className="text-rosewood">Storage is blocked in this browser – data lasts for this session only.</span>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ivory-300/70 pt-5">
          <p className="max-w-md text-sm text-ink-soft">Permanently delete every card, photo, occasion, favourite and preference stored by Greeting Card Studio on this device.</p>
          <Button variant="danger" onClick={() => setConfirm(true)} icon={<Trash2 className="h-4 w-4" />}>Delete all my data</Button>
        </div>
      </section>

      <section className="surface p-5 sm:p-7">
        <div className="mb-1 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700"><Crown className="h-5 w-5" /></span>
          <div>
            <h2 className="text-2xl font-semibold">Studio Premium</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">Planned · not yet available</p>
          </div>
        </div>
        <p className="mb-4 mt-3 text-sm leading-relaxed text-ink-soft">Everything in the app today is free to use. A premium plan is planned for the future; there is nothing to buy yet and no payment details are collected.</p>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.id}>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-[13px] leading-snug text-ink-mute">{f.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog open={confirm} title="Delete all data?" confirmLabel="Delete everything" onClose={() => setConfirm(false)}
        message="This permanently removes all cards, photographs, occasions, favourites and settings from this device. It cannot be undone."
        onConfirm={() => { clearAll().then(() => toast('All local data deleted')).catch(() => toast('Some data could not be deleted. Try clearing site data in your browser.', 'error')); }} />
    </div>
  );
}
