import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import AppEntry from '@app-entry';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
  } else {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(<AppEntry />);
