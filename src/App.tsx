import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { ProjectItem } from './data/portfolioData';
import { PortfolioContentProvider } from './context/PortfolioContentContext';
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
import { AdminDashboard } from './components/admin/AdminDashboard';

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
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => detectInitialAdminMode());
  const [cameFromAdmin, setCameFromAdmin] = useState<boolean>(() => detectInitialAdminMode());

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(detectInitialAdminMode());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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

    const ogImgUrl = `${window.location.origin}/assets/og-card.png`;
    const ogImg = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (ogImg) ogImg.content = ogImgUrl;
    const twImg = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]');
    if (twImg) twImg.content = ogImgUrl;
  }, []);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  const handleOpenViewerPreview = () => {
    setCameFromAdmin(true);
    setIsAdminRoute(false);
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

  return (
    <PortfolioContentProvider>
      {isAdminRoute ? (
        <AdminDashboard onOpenViewerPreview={handleOpenViewerPreview} />
      ) : (
        <DesignCanvasProvider>
          <div className="min-h-screen bg-[#050507] text-[#F4F4F5]">
            <motion.div
              className="fixed top-0 right-0 left-0 z-50 h-[2px] origin-left bg-[#DC2626]"
              style={{ scaleX }}
              aria-hidden="true"
            />

            {cameFromAdmin && (
              <div className="fixed right-4 bottom-4 z-50">
                <button
                  type="button"
                  onClick={handleReturnToAdmin}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-white/20 bg-[#0D0E12]/95 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-colors hover:border-[#DC2626] hover:bg-[#14151C]"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
                  Back to Admin Panel
                </button>
              </div>
            )}

            <IntroSequence />

            <Navbar onOpenInquiry={() => setInquiryOpen(true)} />

            <main>
              <HeroSection onOpenInquiry={() => setInquiryOpen(true)} />

              <WorksSection onSelectProject={(proj) => setSelectedProject(proj)} />

              <ClientsStrip />

              <AwardsSection />

              <RawToRealSection />

              <StorytellingSection />

              <ExperienceSection />
            </main>

            <ContactSection onOpenInquiry={() => setInquiryOpen(true)} />

            <ProjectModal
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />

            <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
          </div>
        </DesignCanvasProvider>
      )}
    </PortfolioContentProvider>
  );
}
