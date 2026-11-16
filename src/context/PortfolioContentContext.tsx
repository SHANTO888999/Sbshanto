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
import { fetchLivePortfolioContent } from '../firebase';

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
    fetchLivePortfolioContent()
      .then((remote) => {
        if (active && remote) {
          setRemoteContent(remote);
        }
      })
      .catch((err) => {
        console.warn('Using default portfolio content:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  const safeContent = useMemo(
    () => normalizePortfolioContent(overrideContent ?? remoteContent, DEFAULT_PORTFOLIO_CONTENT),
    [overrideContent, remoteContent]
  );

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
