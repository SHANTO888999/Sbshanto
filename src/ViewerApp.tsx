import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { ProjectCategory, ProjectItem } from './data/contentSchema';
import {
  PortfolioContentProvider,
  usePortfolioContent,
} from './context/PortfolioContentContext';
import {
  startLivePresenceHeartbeat,
  trackHireModalOpen,
  trackProjectCardClick,
  trackVisitorSession,
} from './firebaseViewer';
import { applyDocumentAccentTheme } from './utils/themeAccent';
import { DesignCanvasProvider } from './components/DesignCursorSystem';
import { IntroSequence } from './components/IntroSequence';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { WorksSection } from './components/WorksSection';
import { ClientsStrip } from './components/ClientsStrip';
import { AwardsSection } from './components/AwardsSection';
import { RawToRealSection } from './components/RawToRealSection';
import { StorytellingSection } from './components/StorytellingSection';
import { ExperienceSection } from './components/ExperienceSection';
import { ContactSection } from './components/ContactSection';
import { ProjectModal } from './components/ProjectModal';
import { InquiryModal } from './components/InquiryModal';
import { OfflineIndicator } from './components/PWAInstallButton';

type ViewerBackStep =
  | { kind: 'mobile-nav' }
  | { kind: 'section'; prevScrollY: number }
  | { kind: 'works-category'; prev: ProjectCategory }
  | { kind: 'milestone-expand'; prev: string }
  | { kind: 'raw-scene'; prev: string }
  | { kind: 'project-modal' }
  | { kind: 'project-arch' }
  | { kind: 'inquiry-modal' }
  | { kind: 'inquiry-submitted' };

interface ViewerAppProps {
  previewTopBar?: React.ReactNode;
  trackAnalytics?: boolean;
  refreshSignal?: number;
}

