import type { OccasionReminder } from '../types';

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfToday(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

/** The next date this occasion falls on (today counts), or null if a one-off date has passed. */
export function nextOccurrence(r: OccasionReminder): Date | null {
  const [y, m, d] = r.date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = startOfToday();
  if (!r.yearly) {
    const one = new Date(y, m - 1, d);
    return one >= today ? one : null;
  }
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getMonth() !== m - 1) next = new Date(today.getFullYear(), m - 1, d - 1); // 29 Feb in a non-leap year
  if (next < today) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
    if (next.getMonth() !== m - 1) next = new Date(today.getFullYear() + 1, m - 1, d - 1);
  }
  return next;
}

export function daysUntil(date: Date): number {
  return Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
}

/** e.g. "turning 40" / "12th anniversary" for yearly events with a known start year. */
export function milestone(r: OccasionReminder, next: Date): string | null {
  if (!r.yearly) return null;
  const startYear = Number(r.date.slice(0, 4));
  const n = next.getFullYear() - startYear;
  if (!startYear || n <= 0 || n > 130) return null;
  const ord = (k: number) => {
    const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
    return k + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  if (r.kind === 'birthday') return `Turning ${n}`;
  if (r.kind === 'anniversary') return `${ord(n)} anniversary`;
  return `${ord(n)} year`;
}

export function describeDays(n: number): string {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `In ${n} days`;
  if (n < 60) return `In ${Math.round(n / 7)} week${Math.round(n / 7) === 1 ? '' : 's'}`;
  return `In ${Math.round(n / 30)} months`;
}

export interface Upcoming { reminder: OccasionReminder; date: Date; days: number }

export function upcoming(list: OccasionReminder[]): { upcoming: Upcoming[]; past: OccasionReminder[] } {
  const up: Upcoming[] = []; const past: OccasionReminder[] = [];
  for (const r of list) {
    const d = nextOccurrence(r);
    if (d) up.push({ reminder: r, date: d, days: daysUntil(d) }); else past.push(r);
  }
  up.sort((a, b) => a.date.getTime() - b.date.getTime());
  return { upcoming: up, past };
}

/** Reminders that should be surfaced today and have not been shown yet today. */
export function dueReminders(list: OccasionReminder[]): Upcoming[] {
  const today = todayISO();
  return upcoming(list).upcoming.filter((u) => u.days <= u.reminder.remindDays && u.reminder.lastNotified !== today);
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export function showNotification(title: string, body: string): boolean {
  try {
    if (!notificationsSupported() || Notification.permission !== 'granted') return false;
    new Notification(title, { body, tag: title });
    return true;
  } catch { return false; }
}
