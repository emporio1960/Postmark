import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './data/fonts';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installable PWA: cache the app for offline use (production builds only,
// and never inside an embedded preview frame).
const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && !framed && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}
