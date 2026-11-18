import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  PortfolioContentBundle,
  normalizePortfolioContent,
} from '../data/contentSchema';
import { DEFAULT_PORTFOLIO_CONTENT } from '../data/portfolioData';
import { fetchLivePortfolioContent } from '../firebaseViewer';

const PortfolioContentContext = createContext<PortfolioContentBundle>(DEFAULT_PORTFOLIO_CONTENT);
const PortfolioRefreshContext = createContext<() => Promise<void>>(async () => {});

interface PortfolioContentProviderProps {
  children: React.ReactNode;
  overrideContent?: Partial<PortfolioContentBundle> | null;
}

export const PortfolioContentProvider: React.FC<PortfolioContentProviderProps> = ({
  children,
  overrideContent = null,
}) => {
  const [remoteContent, setRemoteContent] = useState<Partial<PortfolioContentBundle> | null>(null);

  const loadContent = useCallback(async () => {
    try {
      const remote = await fetchLivePortfolioContent();
      setRemoteContent(remote);
    } catch (err) {
      console.warn('Using default portfolio content:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const syncLiveContent = () => {
      fetchLivePortfolioContent()
        .then((remote) => {
          if (active && remote) {
            setRemoteContent(remote);
          }
        })
        .catch((err) => {
          console.warn('Using default portfolio content:', err);
        });
    };

    syncLiveContent();
    window.addEventListener('online', syncLiveContent);

    return () => {
      active = false;
      window.removeEventListener('online', syncLiveContent);
    };
  }, []);

  const safeContent = useMemo(() => {
    const source = overrideContent ?? remoteContent;
    const normalized = normalizePortfolioContent(source, DEFAULT_PORTFOLIO_CONTENT);

    // Keep starter demo projects visible alongside custom cloud projects unless explicitly disabled
    if (
      source &&
      Array.isArray(source.projects) &&
      source.projects.length > 0 &&
      normalized.viewerControls.showStarterDemoProjects !== false
    ) {
      const existingIds = new Set(normalized.projects.map((p) => p.id));
      const remainingStarters = DEFAULT_PORTFOLIO_CONTENT.projects.filter(
        (starter) => !existingIds.has(starter.id)
      );
      if (remainingStarters.length > 0) {
        return {
          ...normalized,
          projects: [...normalized.projects, ...remainingStarters],
        };
      }
    }

    return normalized;
  }, [overrideContent, remoteContent]);

  return (
    <PortfolioContentContext.Provider value={safeContent}>
      <PortfolioRefreshContext.Provider value={loadContent}>
        {children}
      </PortfolioRefreshContext.Provider>
    </PortfolioContentContext.Provider>
  );
};

export function usePortfolioContent(): PortfolioContentBundle {
  return useContext(PortfolioContentContext);
}

export function useRefreshPortfolioContent(): () => Promise<void> {
  return useContext(PortfolioRefreshContext);
}
