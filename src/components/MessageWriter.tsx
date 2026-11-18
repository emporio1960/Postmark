// Personal message writer UI. Talks to a MessageProvider (see data/messages).
import { useState } from 'react';
import { ClipboardCopy, PenLine, RefreshCw, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { OCCASIONS, type OccasionId } from '../data/occasions';
import { effectiveTone, isValidEndpoint, MESSAGE_CATEGORIES, providers, RELATIONSHIPS, remoteProvider, TONES, type MessageLength, type MessageRequest, type Relationship } from '../data/messages';
import { copyText } from '../render/export';
import { Button, Chip, Segmented, useToast } from './ui';

export function MessageWriter({ occasion, recipient, onUse }: { occasion?: OccasionId; recipient?: string; onUse?: (message: string) => void }) {
  const { settings } = useStore();
  const toast = useToast();
  const [req, setReq] = useState<MessageRequest>({
    recipient: recipient ?? '', occasion: occasion ?? 'birthday', relationship: 'Friend', tone: 'warm', length: 'medium', details: '', sender: settings.signature,
  });
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const ai = settings.aiEndpoint && isValidEndpoint(settings.aiEndpoint) ? settings.aiEndpoint : '';
  const set = (patch: Partial<MessageRequest>) => setReq((r) => ({ ...r, ...patch }));
  const toneUsed = effectiveTone(req.occasion, req.tone);

  const generate = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      let out: string[] = [];
      if (ai) {
        // Try the user's AI endpoint first; fall back to the built-in writer if it fails.
        try { out = await remoteProvider(ai).generate(req); }
        catch (e) { setNote(`${(e as Error).message} Showing built-in suggestions instead.`); }
      }
      if (!out.length) out = await providers[0].generate(req);
      if (!out.length) throw new Error('No suggestions were produced. Try a different tone.');
      setResults(out);
    } catch (e) {
      setError((e as Error).message || 'The message writer ran into a problem. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="label">Quick ideas</span>
        <div className="flex flex-wrap gap-1.5">
          {MESSAGE_CATEGORIES.map((c) => (
            <Chip key={c.label} onClick={() => set(c.preset)} active={c.preset.occasion === req.occasion && c.preset.tone === req.tone && (!c.preset.relationship || c.preset.relationship === req.relationship)}>{c.label}</Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block sm:col-span-1">
          <span className="label">Recipient</span>
          <input className="field" value={req.recipient} maxLength={40} onChange={(e) => set({ recipient: e.target.value })} placeholder="e.g. Grandma, Alex" />
        </label>
        <label className="col-span-2 block sm:col-span-1">
          <span className="label">From</span>
          <input className="field" value={req.sender} maxLength={40} onChange={(e) => set({ sender: e.target.value })} placeholder="Your name" />
        </label>
        <label className="block">
          <span className="label">Occasion</span>
          <select className="field" value={req.occasion} onChange={(e) => set({ occasion: e.target.value as OccasionId })}>
            {OCCASIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Relationship</span>
          <select className="field" value={req.relationship} onChange={(e) => set({ relationship: e.target.value as Relationship })}>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <div>
        <span className="label">Tone</span>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => <Chip key={t.id} active={req.tone === t.id} onClick={() => set({ tone: t.id })}>{t.label}</Chip>)}
        </div>
        {toneUsed !== req.tone && (
          <p className="mt-2 text-xs text-ink-mute">For this occasion we’ll use a gentler, {toneUsed} voice instead.</p>
        )}
      </div>

      <div>
        <span className="label">Length</span>
        <Segmented<MessageLength> label="Message length" value={req.length} onChange={(length) => set({ length })} options={[{ id: 'short', label: 'Short' }, { id: 'medium', label: 'Medium' }, { id: 'long', label: 'Long' }]} />
      </div>

      <label className="block">
        <span className="label">A shared memory or detail (optional)</span>
        <input className="field" value={req.details} maxLength={90} onChange={(e) => set({ details: e.target.value })} placeholder="e.g. our road trip along the coast" />
      </label>

      <Button variant="primary" busy={busy} onClick={generate} icon={results.length ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} className="w-full">
        {results.length ? 'Write new suggestions' : 'Write my message'}
      </Button>
      {error && <p role="alert" className="rounded-xl bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood">{error}</p>}
      {note && <p role="status" className="rounded-xl bg-gold-100 px-3.5 py-2.5 text-sm text-gold-800">{note}</p>}

      {results.length > 0 && (
        <ul className="space-y-3" aria-label="Message suggestions">
          {results.map((m, i) => (
            <li key={i + m.slice(0, 24)} className="animate-rise rounded-2xl border border-ivory-300 bg-white/80 p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="whitespace-pre-line font-display text-[17px] leading-relaxed text-ink">{m}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onUse && <Button size="sm" variant="dark" onClick={() => onUse(m)} icon={<PenLine className="h-3.5 w-3.5" />}>Use inside card</Button>}
                <Button size="sm" onClick={async () => { const ok = await copyText(m); toast(ok ? 'Message copied' : 'Copying is blocked by the browser', ok ? 'ok' : 'error'); }} icon={<ClipboardCopy className="h-3.5 w-3.5" />}>Copy</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] leading-relaxed text-ink-mute">{ai ? 'Your brief is sent to the AI endpoint set in Settings. If it can’t be reached, the built-in writer is used instead.' : 'Suggestions are written on your device by the built-in writer — nothing you type is sent anywhere.'}</p>
    </div>
  );
}
