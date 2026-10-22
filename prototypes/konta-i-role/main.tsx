import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { setupWorker } from 'msw/browser';
import { PrototypeProvider } from './store';
import { ReviewBar } from './ReviewBar';
import { Screens } from './Screens';
import { authHandlers, backend, controller, scenarios } from './runtime';
import './styles.css';
import './comments.js';
import './prototype.js';

declare global { interface Window { __PROTOTYPE_START__: () => boolean } }

function Prototype() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
  return <PrototypeProvider runtime={{ controller, backend, scenarios }}>
    <ReviewBar dark={dark} onToggleTheme={() => setDark(!dark)} />
    <div className="doc">
      <header className="doc-head">
        <p className="dm-product-eyebrow">DevMentor, Epic 01: accounts and roles</p>
        <h1>Clickable prototype</h1>
        <p>Fictional data. Sign-in, GitHub and email are simulated in this browser; nothing is sent anywhere and no real accounts or passwords are used.</p>
      </header>
      <Screens />
    </div>
  </PrototypeProvider>;
}

async function start() {
  // AccountForm posts through apiCall; the in-browser worker answers those requests.
  await setupWorker(...authHandlers).start({ quiet: true, serviceWorker: { url: '/mockServiceWorker.js' }, onUnhandledRequest: 'bypass' });
  flushSync(() => createRoot(document.getElementById('root')!).render(<StrictMode><Prototype /></StrictMode>));
  window.__PROTOTYPE_START__();
}

start().catch(() => {
  const root = document.getElementById('root')!;
  root.setAttribute('role', 'alert');
  root.textContent = 'The prototype could not start. Open it from the Storybook server.';
});
