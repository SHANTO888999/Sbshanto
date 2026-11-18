import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ViewerApp from './ViewerApp';

const AdminAppLazy = lazy(() => import('./AdminApp'));

function detectInitialAdminMode(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);

  return (
    host === 'sbadminshanto.web.app' ||
    host === 'sbadminshanto.firebaseapp.com' ||
    host.startsWith('sbadminshanto.') ||
    path === '/admin' ||
    path.startsWith('/admin/') ||
    params.get('admin') === '1'
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => detectInitialAdminMode());
  const [cameFromAdmin, setCameFromAdmin] = useState<boolean>(() => detectInitialAdminMode());
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const onPopState = () => {
      setIsAdminRoute(detectInitialAdminMode());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleOpenViewerPreview = () => {
    setCameFromAdmin(true);
    setIsAdminRoute(false);
    setRefreshSignal((n) => n + 1);
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleReturnToAdmin = () => {
    setIsAdminRoute(true);
    const host = window.location.hostname.toLowerCase();
    if (!host.startsWith('sbadminshanto.') && !window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/admin');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050507] text-xs text-zinc-400">
            Loading admin workspace...
          </div>
        }
      >
        <AdminAppLazy
          onOpenViewerPreview={handleOpenViewerPreview}
          onContentSaved={() => setRefreshSignal((n) => n + 1)}
        />
      </Suspense>
    );
  }

  return (
    <ViewerApp
      refreshSignal={refreshSignal}
      trackAnalytics={!cameFromAdmin}
      previewTopBar={
        cameFromAdmin ? (
          <div className="fixed top-20 right-4 z-50">
            <button
              type="button"
              onClick={handleReturnToAdmin}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-white/20 bg-[#0D0E12]/95 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-colors hover:border-accent hover:bg-[#14151C]"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
              Back to Admin Panel
            </button>
          </div>
        ) : undefined
      }
    />
  );
}
