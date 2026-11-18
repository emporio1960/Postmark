import { useMemo, useState, type FormEvent } from 'react';
import { Bell, BellOff, BellRing, CalendarHeart, CalendarPlus, Cake, Gem, Pencil, Plus, Sparkles, Star, Trash2, UserPlus, Users } from 'lucide-react';
import type { Contact, OccasionReminder, ReminderKind } from '../types';
import { occasionsToICS } from '../lib/ics';
import { saveBlob } from '../render/export';
import { RELATIONSHIPS } from '../data/messages';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { uid } from '../lib/utils';
import { describeDays, milestone, notificationPermission, notificationsSupported, showNotification, todayISO, upcoming } from '../lib/dates';
import { Button, ConfirmDialog, EmptyState, IconButton, Modal, PageHeader, Segmented, Spinner, useToast } from '../components/ui';

const KIND: Record<ReminderKind, { label: string; icon: typeof Cake; occasion: string }> = {
  birthday: { label: 'Birthday', icon: Cake, occasion: 'birthday' },
  anniversary: { label: 'Anniversary', icon: Gem, occasion: 'anniversary' },
  custom: { label: 'Custom', icon: Star, occasion: 'just-because' },
};
const REMIND = [{ v: 0, l: 'On the day' }, { v: 1, l: '1 day before' }, { v: 3, l: '3 days before' }, { v: 7, l: '1 week before' }, { v: 14, l: '2 weeks before' }, { v: 30, l: '1 month before' }];

const blank = (): OccasionReminder => ({ id: uid(), title: '', recipient: '', kind: 'birthday', date: '', yearly: true, remindDays: 7 });

function OccasionForm({ initial, names, onSave, onClose }: { initial: OccasionReminder; names: string[]; onSave: (o: OccasionReminder) => void; onClose: () => void }) {
  const [o, setO] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (p: Partial<OccasionReminder>) => setO((x) => ({ ...x, ...p }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!o.recipient.trim()) err.recipient = 'Please add who this occasion is for.';
    if (!o.date || Number.isNaN(new Date(o.date).getTime())) err.date = 'Please choose a valid date.';
    if (o.kind === 'custom' && !o.title.trim()) err.title = 'Give this occasion a name.';
    if (!o.yearly && o.date && o.date < todayISO()) err.date = 'One-off occasions need a date in the future.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const title = o.kind === 'custom' ? o.title.trim() : `${o.recipient.trim()}’s ${KIND[o.kind].label.toLowerCase()}`;
    onSave({ ...o, title, recipient: o.recipient.trim(), lastNotified: undefined });
  };
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <span className="label">Type of occasion</span>
        <Segmented<ReminderKind> label="Type of occasion" value={o.kind} onChange={(kind) => set({ kind, yearly: kind === 'custom' ? o.yearly : true })}
          options={[{ id: 'birthday', label: 'Birthday' }, { id: 'anniversary', label: 'Anniversary' }, { id: 'custom', label: 'Custom' }]} />
      </div>
      {o.kind === 'custom' && (
        <label className="block">
          <span className="label">Occasion name</span>
          <input className="field" value={o.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Graduation day" aria-invalid={!!errors.title} />
          {errors.title && <span className="mt-1 block text-xs text-rosewood">{errors.title}</span>}
        </label>
      )}
      <label className="block">
        <span className="label">Recipient name</span>
        <input className="field" list="occasion-people" value={o.recipient} maxLength={60} onChange={(e) => set({ recipient: e.target.value })} placeholder="e.g. Grandma Rose" aria-invalid={!!errors.recipient} />
        <datalist id="occasion-people">{names.map((n) => <option key={n} value={n} />)}</datalist>
        {errors.recipient && <span className="mt-1 block text-xs text-rosewood">{errors.recipient}</span>}
      </label>
      <label className="block">
        <span className="label">{o.kind === 'birthday' ? 'Date of birth' : o.kind === 'anniversary' ? 'Date it began' : 'Date'}</span>
        <input type="date" className="field" value={o.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={!!errors.date} />
        {errors.date ? <span className="mt-1 block text-xs text-rosewood">{errors.date}</span>
          : o.kind !== 'custom' && <span className="mt-1 block text-xs text-ink-mute">Include the original year to see milestones. Not sure? Any year works.</span>}
      </label>
      {o.kind === 'custom' && (
        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-[#A8843F]" checked={o.yearly} onChange={(e) => set({ yearly: e.target.checked })} /> Repeats every year
        </label>
      )}
      <label className="block">
        <span className="label">Remind me</span>
        <select className="field" value={o.remindDays} onChange={(e) => set({ remindDays: Number(e.target.value) })}>
          {REMIND.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit">Save occasion</Button>
      </div>
    </form>
  );
}

function ContactForm({ initial, onSave, onClose }: { initial: Contact; onSave: (c: Contact) => void; onClose: () => void }) {
  const [c, setC] = useState(initial);
  const [error, setError] = useState('');
  return (
    <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); if (!c.name.trim()) { setError('Please add a name.'); return; } onSave({ ...c, name: c.name.trim(), notes: c.notes.trim() }); }}>
      <label className="block">
        <span className="label">Name</span>
        <input className="field" value={c.name} maxLength={60} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="e.g. Grandma Rose" aria-invalid={!!error} />
        {error && <span className="mt-1 block text-xs text-rosewood">{error}</span>}
      </label>
      <label className="block">
        <span className="label">Relationship</span>
        <select className="field" value={c.relationship} onChange={(e) => setC({ ...c, relationship: e.target.value })}>{RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
      </label>
      <label className="block">
        <span className="label">Notes (optional)</span>
        <textarea className="field" rows={2} maxLength={200} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} placeholder="Favourite flowers, in-jokes, card ideas…" />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit">Save person</Button>
      </div>
    </form>
  );
}

