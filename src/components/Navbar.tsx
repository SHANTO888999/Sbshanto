import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { useDesignCanvas } from './DesignCursorSystem';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onOpenInquiry: () => void;
  onNavigateSection?: (href: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const NAV_ITEMS = [
  { label: 'Works', href: '#works' },
  { label: 'Milestones', href: '#milestones' },
  { label: 'Process', href: '#process' },
  { label: 'Stack', href: '#stack' },
  { label: 'Contact', href: '#contact' },
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenInquiry,
  onNavigateSection,
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
}) => {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = controlledMobileOpen ?? internalMobileOpen;
  const setMobileOpen = (next: boolean) => {
    setInternalMobileOpen(next);
    onMobileOpenChange?.(next);
  };
  const { profile } = usePortfolioContent();
  const { cursorsEnabled, heroStep, prepareSectionJump } = useDesignCanvas();
  const wordmarkBase = profile.wordmark.endsWith('.')
    ? profile.wordmark.slice(0, -1)
    : profile.wordmark;
  const wordmarkDot = profile.wordmark.endsWith('.') ? '.' : '';

  const isBlack = cursorsEnabled && heroStep === 0;
  const isDrawingNav = cursorsEnabled && heroStep === 1;

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-500 ${
        isBlack
          ? 'border-transparent bg-[#050507]'
          : isDrawingNav
            ? 'border-[#38BDF8]/50 bg-[#050507]/95'
            : 'border-white/10 bg-[#050507]/90'
      }`}
    >
      <div data-cursor-target="navbar" className="relative mx-auto max-w-[1280px] px-6 py-4">

        <motion.div
          initial={false}
          animate={{
            opacity: isBlack ? 0 : 1,
            clipPath: isBlack
              ? 'inset(0 100% 0 0)'
              : isDrawingNav
                ? 'inset(0 0% 0 0)'
                : 'inset(0 0% 0 0)',
          }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between gap-8"
        >
          {/* Zone 1: Wordmark */}
          <a
            href="#top"
            onClick={() => {
              onNavigateSection?.('#top');
              prepareSectionJump();
            }}
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {wordmarkBase}
            {wordmarkDot && <span className="text-accent">{wordmarkDot}</span>}
          </a>

          {/* Zone 2: Navigation links */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => {
                  onNavigateSection?.(item.href);
                  prepareSectionJump();
                }}
                className="text-sm font-medium text-zinc-300 transition-colors duration-150 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact className="hidden sm:inline-flex" />

            <button
              type="button"
              onClick={onOpenInquiry}
              className="hidden sm:inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-accent-dark whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Hire Me
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-200 transition-colors hover:bg-white/5 md:hidden"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0D0D10] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => {
                  onNavigateSection?.(item.href);
                  setMobileOpen(false);
                  prepareSectionJump();
                }}
                className="py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenInquiry();
              }}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Hire Me
            </button>
            <PWAInstallButton label="Install Portfolio App" className="w-full py-2.5 text-sm" />
          </nav>
        </div>
      )}
    </header>
  );
};
