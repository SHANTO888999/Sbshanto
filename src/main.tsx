import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import AppEntry from '@app-entry';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !refreshed) {
        refreshed = true;
        window.location.reload();
      }
    });
    registerSW({ immediate: true });
  } else {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(<AppEntry />);
