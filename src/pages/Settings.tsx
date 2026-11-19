import { useEffect, useRef, useState } from 'react';
import { Cloud, Crown, Database, Download, PenTool, RefreshCw, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { makeBackup, readBackup } from '../lib/backup';
import { saveBlob } from '../render/export';
import { isValidEndpoint } from '../data/messages';
import { SignaturePad } from '../components/SignaturePad';
import { useSync } from '../lib/sync';
import { timeAgo } from '../lib/utils';
import type { CloudConfig } from '../types';
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

function CloudSync() {
  const { settings, updateSettings } = useStore();
  const sync = useSync();
  const toast = useToast();
  const [form, setForm] = useState<CloudConfig>(settings.cloud ?? { containerId: '', apiToken: '', environment: 'development' });
  const [error, setError] = useState('');
  const { status, showButtons } = sync;
  // CloudKit draws its own Apple sign-in / sign-out button into the placeholders below.
  useEffect(() => { if (status === 'signedOut' || status === 'idle') showButtons(); }, [status, showButtons]);

  const save = () => {
    const id = form.containerId.trim(), token = form.apiToken.trim();
    if (!/^iCloud\.[\w.-]+$/.test(id)) { setError('The container ID starts with “iCloud.”, for example iCloud.com.yourname.cards'); return; }
    if (token.length < 20) { setError('Paste the full API token from the CloudKit Console.'); return; }
    setError(''); updateSettings({ cloud: { containerId: id, apiToken: token, environment: form.environment } }); toast('iCloud details saved');
  };
  const label: Record<typeof status, string> = {
    unavailable: 'Not available in this embedded preview', unconfigured: 'Not set up', connecting: 'Connecting to iCloud…', signedOut: 'Not signed in',
    idle: sync.lastSynced ? `Up to date · synced ${timeAgo(sync.lastSynced)}` : 'Signed in', syncing: 'Syncing…', error: 'Sync problem',
  };
  const dot = status === 'idle' ? 'bg-emerald-600' : status === 'syncing' || status === 'connecting' ? 'bg-gold-500 animate-pulse' : status === 'error' ? 'bg-rosewood' : 'bg-ivory-400';

  return (
    <section className="surface mb-6 p-5 sm:p-7" aria-label="iCloud sync">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700"><Cloud className="h-5 w-5" /></span>
          <div>
            <h2 className="text-2xl font-semibold">iCloud sync</h2>
            <p className="flex items-center gap-2 text-xs text-ink-mute" role="status"><span className={`h-2 w-2 rounded-full ${dot}`} />{label[status]}</p>
          </div>
        </div>
        {sync.signedIn && <Button size="sm" variant="dark" busy={status === 'syncing'} onClick={() => sync.syncNow()} icon={<RefreshCw className="h-3.5 w-3.5" />}>Sync now</Button>}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Keep cards, people, occasions, favourites and your signature in step across your devices using your own private iCloud database. Sign in with the same Apple Account on each device.
      </p>
      {sync.message && <p role="alert" className="mt-3 rounded-xl bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood">{sync.message}</p>}

      {status === 'unavailable' ? (
        <p className="mt-3 text-sm text-ink-mute">Open the app at its own web address (or from your Home Screen) to use iCloud sync.</p>
      ) : !sync.config ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-ink-soft">One-off setup: create a CloudKit container and an API token in Apple’s CloudKit Console (steps are in <code>CLOUDKIT.md</code> in the project), then paste them here.</p>
          <label className="block"><span className="label">Container ID</span>
            <input className="field" value={form.containerId} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="iCloud.com.yourname.greetingcardstudio" onChange={(e) => setForm({ ...form, containerId: e.target.value })} /></label>
          <label className="block"><span className="label">API token</span>
            <input className="field" value={form.apiToken} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Paste the token from the CloudKit Console" onChange={(e) => setForm({ ...form, apiToken: e.target.value })} /></label>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="CloudKit environment" value={form.environment} onChange={(environment) => setForm({ ...form, environment })} options={[{ id: 'development', label: 'Development' }, { id: 'production', label: 'Production' }]} />
            <Button variant="primary" onClick={save}>Save and connect</Button>
          </div>
          {error && <p role="alert" className="text-xs text-rosewood">{error}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex min-h-[44px] flex-wrap items-center gap-3">
            <div id="apple-sign-in-button" />
            <div id="apple-sign-out-button" />
          </div>
          <p className="text-xs leading-relaxed text-ink-mute">
            Container <code>{sync.config.containerId}</code> · {sync.config.environment}. Apple asks you to sign in again from time to time (tick “Keep me signed in” for two weeks).
            Cards upload when you leave the editor; the newest edit of a card wins.
          </p>
          {!sync.fromBuild && (
            <Button size="sm" variant="ghost" onClick={() => { updateSettings({ cloud: undefined }); setForm({ containerId: '', apiToken: '', environment: 'development' }); toast('iCloud details removed from this device'); }}>Remove iCloud details from this device</Button>
          )}
        </div>
      )}
    </section>
  );
}

const QUALITY = [{ id: '1', label: 'Standard' }, { id: '1.5', label: 'High' }, { id: '3', label: 'Ultra' }];

export function Settings() {
  const { settings, updateSettings, cards, occasions, favTemplates, recentTemplates, contacts, clearAll, persistent, restore } = useStore();
  const [pad, setPad] = useState(false);
  const [busy, setBusy] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [endpoint, setEndpoint] = useState(settings.aiEndpoint ?? '');
  const endpointBad = !!endpoint.trim() && !isValidEndpoint(endpoint.trim());

  const backup = async () => {
    setBusy('backup');
    try {
      const blob = makeBackup({ cards, favTemplates, recentTemplates, occasions, contacts, settings });
      const outcome = await saveBlob(blob, `greeting-card-studio-backup-${new Date().toISOString().slice(0, 10)}.json`);
      if (outcome === 'saved') toast('Backup saved – keep the file somewhere safe');
      else if (outcome === 'unavailable') toast('Backups can’t be saved from this embedded preview. Open the app in its own tab.', 'error');
    } catch { toast('The backup could not be created.', 'error'); }
    finally { setBusy(''); }
  };

  const onRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy('restore');
    try {
      const res = await restore(await readBackup(file));
      toast(`Backup restored – ${res.cards} card${res.cards === 1 ? '' : 's'} added or updated`);
    } catch (e) { toast((e as Error).message || 'That backup could not be restored.', 'error'); }
    finally { setBusy(''); if (fileInput.current) fileInput.current.value = ''; }
  };
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

      <section className="surface mb-6 px-5 py-2 sm:px-7">
        <Row title="Handwritten signature" hint="Draw it once, then add it to any card from the Text tab in the editor.">
          <div className="flex items-center gap-2">
            {settings.signatureImage && <img src={settings.signatureImage} alt="Your saved signature" className="h-10 max-w-[120px] rounded-md bg-white object-contain px-1" />}
            <Button size="sm" onClick={() => setPad(true)} icon={<PenTool className="h-3.5 w-3.5" />}>{settings.signatureImage ? 'Redraw' : 'Draw signature'}</Button>
            {settings.signatureImage && <Button size="sm" variant="ghost" onClick={() => { updateSettings({ signatureImage: undefined }); toast('Signature removed'); }}>Remove</Button>}
          </div>
        </Row>
        <div className="border-b border-ivory-300/60 py-4 last:border-0">
          <p className="flex items-center gap-2 text-[15px] font-medium"><Sparkles className="h-4 w-4 text-gold-700" /> AI message writer (optional)</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-mute">
            The built-in writer works offline. To use AI-written messages, deploy your own small backend (an example is included in the project’s <code>server/</code> folder) and paste its address here.
            Your API key stays on that server — it is never stored in this app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className="field min-w-0 flex-1 basis-64" inputMode="url" value={endpoint} placeholder="https://your-worker.example.workers.dev" aria-label="AI endpoint address" aria-invalid={endpointBad} onChange={(e) => setEndpoint(e.target.value)} />
            <Button size="sm" variant="dark" disabled={endpointBad || endpoint.trim() === (settings.aiEndpoint ?? '')} onClick={() => { updateSettings({ aiEndpoint: endpoint.trim() || undefined }); toast(endpoint.trim() ? 'AI endpoint saved' : 'AI endpoint removed – using the built-in writer'); }}>Save</Button>
          </div>
          {endpointBad && <p role="alert" className="mt-1.5 text-xs text-rosewood">Enter a full address starting with https://</p>}
          {!endpointBad && settings.aiEndpoint && <p className="mt-1.5 text-xs text-ink-mute">Message briefs (recipient, occasion, tone and any detail you add) are sent to this address when you ask for suggestions.</p>}
        </div>
      </section>

      <CloudSync />

      <section className="surface mb-6 p-5 sm:p-7">
        <h2 className="text-2xl font-semibold">Backup &amp; restore</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">Cards live only in this browser. Save a backup file to move everything to another device, or to keep a safe copy. Restoring adds to what is already here; it never deletes.</p>
        <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file to restore" onChange={(e) => onRestoreFile(e.target.files?.[0])} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="dark" busy={busy === 'backup'} onClick={backup} icon={<Download className="h-4 w-4" />}>Download backup</Button>
          <Button busy={busy === 'restore'} onClick={() => fileInput.current?.click()} icon={<Upload className="h-4 w-4" />}>Restore from file</Button>
        </div>
      </section>

      <section className="surface mb-6 p-5 sm:p-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700"><ShieldCheck className="h-5 w-5" /></span>
          <h2 className="text-2xl font-semibold">Your data stays with you</h2>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Cards, photographs, favourites, occasions and settings are stored in this browser on this device — and, only if you turn on iCloud sync, in your own private iCloud database.</li>
          <li>Photos you add are never uploaded to a server, and messages are written on your device unless you add your own AI endpoint above.</li>
          <li>There are no accounts and no analytics. Card links carry the card inside the link itself, so no server stores it.</li>
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

      <SignaturePad open={pad} onClose={() => setPad(false)} onSave={(src) => { updateSettings({ signatureImage: src }); setPad(false); toast('Signature saved'); }} />
      <ConfirmDialog open={confirm} title="Delete all data?" confirmLabel="Delete everything" onClose={() => setConfirm(false)}
        message="This permanently removes all cards, photographs, occasions, favourites and settings from this device. It cannot be undone. Anything already synced to iCloud stays there and returns if you sign in again."
        onConfirm={() => { clearAll().then(() => toast('All local data deleted')).catch(() => toast('Some data could not be deleted. Try clearing site data in your browser.', 'error')); }} />
    </div>
  );
}
