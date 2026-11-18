// Calendar export (.ics) so the phone's own calendar can remind the user
// even when this app is closed.
import type { OccasionReminder } from '../types';
import { nextOccurrence } from './dates';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** Alarm at 9 am, `days` days before an all-day event. */
function trigger(days: number): string {
  return days <= 0 ? 'PT9H' : `-P${days - 1}DT15H`;
}

export function occasionsToICS(list: OccasionReminder[]): string | null {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events: string[] = [];
  for (const r of list) {
    const start = nextOccurrence(r);
    if (!start) continue;
    const end = new Date(start); end.setDate(end.getDate() + 1);
    events.push([
      'BEGIN:VEVENT',
      `UID:${r.id}@greeting-card-studio`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`,
      `DTEND;VALUE=DATE:${ymd(end)}`,
      `SUMMARY:${esc(r.title)}`,
      `DESCRIPTION:${esc(`Time to make a card for ${r.recipient}.`)}`,
      ...(r.yearly ? ['RRULE:FREQ=YEARLY'] : []),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(r.title)}`, `TRIGGER:${trigger(r.remindDays)}`, 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n'));
  }
  if (!events.length) return null;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Greeting Card Studio//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