function ViewerShell({
  previewTopBar,
  trackAnalytics = true,
}: ViewerAppProps) {
  const { profile, viewerControls, milestones, wireframeScenes } = usePortfolioContent();
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [projectShowArch, setProjectShowArch] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [worksCategory, setWorksCategory] = useState<ProjectCategory>('All');
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string>(
    () => milestones[0]?.id ?? ''
  );
  const [rawSceneId, setRawSceneId] = useState<string>(
    () => wireframeScenes[0]?.id ?? ''
  );
  const [viewerBackStack, setViewerBackStack] = useState<ViewerBackStep[]>([]);

  const viewerBackStackRef = useRef<ViewerBackStep[]>(viewerBackStack);
  viewerBackStackRef.current = viewerBackStack;

  const viewerSuppressPopRef = useRef(0);

  useEffect(() => {
    if (
      milestones.length > 0 &&
      expandedMilestoneId !== '' &&
      !milestones.some((m) => m.id === expandedMilestoneId)
    ) {
      setExpandedMilestoneId(milestones[0].id);
    }
  }, [milestones, expandedMilestoneId]);

  useEffect(() => {
    if (
      wireframeScenes.length > 0 &&
      !wireframeScenes.some((s) => s.id === rawSceneId)
    ) {
      setRawSceneId(wireframeScenes[0].id);
    }
  }, [wireframeScenes, rawSceneId]);

  const applyViewerBackStep = useCallback((step: ViewerBackStep) => {
    switch (step.kind) {
      case 'inquiry-submitted':
        setInquirySubmitted(false);
        break;
      case 'inquiry-modal':
        setInquirySubmitted(false);
        setInquiryOpen(false);
        break;
      case 'project-arch':
        setProjectShowArch(false);
        break;
      case 'project-modal':
        setProjectShowArch(false);
        setSelectedProject(null);
        break;
      case 'mobile-nav':
        setMobileNavOpen(false);
        break;
      case 'works-category':
        setWorksCategory(step.prev);
        break;
      case 'milestone-expand':
        setExpandedMilestoneId(step.prev);
        break;
      case 'raw-scene':
        setRawSceneId(step.prev);
        break;
      case 'section':
        window.scrollTo({ top: step.prevScrollY, behavior: 'smooth' });
        break;
    }
  }, []);

  const pushViewerStep = useCallback((step: ViewerBackStep) => {
    const nextStack = [...viewerBackStackRef.current, step];
    viewerBackStackRef.current = nextStack;
    setViewerBackStack(nextStack);
    try {
      window.history.pushState({ viewerStep: Date.now() }, '');
    } catch {
      // ignore sandbox history restriction
    }
  }, []);

  const replaceTopViewerStep = useCallback((step: ViewerBackStep) => {
    const nextStack = [...viewerBackStackRef.current.slice(0, -1), step];
    viewerBackStackRef.current = nextStack;
    setViewerBackStack(nextStack);
    try {
      window.history.replaceState({ viewerStep: Date.now() }, '');
    } catch {
      // ignore sandbox history restriction
    }
  }, []);

  const popViewerHistorySilently = useCallback((count: number) => {
    if (count <= 0) return;
    viewerSuppressPopRef.current += count;
    try {
      window.history.go(-count);
    } catch {
      viewerSuppressPopRef.current = Math.max(0, viewerSuppressPopRef.current - count);
    }
  }, []);

  const handleViewerUiBack = useCallback(() => {
    const current = viewerBackStackRef.current;
    if (current.length === 0) {
      if (typeof window !== 'undefined' && window.scrollY > 120) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    const last = current[current.length - 1];
    const remaining = current.slice(0, -1);
    viewerBackStackRef.current = remaining;
    setViewerBackStack(remaining);
    applyViewerBackStep(last);
    popViewerHistorySilently(1);
  }, [applyViewerBackStep, popViewerHistorySilently]);

  useEffect(() => {
    const handlePopState = () => {
      if (viewerSuppressPopRef.current > 0) {
        viewerSuppressPopRef.current -= 1;
        return;
      }

      const current = viewerBackStackRef.current;
      if (current.length > 0) {
        const last = current[current.length - 1];
        const remaining = current.slice(0, -1);
        viewerBackStackRef.current = remaining;
        setViewerBackStack(remaining);
        applyViewerBackStep(last);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyViewerBackStep]);

  useEffect(() => {
    applyDocumentAccentTheme(viewerControls.accentColor);
  }, [viewerControls.accentColor]);

  useEffect(() => {
    if (!trackAnalytics) return;
    void trackVisitorSession();
    return startLivePresenceHeartbeat();
  }, [trackAnalytics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cleanName = profile.displayName.replace(/\.+$/, '') || 'SHANTO';
    const nextTitle = `${cleanName} — ${profile.role}`;
    const nextDesc = profile.bio;

    document.title = nextTitle;
    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = content;
    };
    setMeta('meta[name="description"]', nextDesc);
    setMeta('meta[property="og:title"]', nextTitle);
    setMeta('meta[property="og:description"]', nextDesc);
    setMeta('meta[name="twitter:title"]', nextTitle);
    setMeta('meta[name="twitter:description"]', nextDesc);

    const currentUrl = window.location.origin + window.location.pathname;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;

    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = currentUrl;

    const ogImgUrl = `${window.location.origin}/assets/og-card.jpg?v=2`;
    setMeta('meta[property="og:image"]', ogImgUrl);
    setMeta('meta[property="og:image:secure_url"]', ogImgUrl);
    setMeta('meta[name="twitter:image"]', ogImgUrl);
  }, [profile.displayName, profile.role, profile.bio]);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  const handleMobileNavOpenChange = (nextOpen: boolean) => {
    if (nextOpen === mobileNavOpen) return;
    setMobileNavOpen(nextOpen);
    const current = viewerBackStackRef.current;
    if (nextOpen) {
      if (current[current.length - 1]?.kind !== 'mobile-nav') {
        pushViewerStep({ kind: 'mobile-nav' });
      }
    } else if (current[current.length - 1]?.kind === 'mobile-nav') {
      const remaining = current.slice(0, -1);
      viewerBackStackRef.current = remaining;
      setViewerBackStack(remaining);
      popViewerHistorySilently(1);
    }
  };

  const handleNavigateSection = () => {
    const prevScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const current = viewerBackStackRef.current;
    const step: ViewerBackStep = { kind: 'section', prevScrollY };
    if (mobileNavOpen) {
      setMobileNavOpen(false);
      if (current[current.length - 1]?.kind === 'mobile-nav') {
        replaceTopViewerStep(step);
        return;
      }
    }
    pushViewerStep(step);
  };

  const handleOpenInquiryModal = () => {
    setInquirySubmitted(false);
    setInquiryOpen(true);
    if (trackAnalytics) {
      void trackHireModalOpen();
    }
    const current = viewerBackStackRef.current;
    if (mobileNavOpen) {
      setMobileNavOpen(false);
      if (current[current.length - 1]?.kind === 'mobile-nav') {
        replaceTopViewerStep({ kind: 'inquiry-modal' });
        return;
      }
    }
    pushViewerStep({ kind: 'inquiry-modal' });
  };

  const handleCloseInquiryModal = useCallback(() => {
    setInquiryOpen(false);
    setInquirySubmitted(false);
    const current = viewerBackStackRef.current;
    let removeCount = 0;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i].kind === 'inquiry-submitted' || current[i].kind === 'inquiry-modal') {
        removeCount += 1;
      } else {
        break;
      }
    }
    if (removeCount > 0) {
      const remaining = current.slice(0, current.length - removeCount);
      viewerBackStackRef.current = remaining;
      setViewerBackStack(remaining);
      popViewerHistorySilently(removeCount);
    }
  }, [popViewerHistorySilently]);

  const handleInquirySubmittedChange = (nextSubmitted: boolean) => {
    setInquirySubmitted(nextSubmitted);
    const current = viewerBackStackRef.current;
    if (nextSubmitted) {
      if (current[current.length - 1]?.kind !== 'inquiry-submitted') {
        pushViewerStep({ kind: 'inquiry-submitted' });
      }
    } else if (current[current.length - 1]?.kind === 'inquiry-submitted') {
      const remaining = current.slice(0, -1);
      viewerBackStackRef.current = remaining;
      setViewerBackStack(remaining);
      popViewerHistorySilently(1);
    }
  };

  const handleSelectProject = (proj: ProjectItem) => {
    setProjectShowArch(false);
    setSelectedProject(proj);
    if (trackAnalytics) {
      void trackProjectCardClick(proj);
    }
    pushViewerStep({ kind: 'project-modal' });
  };

  const handleCloseProjectModal = useCallback(() => {
    setSelectedProject(null);
    setProjectShowArch(false);
    const current = viewerBackStackRef.current;
    let removeCount = 0;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i].kind === 'project-arch' || current[i].kind === 'project-modal') {
        removeCount += 1;
      } else {
        break;
      }
    }
    if (removeCount > 0) {
      const remaining = current.slice(0, current.length - removeCount);
      viewerBackStackRef.current = remaining;
      setViewerBackStack(remaining);
      popViewerHistorySilently(removeCount);
    }
  }, [popViewerHistorySilently]);

  const handleProjectShowArchChange = (show: boolean) => {
    setProjectShowArch(show);
    const current = viewerBackStackRef.current;
    if (show) {
      if (current[current.length - 1]?.kind !== 'project-arch') {
        pushViewerStep({ kind: 'project-arch' });
      }
    } else if (current[current.length - 1]?.kind === 'project-arch') {
      const remaining = current.slice(0, -1);
      viewerBackStackRef.current = remaining;
      setViewerBackStack(remaining);
      popViewerHistorySilently(1);
    }
  };

  const handleWorksCategoryChange = (nextCategory: ProjectCategory) => {
    if (nextCategory === worksCategory) return;
    pushViewerStep({ kind: 'works-category', prev: worksCategory });
    setWorksCategory(nextCategory);
  };

  const handleMilestoneExpandedChange = (nextId: string) => {
    if (nextId === expandedMilestoneId) return;
    pushViewerStep({ kind: 'milestone-expand', prev: expandedMilestoneId });
    setExpandedMilestoneId(nextId);
  };

  const handleRawSceneChange = (nextId: string) => {
    if (nextId === rawSceneId) return;
    pushViewerStep({ kind: 'raw-scene', prev: rawSceneId });
    setRawSceneId(nextId);
  };

  return (
    <DesignCanvasProvider>
      <div className="min-h-screen bg-[#050507] text-[#F4F4F5]">
        {viewerControls.showTopScrollBar && (
          <motion.div
            className="fixed top-0 right-0 left-0 z-50 h-[2px] origin-left bg-accent"
            style={{ scaleX }}
            aria-hidden="true"
          />
        )}

        {viewerControls.showMultiBackBar &&
          viewerBackStack.length > 0 &&
          !selectedProject &&
          !inquiryOpen && (
            <div className="fixed top-20 left-4 z-40">
              <button
                type="button"
                onClick={handleViewerUiBack}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/15 bg-[#0D0E12]/95 px-3.5 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-colors hover:border-accent hover:bg-[#14151C]"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
                <span>Back</span>
                {viewerBackStack.length > 1 && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 tabular-nums">
                    {viewerBackStack.length}
                  </span>
                )}
              </button>
            </div>
          )}

        {previewTopBar}

        <IntroSequence />

        <Navbar
          onOpenInquiry={handleOpenInquiryModal}
          onNavigateSection={handleNavigateSection}
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={handleMobileNavOpenChange}
        />

        <main>
          <HeroSection
            onOpenInquiry={handleOpenInquiryModal}
            onExploreProjects={handleNavigateSection}
          />

          <WorksSection
            onSelectProject={handleSelectProject}
            activeCategory={worksCategory}
            onCategoryChange={handleWorksCategoryChange}
          />

          <ClientsStrip />

          <AwardsSection
            expandedId={expandedMilestoneId}
            onExpandedChange={handleMilestoneExpandedChange}
          />

          <RawToRealSection
            selectedSceneId={rawSceneId}
            onSelectedSceneChange={handleRawSceneChange}
          />

          <StorytellingSection />

          <ExperienceSection />
        </main>

        <ContactSection onOpenInquiry={handleOpenInquiryModal} />

        <ProjectModal
          project={selectedProject}
          onClose={handleCloseProjectModal}
          onBack={handleViewerUiBack}
          showArchitecture={projectShowArch}
          onShowArchitectureChange={handleProjectShowArchChange}
        />

        <InquiryModal
          isOpen={inquiryOpen}
          onClose={handleCloseInquiryModal}
          onBack={handleViewerUiBack}
          submitted={inquirySubmitted}
          onSubmittedChange={handleInquirySubmittedChange}
          trackAnalytics={trackAnalytics}
        />

        <OfflineIndicator />
      </div>
    </DesignCanvasProvider>
  );
}

export default function ViewerApp({
  previewTopBar,
  trackAnalytics = true,
  refreshSignal = 0,
}: ViewerAppProps) {
  return (
    <PortfolioContentProvider key={refreshSignal}>
      <ViewerShell previewTopBar={previewTopBar} trackAnalytics={trackAnalytics} />
    </PortfolioContentProvider>
  );
}
