import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalMobileOpen(false);
        onMobileOpenChange?.(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onMobileOpenChange]);
  const { profile } = usePortfolioContent();
  const { cursorsEnabled, heroStep, prepareSectionJump, speedMultiplier } = useDesignCanvas();
  const wordmarkBase = profile.wordmark.endsWith('.')
    ? profile.wordmark.slice(0, -1)
    : profile.wordmark;
  const wordmarkDot = profile.wordmark.endsWith('.') ? '.' : '';

  const isBlack = cursorsEnabled && heroStep === 0;
  const isDrawingNav = cursorsEnabled && heroStep === 1;
  const isTypingNav = cursorsEnabled && heroStep === 2;
  const isResizingNav = cursorsEnabled && heroStep === 3;
  const isMonochromeNav = cursorsEnabled && (heroStep === 1 || heroStep === 2 || heroStep === 3);

  const navHireLabel = 'Hire Me';
  const totalNavChars =
    profile.wordmark.length +
    NAV_ITEMS.reduce((acc, item) => acc + item.label.length, 0) +
    navHireLabel.length;

  const [navTypedChars, setNavTypedChars] = useState(totalNavChars);

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 3) {
      setNavTypedChars(totalNavChars);
      return;
    }
    if (heroStep < 2) {
      setNavTypedChars(0);
      return;
    }

    setNavTypedChars(0);
    let intervalId: number | null = null;
    const stepDelay = Math.round(140 * speedMultiplier);
    const intervalMs = Math.max(14, Math.round(28 * speedMultiplier));
    const stepSize = Math.max(1, Math.ceil(totalNavChars / 40));

    const leadTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setNavTypedChars((prev) => {
          if (prev >= totalNavChars) {
            if (intervalId !== null) window.clearInterval(intervalId);
            return prev;
          }
          return Math.min(totalNavChars, prev + stepSize);
        });
      }, intervalMs);
    }, stepDelay);

    return () => {
      window.clearTimeout(leadTimer);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [cursorsEnabled, heroStep, totalNavChars, speedMultiplier]);

  const renderNavSlice = (full: string, startOffset: number, accentLastChar = false) => {
    if (!isTypingNav && !isDrawingNav) {
      if (accentLastChar && wordmarkDot) {
        return (
          <>
            {wordmarkBase}
            <span
              className={`transition-colors duration-400 ${
                isResizingNav ? 'text-zinc-400' : 'text-accent'
              }`}
            >
              {wordmarkDot}
            </span>
          </>
        );
      }
      return full;
    }
    const endOffset = startOffset + full.length;
    const localCount = isDrawingNav
      ? 0
      : Math.max(0, Math.min(full.length, navTypedChars - startOffset));
    const isActiveSlice =
      isTypingNav &&
      navTypedChars >= startOffset &&
      (navTypedChars < endOffset ||
        (endOffset === totalNavChars && navTypedChars >= totalNavChars));

    return (
      <span className="relative inline-grid align-baseline">
        <span className="col-start-1 row-start-1 invisible select-none" aria-hidden="true">
          {full}
        </span>
        <span className="pointer-events-none absolute inset-0 whitespace-nowrap">
          {full.slice(0, localCount)}
          {isActiveSlice && (
            <span
              data-nav-caret="true"
              className="ml-0.5 inline-block h-[0.88em] w-[2px] bg-white align-middle"
              aria-hidden="true"
            />
          )}
        </span>
      </span>
    );
  };

  let runningOffset = 0;
  const wordmarkOffset = runningOffset;
  runningOffset += profile.wordmark.length;
  const navOffsets = NAV_ITEMS.map((item) => {
    const start = runningOffset;
    runningOffset += item.label.length;
    return start;
  });
  const hireOffset = runningOffset;

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
            style={
              isMonochromeNav
                ? { transform: isResizingNav ? 'scale(0.96)' : 'scale(0.9)', transformOrigin: 'left center' }
                : undefined
            }
            className={`font-display text-xl font-bold tracking-tight whitespace-nowrap shrink-0 transition-[color,transform] duration-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
              isDrawingNav
                ? 'rounded border border-dashed border-[#38BDF8]/65 bg-[#08101E]/40 px-1.5 text-transparent'
                : isTypingNav
                  ? 'text-zinc-300'
                  : 'text-white'
            }`}
          >
            {renderNavSlice(profile.wordmark, wordmarkOffset, true)}
          </a>

          {/* Zone 2: Navigation links */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map((item, idx) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => {
                  onNavigateSection?.(item.href);
                  prepareSectionJump();
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  isDrawingNav
                    ? 'rounded border border-dashed border-[#38BDF8]/45 px-1.5 text-transparent'
                    : isTypingNav
                      ? 'text-zinc-300'
                      : 'text-zinc-300 hover:text-white'
                }`}
              >
                {renderNavSlice(item.label, navOffsets[idx])}
              </a>
            ))}
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact className="hidden sm:inline-flex" />

            <button
              type="button"
              data-cursor-target="nav-hire-btn"
              onClick={onOpenInquiry}
              style={
                isMonochromeNav
                  ? { transform: isResizingNav ? 'scale(0.96)' : 'scale(0.92)', transformOrigin: 'center center' }
                  : undefined
              }
              className={`hidden sm:inline-flex items-center justify-center rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-[background-color,border-color,color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isDrawingNav
                  ? 'border border-dashed border-[#38BDF8]/75 bg-[#08101E]/45 text-transparent'
                  : isTypingNav || isResizingNav
                    ? 'border border-white/25 bg-[#121318] text-zinc-200'
                    : 'border border-transparent bg-accent text-white hover:bg-accent-dark'
              }`}
            >
              {renderNavSlice(navHireLabel, hireOffset)}
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