export function Occasions() {
  const { ready, occasions, saveOccasion, deleteOccasion, settings, updateSettings, contacts, saveContact, deleteContact } = useStore();
  const [person, setPerson] = useState<Contact | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Contact | null>(null);
  const exportCalendar = async (list: OccasionReminder[], filename: string) => {
    const ics = occasionsToICS(list);
    if (!ics) { toast('There are no upcoming occasions to add to a calendar.', 'error'); return; }
    const outcome = await saveBlob(new Blob([ics], { type: 'text/calendar' }), filename);
    if (outcome === 'saved') toast('Calendar file saved – open it to add the reminder to your calendar');
    else if (outcome === 'unavailable') toast('Calendar files can’t be saved from this embedded preview. Open the app in its own tab.', 'error');
  };
  const toast = useToast();
  const [editing, setEditing] = useState<OccasionReminder | null>(null);
  const [toDelete, setToDelete] = useState<OccasionReminder | null>(null);
  const [permission, setPermission] = useState(notificationPermission());
  const { upcoming: up, past } = useMemo(() => upcoming(occasions), [occasions]);
  const notifyOn = settings.notifications && permission === 'granted';

  const enableNotifications = async () => {
    if (!notificationsSupported()) return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        updateSettings({ notifications: true });
        showNotification('Reminders are on', 'Greeting Card Studio will let you know about upcoming occasions when you open the app.');
        toast('Browser notifications enabled');
      } else toast('Notifications were not allowed. In-app reminders will still appear.', 'error');
    } catch { toast('This browser could not ask for notification permission.', 'error'); }
  };

  if (!ready) return <Spinner />;

  return (
    <div>
      <PageHeader eyebrow="Occasions & reminders" title="Dates worth remembering" intro="Keep birthdays, anniversaries and special days in one place, in the order they’re coming up."
        action={<div className="flex flex-wrap gap-2">
          {occasions.length > 0 && <Button onClick={() => exportCalendar(occasions, 'card-occasions.ics')} icon={<CalendarPlus className="h-4 w-4" />}>Add all to calendar</Button>}
          <Button variant="primary" onClick={() => setEditing(blank())} icon={<Plus className="h-4 w-4" />}>Add occasion</Button>
        </div>} />

      <section className="surface mb-8 flex flex-wrap items-start gap-4 p-5 sm:p-6" aria-label="Reminder notifications">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">{notifyOn ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="font-sans text-[15px] font-semibold">How reminders work</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Reminders always appear inside the app when an occasion is due. With your permission, the browser can also show a notification —
            but only <strong>while Greeting Card Studio is open</strong>. Browsers can’t deliver reminders from this app when it is closed, because that needs a server, and your dates never leave this device. For reminders that always arrive, use <strong>Add to calendar</strong> and let your phone’s calendar remind you.
          </p>
          <p className="mt-2 text-xs text-ink-mute">
            {permission === 'unsupported' ? 'This browser does not support notifications, so reminders will show in the app only.'
              : permission === 'denied' ? 'Notifications are blocked for this site. You can allow them in your browser’s site settings.'
                : notifyOn ? 'Browser notifications are on.' : 'Browser notifications are off.'}
          </p>
        </div>
        {permission !== 'unsupported' && permission !== 'denied' && (
          notifyOn
            ? <Button size="sm" onClick={() => { updateSettings({ notifications: false }); toast('Browser notifications turned off'); }} icon={<BellOff className="h-3.5 w-3.5" />}>Turn off</Button>
            : <Button size="sm" variant="dark" onClick={enableNotifications} icon={<Bell className="h-3.5 w-3.5" />}>Enable notifications</Button>
        )}
      </section>

      {occasions.length === 0 ? (
        <EmptyState icon={<CalendarHeart className="h-6 w-6" />} title="No occasions yet" message="Add a birthday, anniversary or any date you’d like to remember, and it will appear here in date order."
          action={<Button variant="primary" onClick={() => setEditing(blank())}>Add your first occasion</Button>} />
      ) : (
        <>
          <h2 className="mb-4 text-3xl font-semibold">Upcoming</h2>
          {up.length === 0 && <p className="mb-6 text-sm text-ink-soft">Nothing coming up. Add a new occasion to see it here.</p>}
          <ol className="space-y-3">
            {up.map(({ reminder: r, date, days }) => {
              const Icon = KIND[r.kind].icon;
              const ms = milestone(r, date);
              const soon = days <= r.remindDays;
              return (
                <li key={r.id} className="surface flex flex-wrap items-center gap-4 p-4 sm:px-5">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-ivory-50 to-ivory-200 text-center ring-1 ring-ivory-300">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-700">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="font-serif text-2xl leading-none">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1 basis-40">
                    <h3 className="flex items-center gap-2 truncate font-display text-xl font-semibold"><Icon className="h-4 w-4 shrink-0 text-gold-700" />{r.title}</h3>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{ms ? ` · ${ms}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-mute">For {r.recipient} · reminder {REMIND.find((x) => x.v === r.remindDays)?.l.toLowerCase() ?? `${r.remindDays} days before`}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${soon ? 'bg-gold-600 text-white' : 'bg-ivory-200 text-ink-soft'}`}>{describeDays(days)}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={() => navigate('create', { occasion: KIND[r.kind].occasion, recipient: r.recipient })} icon={<Sparkles className="h-3.5 w-3.5" />}>Create card</Button>
                    <IconButton label={`Add ${r.title} to my calendar`} onClick={() => exportCalendar([r], 'occasion.ics')}><CalendarPlus className="h-4 w-4" /></IconButton>
                    <IconButton label={`Edit ${r.title}`} onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label={`Delete ${r.title}`} onClick={() => setToDelete(r)} className="hover:!bg-rosewood/10 hover:!text-rosewood"><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </li>
              );
            })}
          </ol>
          {past.length > 0 && (
            <>
              <h2 className="mb-3 mt-10 text-2xl font-semibold text-ink-soft">Past one-off occasions</h2>
              <ul className="space-y-2">
                {past.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ivory-300/70 bg-ivory-50/60 px-4 py-3 text-sm text-ink-soft">
                    <span className="truncate">{r.title} · {new Date(r.date + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <IconButton label={`Delete ${r.title}`} onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></IconButton>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && occasions.some((x) => x.id === editing.id) ? 'Edit occasion' : 'Add an occasion'}>
        {editing && <OccasionForm key={editing.id} initial={editing} names={contacts.map((c) => c.name)} onClose={() => setEditing(null)} onSave={(o) => {
          saveOccasion(o); setEditing(null); toast('Occasion saved');
          // Remember new people so future cards can be addressed to them in one tap.
          if (!contacts.some((c) => c.name.toLowerCase() === o.recipient.toLowerCase())) saveContact({ id: uid(), name: o.recipient, relationship: 'Friend', notes: '' });
        }} />}
      </Modal>
      <section className="mt-12" aria-label="People">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold">People</h2>
            <p className="mt-1 text-sm text-ink-soft">The people you make cards for. Starting a card from here addresses it to them automatically.</p>
          </div>
          <Button onClick={() => setPerson({ id: uid(), name: '', relationship: 'Friend', notes: '' })} icon={<UserPlus className="h-4 w-4" />}>Add person</Button>
        </div>
        {contacts.length === 0 ? (
          <p className="surface flex items-center gap-3 px-5 py-5 text-sm text-ink-soft"><Users className="h-5 w-5 shrink-0 text-gold-700" /> No one here yet. People are added automatically when you save an occasion, or add them yourself.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {[...contacts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
              const n = occasions.filter((o) => o.recipient.toLowerCase() === c.name.toLowerCase()).length;
              return (
                <li key={c.id} className="surface flex items-center gap-3 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-100 font-serif text-lg text-gold-800" aria-hidden>{c.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xl font-semibold">{c.name}</h3>
                    <p className="truncate text-xs text-ink-mute">{c.relationship} · {n} occasion{n === 1 ? '' : 's'}{c.notes ? ` · ${c.notes}` : ''}</p>
                  </div>
                  <Button size="sm" onClick={() => navigate('create', { recipient: c.name })} icon={<Sparkles className="h-3.5 w-3.5" />}>Card</Button>
                  <IconButton label={`Edit ${c.name}`} onClick={() => setPerson(c)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label={`Remove ${c.name}`} onClick={() => setPersonToDelete(c)} className="hover:!bg-rosewood/10 hover:!text-rosewood"><Trash2 className="h-4 w-4" /></IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal open={!!person} onClose={() => setPerson(null)} title={person && contacts.some((c) => c.id === person.id) ? 'Edit person' : 'Add a person'}>
        {person && <ContactForm key={person.id} initial={person} onClose={() => setPerson(null)} onSave={(c) => { saveContact(c); setPerson(null); toast('Person saved'); }} />}
      </Modal>
      <ConfirmDialog open={!!personToDelete} title="Remove this person?" confirmLabel="Remove" onClose={() => setPersonToDelete(null)}
        message={`“${personToDelete?.name ?? ''}” will be removed from your people. Their occasions and cards are kept.`} onConfirm={() => { if (personToDelete) { deleteContact(personToDelete.id); toast('Person removed'); } }} />
      <ConfirmDialog open={!!toDelete} title="Delete this occasion?" confirmLabel="Delete" onClose={() => setToDelete(null)}
        message={`“${toDelete?.title ?? ''}” and its reminder will be removed.`} onConfirm={() => { if (toDelete) { deleteOccasion(toDelete.id); toast('Occasion deleted'); } }} />
    </div>
  );
}
