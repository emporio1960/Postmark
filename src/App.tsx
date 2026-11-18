import { Component, useEffect, useState, type ReactNode } from 'react';
import { BellRing, X } from 'lucide-react';
import { StoreProvider, useStore } from './lib/store';
import { navigate, useRoute } from './lib/router';
import { describeDays, dueReminders, showNotification, todayISO, type Upcoming } from './lib/dates';
import { loadCardFonts } from './data/fonts';
import { notifyAssetsChanged } from './render/images';
import { Layout } from './components/Layout';
import { Button, IconButton, Spinner, ToastProvider } from './components/ui';
import { Home } from './pages/Home';
import { Templates } from './pages/Templates';
import { Create } from './pages/Create';
import { Favourites, MyCards } from './pages/MyCards';
import { Occasions } from './pages/Occasions';
import { Settings } from './pages/Settings';
import { Editor } from './editor/Editor';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">The app hit an unexpected problem. Your saved cards are safe on this device.</p>
        <Button variant="primary" className="mt-6" onClick={() => { this.setState({ error: null }); navigate('home'); }}>Back to Home</Button>
      </div>
    );
  }
}

/** Surfaces due occasion reminders in-app (and as a notification when allowed). */
function ReminderBanner() {
  const { ready, occasions, settings, saveOccasion } = useStore();
  const [due, setDue] = useState<Upcoming[]>([]);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!ready || checked) return;
    setChecked(true);
    const list = dueReminders(occasions);
    if (!list.length) return;
    setDue(list);
    const today = todayISO();
    for (const u of list) {
      if (settings.notifications) showNotification(u.reminder.title, `${describeDays(u.days)} — time to make a card for ${u.reminder.recipient}.`);
      saveOccasion({ ...u.reminder, lastNotified: today });
    }
  }, [ready, checked, occasions, settings.notifications, saveOccasion]);
  if (!due.length) return null;
  return (
    <div className="mb-6 flex animate-rise items-start gap-3 rounded-2xl border border-gold-300 bg-gold-100/70 px-4 py-3.5" role="status">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Coming up</p>
        <ul className="mt-0.5 text-ink-soft">{due.slice(0, 4).map((u) => <li key={u.reminder.id}>{u.reminder.title} — {describeDays(u.days).toLowerCase()}</li>)}</ul>
        <button type="button" className="mt-1.5 font-medium text-gold-800 underline underline-offset-2" onClick={() => navigate('occasions')}>View occasions</button>
      </div>
      <IconButton label="Dismiss reminder" onClick={() => setDue([])}><X className="h-4 w-4" /></IconButton>
    </div>
  );
}

function Shell() {
  const route = useRoute();
  const { ready, settings } = useStore();

  useEffect(() => { loadCardFonts().then(notifyAssetsChanged); }, []);
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion); }, [settings.reduceMotion]);

  if (route.view === 'edit' && route.id) return <Editor id={route.id} />;

  let page: ReactNode;
  switch (route.view) {
    case 'create': page = <Create params={route.params} />; break;
    case 'templates': page = <Templates params={route.params} />; break;
    case 'cards': page = <MyCards />; break;
    case 'occasions': page = <Occasions />; break;
    case 'favourites': page = <Favourites />; break;
    case 'preferences': page = <Settings />; break;
    default: page = <Home />;
  }
  return (
    <Layout view={route.view}>
      {!ready ? <Spinner label="Opening your studio…" /> : <><ReminderBanner />{page}</>}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <StoreProvider>
          <Shell />
        </StoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
