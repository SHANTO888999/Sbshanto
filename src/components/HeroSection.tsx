import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { trackCvDownload } from '../firebase';
import { downloadPortfolioCv } from '../utils/cvPdfGenerator';
import { ResizeDimensionBadge, useDesignCanvas } from './DesignCursorSystem';
import { cursorAudio } from '../utils/cursorAudio';

interface HeroSectionProps {
  onOpenInquiry: () => void;
  onExploreProjects?: () => void;
}

const KPI_SCATTER = [
  { x: 0, y: -12 },
  { x: 0, y: -8 },
  { x: 0, y: -14 },
  { x: 0, y: -10 },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenInquiry,
  onExploreProjects,
}) => {
  const portfolioContent = usePortfolioContent();
  const { profile, heroMetrics, viewerControls } = portfolioContent;
  const FULL_GREETING = profile.greeting;
  const FULL_NAME = profile.displayName;
  const FULL_ROLE = profile.role;
  const FULL_BIO = profile.bio;
  const FULL_BACKDROP_NAME = profile.backdropName;
  const TOTAL_KPI_CHARS = useMemo(
    () => heroMetrics.reduce((acc, item) => acc + item.value.length + item.label.length, 0),
    [heroMetrics]
  );

  const { cursorsEnabled, heroStep, prepareSectionJump, speedMultiplier } = useDesignCanvas();

  const [typedChars, setTypedChars] = useState(0);
  const [backdropChars, setBackdropChars] = useState(FULL_BACKDROP_NAME.length);
  const [kpiTypedChars, setKpiTypedChars] = useState(TOTAL_KPI_CHARS);
  const [kpiPhase, setKpiPhase] = useState<'pasted' | 'selected' | 'editing' | 'done'>('done');
  const [kpiEditChars, setKpiEditChars] = useState(0);
  const [kpiDragOrigins, setKpiDragOrigins] = useState<Record<number, { x: number; y: number }>>({});
  const [kpiDragStep, setKpiDragStep] = useState<'idle' | 'at-source' | 'pulling'>('idle');
  const [portraitSrc, setPortraitSrc] = useState(profile.portraitUrl);
  const titleBoxRef = useRef<HTMLDivElement | null>(null);
  const shantoBackdropRef = useRef<HTMLDivElement | null>(null);
  const kpiSlotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    setPortraitSrc(profile.portraitUrl);
  }, [profile.portraitUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalLength =
    FULL_GREETING.length + FULL_NAME.length + FULL_ROLE.length + FULL_BIO.length;

  useEffect(() => {
    if (!cursorsEnabled) return;
    if (heroStep === 1) {
      cursorAudio.playLayoutOpen();
    } else if (heroStep === 3) {
      cursorAudio.playResizeSweep();
    } else if (heroStep === 4) {
      cursorAudio.playColorChime();
    } else if (heroStep === 5) {
      cursorAudio.playDropSnap();
    }
  }, [heroStep, cursorsEnabled]);

  const firstKpiLen = heroMetrics[0]
    ? heroMetrics[0].value.length + heroMetrics[0].label.length
    : 0;

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 3) {
      setTypedChars(totalLength);
      setBackdropChars(FULL_BACKDROP_NAME.length);
      setKpiTypedChars(firstKpiLen);
      return;
    }
    if (heroStep < 2) {
      setTypedChars(0);
      setBackdropChars(0);
      setKpiTypedChars(0);
      return;
    }

    setTypedChars(0);
    setBackdropChars(0);
    setKpiTypedChars(0);
    let stepTick = 0;
    let intervalId: number | null = null;

    const typeIntervalMs = Math.max(14, Math.round(28 * speedMultiplier));
    const leadDelayMs = Math.round(140 * speedMultiplier);

    const leadTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        stepTick += 1;
        setTypedChars((prev) => {
          if (prev >= totalLength) return totalLength;
          const next = Math.min(totalLength, prev + 4);
          cursorAudio.playTypeTick(next);
          return next;
        });
        if (stepTick % 4 === 0) {
          setBackdropChars((prev) => Math.min(FULL_BACKDROP_NAME.length, prev + 1));
        }
        setKpiTypedChars((prev) => Math.min(firstKpiLen, prev + 1));
      }, typeIntervalMs);
    }, leadDelayMs);

    return () => {
      window.clearTimeout(leadTimer);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [heroStep, cursorsEnabled, totalLength, FULL_BACKDROP_NAME.length, firstKpiLen, speedMultiplier]);

  const CLONED_KPI_TOTAL_CHARS = useMemo(
    () =>
      heroMetrics
        .slice(1)
        .reduce((acc, item) => acc + item.value.length + item.label.length, 0),
    [heroMetrics]
  );

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 6) {
      setKpiPhase('done');
      setKpiDragStep('idle');
      setKpiDragOrigins({});
      setKpiEditChars(CLONED_KPI_TOTAL_CHARS);
      return;
    }
    if (heroStep < 4) {
      setKpiPhase('pasted');
      setKpiDragStep('idle');
      setKpiDragOrigins({});
      setKpiEditChars(0);
      return;
    }
    if (heroStep === 4) {
      // Wait 340ms for cursors to gather on Card #0 (40+), spawn duplicates ON TOP of Card #0, then drag to Slots 1..3!
      setKpiPhase('editing');
      setKpiDragStep('idle');
      setKpiEditChars(0);
      let tPull: number | null = null;
      const tPaste = window.setTimeout(() => {
        const srcRect = kpiSlotRefs.current[0]?.getBoundingClientRect();
        const origins: Record<number, { x: number; y: number }> = {};
        if (srcRect) {
          heroMetrics.slice(1).forEach((_, offsetIdx) => {
            const kpiIdx = offsetIdx + 1;
            const dstRect = kpiSlotRefs.current[kpiIdx]?.getBoundingClientRect();
            if (dstRect) {
              origins[kpiIdx] = {
                x: srcRect.left - dstRect.left,
                y: srcRect.top - dstRect.top,
              };
            }
          });
        }
        setKpiDragOrigins(origins);
        setKpiDragStep('at-source');
        setKpiPhase('pasted');
        cursorAudio.playLayoutOpen();

        tPull = window.setTimeout(() => {
          setKpiDragStep('pulling');
        }, Math.round(120 * speedMultiplier));
      }, Math.round(340 * speedMultiplier));
      return () => {
        window.clearTimeout(tPaste);
        if (tPull !== null) window.clearTimeout(tPull);
      };
    }

    // heroStep === 5: Select-All blue highlight on pasted duplicates, then retype each into real value!
    setKpiDragStep('idle');
    setKpiDragOrigins({});
    setKpiPhase('selected');
    setKpiEditChars(0);

    let editInterval: number | null = null;
    const editIntervalMs = Math.max(14, Math.round(28 * speedMultiplier));
    const tEdit = window.setTimeout(() => {
      setKpiPhase('editing');
      const step = Math.max(1, Math.ceil(CLONED_KPI_TOTAL_CHARS / 46));
      editInterval = window.setInterval(() => {
        setKpiEditChars((prev) => {
          if (prev >= CLONED_KPI_TOTAL_CHARS) {
            if (editInterval !== null) window.clearInterval(editInterval);
            return CLONED_KPI_TOTAL_CHARS;
          }
          const next = Math.min(CLONED_KPI_TOTAL_CHARS, prev + step);
          cursorAudio.playTypeTick(next);
          return next;
        });
      }, editIntervalMs);
    }, Math.round(440 * speedMultiplier));

    return () => {
      window.clearTimeout(tEdit);
      if (editInterval !== null) window.clearInterval(editInterval);
    };
  }, [heroStep, cursorsEnabled, CLONED_KPI_TOTAL_CHARS, speedMultiplier]);

  const gText = FULL_GREETING.slice(0, Math.min(typedChars, FULL_GREETING.length));
  const remAfterG = Math.max(0, typedChars - FULL_GREETING.length);
  const nText = FULL_NAME.slice(0, Math.min(remAfterG, FULL_NAME.length));
  const remAfterN = Math.max(0, remAfterG - FULL_NAME.length);
  const rText = FULL_ROLE.slice(0, Math.min(remAfterN, FULL_ROLE.length));
  const remAfterR = Math.max(0, remAfterN - FULL_ROLE.length);
  const bText = FULL_BIO.slice(0, Math.min(remAfterR, FULL_BIO.length));

  const nameDotIndex = FULL_NAME.endsWith('.') ? FULL_NAME.length - 1 : -1;
  const nameMain = nameDotIndex >= 0 ? FULL_NAME.slice(0, nameDotIndex) : FULL_NAME;
  const nameSuffix = nameDotIndex >= 0 ? '.' : '';

  const isBlack = cursorsEnabled && heroStep === 0;
  const isDragBox = cursorsEnabled && heroStep === 1;
  const isTyping = cursorsEnabled && heroStep === 2;
  const isResizing = cursorsEnabled && heroStep === 3;
  const isColoring = cursorsEnabled && heroStep === 4;
  const isDropping = cursorsEnabled && heroStep === 5;
  const isDone = !cursorsEnabled || heroStep >= 6;

  const typingGreeting = isTyping && typedChars <= FULL_GREETING.length;
  const typingName =
    isTyping &&
    typedChars > FULL_GREETING.length &&
    typedChars <= FULL_GREETING.length + FULL_NAME.length;
  const typingRole =
    isTyping &&
    typedChars > FULL_GREETING.length + FULL_NAME.length &&
    typedChars <= FULL_GREETING.length + FULL_NAME.length + FULL_ROLE.length;
  const typingBio =
    isTyping && typedChars > FULL_GREETING.length + FULL_NAME.length + FULL_ROLE.length;

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-white/10 bg-[#050507] pt-10 pb-14 lg:pt-12 lg:pb-16"
    >
      {/* Step 0: Clean Black Canvas with S. while 18 Cursors Orbit Smoothly */}
      {isBlack && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-[#050507]"
          aria-hidden="true"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 * speedMultiplier }}
            className="font-display text-6xl font-bold tracking-tight text-white"
          >
            S<span className="text-accent">.</span>
          </motion.span>
        </div>
      )}

      {/* Brand Accent Ambient Glow appears during Color / Drop */}
      <motion.div
        animate={{ opacity: isColoring || isDropping || isDone ? 1 : 0 }}
        transition={{ duration: 0.9 * speedMultiplier }}
        className="pointer-events-none absolute top-6 right-[8%] h-[480px] w-[480px] rounded-full bg-accent/20 blur-[140px]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-6">
          {/* LEFT COLUMN */}
          <div
            data-cursor-target="hero-left"
            className="relative z-10 flex min-h-[340px] flex-col justify-center lg:col-span-5"
          >
            {(isDragBox || isTyping || isResizing || isColoring) && (
              <motion.div
                aria-hidden="true"
                initial={{ width: '16%', height: '18%' }}
                animate={{ width: '100%', height: '100%' }}
                transition={{ duration: 0.95 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-none absolute -top-3 -left-3 rounded-xl border transition-colors duration-400 ${
                  isResizing
                    ? 'border-accent-light/85 bg-accent/5'
                    : isColoring
                      ? 'border-[#A855F7]/75 bg-transparent'
                      : 'border-[#38BDF8]/85 bg-[#0A101C]/35'
                }`}
              >
                <span className="absolute -top-1 -left-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -top-1 -right-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-current bg-white" />
              </motion.div>
            )}

            <div className={isBlack || isDragBox ? 'opacity-0' : 'opacity-100'}>
              <p
                className={`transition-all duration-500 ${
                  isTyping
                    ? 'font-mono text-xs text-zinc-400'
                    : 'font-sans text-lg italic text-zinc-300 sm:text-xl'
                }`}
              >
                {isTyping ? gText : FULL_GREETING}
                {typingGreeting && (
                  <span
                    data-hero-caret="true"
                    className="ml-0.5 inline-block h-[0.9em] w-[2px] bg-white align-middle"
                    aria-hidden="true"
                  />
                )}
              </p>

              {/* SHANTO. Title: Crisp orthogonal Figma text box -> Red resize handles -> Crimson accent -> Clean snap */}
              <motion.div
                ref={titleBoxRef}
                data-cursor-target="hero-title-box"
                initial={false}
                animate={{
                  scale: isBlack || isDragBox || isTyping ? 0.78 : 1,
                  x: 0,
                  y: isBlack || isDragBox || isTyping ? -6 : 0,
                  rotate: 0,
                }}
                transition={{
                  duration: (isResizing ? 0.72 : 0.65) * speedMultiplier,
                  delay: (isResizing ? 0.16 : isDropping ? 0.12 : 0) * speedMultiplier,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: 'left center' }}
                className={`relative mt-2 inline-block ${
                  isTyping
                    ? 'border border-[#38BDF8]/80 bg-[#08101E]/35 px-1.5 py-0.5'
                    : ''
                }`}
              >
                {isTyping && (
                  <>
                    <span className="absolute -top-1 -left-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white" />
                    <span className="absolute -top-1 -right-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white" />
                    <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white" />
                    <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white" />
                  </>
                )}
                <h1
                  className={`tracking-tight [text-wrap:balance] transition-colors duration-600 ${
                    isTyping
                      ? 'font-mono text-4xl font-normal text-zinc-400'
                      : isResizing
                        ? 'font-display text-6xl font-bold text-zinc-300 sm:text-7xl lg:text-[5rem] lg:leading-[0.95]'
                        : 'font-display text-6xl font-bold text-white sm:text-7xl lg:text-[5rem] lg:leading-[0.95]'
                  }`}
                >
                  {isTyping ? (
                    <span>
                      {nText}
                      {typingName && (
                        <span
                          data-hero-caret="true"
                          className="ml-0.5 inline-block h-[0.88em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  ) : (
                    <>
                      {nameMain}
                      {nameSuffix && (
                        <span
                          className={`transition-colors duration-600 ${
                            isResizing ? 'text-zinc-400' : 'text-accent'
                          }`}
                        >
                          {nameSuffix}
                        </span>
                      )}
                    </>
                  )}
                </h1>

                {isResizing && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 border border-accent-light"
                  >
                    <span className="absolute -top-1 -left-1 h-2 w-2 border border-accent-light bg-white" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 border border-accent-light bg-white" />
                    <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-accent-light bg-white" />
                    <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-accent-light bg-white" />
                    <ResizeDimensionBadge
                      targetRef={titleBoxRef}
                      active={isResizing}
                      fromScaleX={0.78}
                      toScaleX={1}
                      fromScaleY={0.78}
                      toScaleY={1}
                      durationMs={Math.round(720 * speedMultiplier)}
                      delayMs={Math.round(160 * speedMultiplier)}
                    />
                  </div>
                )}
              </motion.div>

              <p
                className={`mt-4 transition-all duration-600 ${
                  isTyping
                    ? 'font-mono text-xs text-zinc-400'
                    : isResizing
                      ? 'font-display text-xl font-semibold tracking-wide text-zinc-300 sm:text-2xl'
                      : 'font-display text-xl font-semibold tracking-wide text-accent-light sm:text-2xl'
                }`}
              >
                {isTyping ? rText : FULL_ROLE}
                {typingRole && (
                  <span
                    data-hero-caret="true"
                    className="ml-0.5 inline-block h-[0.9em] w-[2px] bg-white align-middle"
                    aria-hidden="true"
                  />
                )}
              </p>

              <p
                className={`mt-5 max-w-lg leading-relaxed transition-all duration-600 ${
                  isTyping ? 'font-mono text-xs text-zinc-500' : 'text-base text-zinc-300'
                }`}
              >
                {isTyping ? bText : FULL_BIO}
                {typingBio && (
                  <span
                    data-hero-caret="true"
                    className="ml-0.5 inline-block h-[0.9em] w-[2px] bg-white align-middle"
                    aria-hidden="true"
                  />
                )}
              </p>

              {/* Action Buttons appear monochrome/small in Step 3 -> full crimson in Step 4/5 (never shrink!) */}
              <motion.div
                initial={false}
                animate={{
                  opacity: isResizing || isColoring || isDropping || isDone ? 1 : 0,
                  scale: isResizing ? 0.84 : 1,
                  x: isResizing ? -12 : isColoring ? -6 : 0,
                  y: isResizing ? 8 : isColoring ? 4 : 0,
                  filter: isResizing ? 'grayscale(1)' : 'grayscale(0)',
                }}
                transition={{ duration: 0.72 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left center' }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <a
                  href="#works"
                  onClick={() => {
                    onExploreProjects?.();
                    prepareSectionJump();
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Explore Projects
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={onOpenInquiry}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-[#111115] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white whitespace-nowrap shrink-0"
                >
                  Start a Project
                </button>

                {viewerControls.showCvDownloadOnViewer && (
                  <button
                    type="button"
                    onClick={() => {
                      downloadPortfolioCv(portfolioContent);
                      void trackCvDownload();
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-accent/45 bg-accent/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:border-accent hover:bg-accent/20 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-4 w-4 text-accent-light" aria-hidden="true" />
                    Download CV
                  </button>
                )}
              </motion.div>
            </div>
          </div>

          {/* RIGHT COLUMN: Stretched Tall & Wide Accent "SHANTO" + Transparent Cutout Over It */}
          <div
            data-cursor-target="hero-right"
            className="relative flex min-h-[440px] items-end justify-center pt-16 sm:pt-20 lg:col-span-7 lg:min-h-[540px] lg:pt-24"
          >
            {(isDragBox || isTyping || isResizing || isColoring) && (
              <motion.div
                aria-hidden="true"
                initial={{ width: '24%', height: '24%' }}
                animate={{ width: '100%', height: '100%' }}
                transition={{ duration: 0.72 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-none absolute top-0 left-0 z-20 overflow-hidden rounded-2xl border transition-colors duration-400 ${
                  isColoring ? 'border-[#A855F7]/65' : 'border-[#38BDF8]/75 bg-[#08101E]/25'
                }`}
              >
                <span className="absolute -top-1 -left-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -top-1 -right-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-current bg-white" />
                {isDragBox && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-full w-full stroke-[#38BDF8]/25"
                    fill="none"
                  >
                    <line x1="0" y1="0" x2="100" y2="100" strokeWidth="0.4" />
                    <line x1="100" y1="0" x2="0" y2="100" strokeWidth="0.4" />
                  </svg>
                )}
              </motion.div>
            )}

            {/* Giant Tall-Stretched "SHANTO": Orthogonal wireframe scale -> Painted crimson -> Dropped center */}
            <motion.div
              ref={shantoBackdropRef}
              data-cursor-target="hero-shanto"
              initial={false}
              animate={{
                opacity: isBlack || isDragBox ? 0 : 1,
                scaleX: isBlack || isDragBox || isTyping ? 0.65 : 1,
                scaleY: isBlack || isDragBox || isTyping ? 0.52 : 1.38,
                x: 0,
                y: isBlack || isDragBox || isTyping ? -6 : 0,
              }}
              transition={{
                duration: (isResizing ? 0.72 : 0.68) * speedMultiplier,
                delay: (isResizing ? 0.16 : isDropping ? 0.12 : 0) * speedMultiplier,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'center top' }}
              className="pointer-events-none absolute top-3 -left-2 -right-2 flex items-start justify-center select-none sm:top-4 sm:-left-4 sm:-right-4 lg:top-2 lg:-left-6 lg:-right-2"
              aria-hidden="true"
            >
              <div className="relative inline-block">
                <span
                  className={`block font-display text-[5.75rem] font-bold leading-[0.84] tracking-[-0.015em] transition-colors duration-700 sm:text-[8.5rem] lg:text-[10.75rem] xl:text-[11.75rem] ${
                    isTyping || isResizing ? 'text-zinc-500' : 'text-accent'
                  }`}
                >
                  {isTyping ? (
                    <>
                      {FULL_BACKDROP_NAME.slice(0, backdropChars)}
                      {backdropChars < FULL_BACKDROP_NAME.length && (
                        <span
                          data-hero-shanto-caret="true"
                          className="ml-1 inline-block h-[0.78em] w-[3px] bg-white align-baseline shadow-[0_0_10px_rgba(255,255,255,0.85)]"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  ) : (
                    FULL_BACKDROP_NAME
                  )}
                </span>

                {isResizing && (
                  <div className="absolute -inset-1.5 border border-accent-light">
                    <span className="absolute -top-1 -left-1 h-2 w-2 border border-accent-light bg-white" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 border border-accent-light bg-white" />
                    <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-accent-light bg-white" />
                    <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-accent-light bg-white" />
                    <ResizeDimensionBadge
                      targetRef={shantoBackdropRef}
                      active={isResizing}
                      fromScaleX={0.38}
                      toScaleX={1}
                      fromScaleY={0.32}
                      toScaleY={1.38}
                      durationMs={Math.round(880 * speedMultiplier)}
                      delayMs={Math.round(260 * speedMultiplier)}
                    />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Transparent Portrait Cutout: Amber Drop places it centered in front of stretched SHANTO */}
            <motion.div
              data-cursor-target="hero-cutout"
              initial={false}
              animate={{
                opacity: isDropping || isDone ? 1 : 0,
                x: isDropping || isDone ? 0 : 88,
                y: isDropping || isDone ? 0 : -40,
                scale: isDropping || isDone ? 1 : 0.78,
              }}
              transition={{ duration: 1.0 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex w-full max-w-[340px] items-end justify-center sm:max-w-[360px]"
            >
              <img
                src={portraitSrc}
                alt={`Portrait cutout of ${profile.backdropName} centered in front of giant crimson ${profile.backdropName} lettering`}
                referrerPolicy="no-referrer"
                onError={() => {
                  if (portraitSrc !== '/assets/shanto-cutout.png') {
                    setPortraitSrc('/assets/shanto-cutout.png');
                  }
                }}
                className="relative z-10 h-[360px] w-auto object-contain object-bottom drop-shadow-[0_18px_38px_rgba(0,0,0,0.9)] sm:h-[420px] lg:h-[465px]"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#050507] via-[#050507]/85 to-transparent"
                aria-hidden="true"
              />
            </motion.div>
          </div>
        </div>

        {/* 4-Column KPI Row: Born small & scattered -> Typed line-by-line -> Enlarged -> Colored -> Dropped into aligned columns */}
        <div className="relative mt-10 border-t border-white/10 pt-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {heroMetrics.map((metric, idx) => {
              const firstMetric = heroMetrics[0] ?? metric;
              const isTemplateCard = idx === 0;
              const hasClonePastedYet =
                !isTemplateCard &&
                ((isColoring && kpiPhase === 'pasted') || isDropping || isDone);

              const isCardVisible = isTemplateCard
                ? isTyping || isResizing || isColoring || isDropping || isDone
                : hasClonePastedYet;

              const isDuplicateHoldingClone =
                !isTemplateCard &&
                ((isColoring && kpiPhase === 'pasted') ||
                  (isDropping && kpiPhase === 'selected'));
              const isDuplicateEditing = !isTemplateCard && isDropping && kpiPhase === 'editing';

              const rawValue = isDuplicateHoldingClone ? firstMetric.value : metric.value;
              const rawLabel = isDuplicateHoldingClone ? firstMetric.label : metric.label;
              const sc = KPI_SCATTER[idx % KPI_SCATTER.length];
              const scatterMult = isNarrow ? 0.52 : 1;

              const kpiTotalLen = metric.value.length + metric.label.length;

              // Only Card #0 is typed from scratch during Step 2
              const localTyped =
                isTemplateCard && isTyping
                  ? Math.max(0, Math.min(kpiTotalLen, kpiTypedChars))
                  : kpiTotalLen;
              const isActiveKpiTyping =
                isTemplateCard && isTyping && kpiTypedChars <= kpiTotalLen;

              // Sub-slice for Step 5 live editing of pasted duplicates 1..3
              const editStartOffset = heroMetrics.slice(1, idx).reduce(
                (acc, m) => acc + m.value.length + m.label.length,
                0
              );
              const localEditTyped = isDuplicateEditing
                ? Math.max(0, Math.min(kpiTotalLen, kpiEditChars - editStartOffset))
                : kpiTotalLen;
              const isActiveKpiEditing =
                isDuplicateEditing &&
                kpiEditChars >= editStartOffset &&
                kpiEditChars < editStartOffset + kpiTotalLen;

              const shownValue =
                isTemplateCard && isTyping
                  ? metric.value.slice(0, Math.min(localTyped, metric.value.length))
                  : isDuplicateEditing
                    ? metric.value.slice(0, Math.min(localEditTyped, metric.value.length))
                    : rawValue;
              const shownLabel =
                isTemplateCard && isTyping
                  ? metric.label.slice(0, Math.max(0, localTyped - metric.value.length))
                  : isDuplicateEditing
                    ? metric.label.slice(0, Math.max(0, localEditTyped - metric.value.length))
                    : rawLabel;

              const cloneSelectedHighlight = isDuplicateHoldingClone && kpiPhase === 'selected';
              const isKpiAtSource =
                !isTemplateCard && isColoring && kpiPhase === 'pasted' && kpiDragStep === 'at-source';
              const isKpiPulling =
                !isTemplateCard && isColoring && kpiPhase === 'pasted' && kpiDragStep === 'pulling';
              const originOffset = kpiDragOrigins[idx] ?? { x: 0, y: 0 };

              return (
                <div
                  key={`${metric.value}-${idx}`}
                  ref={(el) => {
                    kpiSlotRefs.current[idx] = el;
                  }}
                  className={`relative ${!isTemplateCard && isColoring && hasClonePastedYet ? 'z-20' : ''}`}
                >
                  <motion.div
                    data-cursor-target={`hero-kpi-${idx}`}
                    initial={false}
                    animate={{
                      opacity: isCardVisible ? (isKpiAtSource ? 0.96 : 1) : 0,
                      scale: isTemplateCard && isTyping ? 0.88 : isKpiAtSource ? 0.98 : 1,
                      x: isKpiAtSource ? originOffset.x : 0,
                      y: isKpiAtSource
                        ? originOffset.y
                        : isTemplateCard && isTyping
                          ? sc.y * scatterMult
                          : isTemplateCard && (isResizing || isColoring)
                            ? -4
                            : 0,
                      rotate: 0,
                    }}
                    transition={
                      isKpiAtSource
                        ? {
                            x: { duration: 0 },
                            y: { duration: 0 },
                            opacity: { duration: 0.14 },
                            scale: { duration: 0.14 },
                          }
                        : isKpiPulling
                          ? {
                              x: {
                                duration: 0.56 * speedMultiplier,
                                delay: (idx - 1) * 0.08 * speedMultiplier,
                                ease: [0.22, 1, 0.36, 1],
                              },
                              y: {
                                duration: 0.56 * speedMultiplier,
                                delay: (idx - 1) * 0.08 * speedMultiplier,
                                ease: [0.22, 1, 0.36, 1],
                              },
                              opacity: { duration: 0.18 * speedMultiplier },
                              scale: {
                                duration: 0.45 * speedMultiplier,
                                delay: (idx - 1) * 0.08 * speedMultiplier,
                              },
                            }
                          : {
                              duration: (isResizing ? 0.68 : 0.44) * speedMultiplier,
                              delay: isTemplateCard && isResizing ? 0.16 * speedMultiplier : 0,
                              ease: [0.22, 1, 0.36, 1],
                            }
                    }
                    style={{ transformOrigin: 'top left' }}
                    className={`relative space-y-1 rounded-lg p-2 transition-colors ${
                      isTemplateCard && isResizing
                        ? 'border border-accent-light/75 bg-[#0A101C]/35'
                        : isDuplicateHoldingClone
                          ? 'border border-[#38BDF8] bg-[#0A1526]/85 shadow-[0_10px_24px_rgba(56,189,248,0.18)]'
                          : isDuplicateEditing
                            ? 'border border-[#F59E0B]/75 bg-[#0A101C]/45'
                            : 'border border-transparent'
                    }`}
                  >
                    {((isTemplateCard && isResizing) || isDuplicateHoldingClone || isDuplicateEditing) && (
                      <>
                        <span className="absolute -top-1 -left-1 h-1.5 w-1.5 border border-current bg-white" />
                        <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border border-current bg-white" />
                      </>
                    )}

                    {!isTemplateCard && isColoring && hasClonePastedYet && (
                      <span className="pointer-events-none absolute -top-4 left-1.5 rounded-[3px] bg-[#38BDF8] px-1 py-0.5 font-mono text-[8px] font-bold leading-none tracking-wider text-[#050507] shadow-[0_2px_8px_rgba(56,189,248,0.45)]">
                        COPY
                      </span>
                    )}

                  <div className="font-display text-3xl font-bold text-white tabular-nums sm:text-4xl">
                    <span
                      className={
                        isDuplicateHoldingClone
                          ? cloneSelectedHighlight
                            ? 'rounded-sm bg-[#38BDF8]/40 px-1 ring-1 ring-[#38BDF8]'
                            : 'rounded-sm bg-[#38BDF8]/20 px-1 ring-1 ring-[#38BDF8]/50'
                          : undefined
                      }
                    >
                      {shownValue}
                      {((isActiveKpiTyping && localTyped <= metric.value.length) ||
                        (isActiveKpiEditing && localEditTyped <= metric.value.length)) && (
                        <span
                          data-hero-kpi-caret={isActiveKpiTyping ? 'true' : undefined}
                          data-hero-kpi-edit-caret={isActiveKpiEditing ? 'true' : undefined}
                          className="ml-0.5 inline-block h-[0.85em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-zinc-400 sm:text-sm">
                    <span
                      className={
                        isDuplicateHoldingClone
                          ? cloneSelectedHighlight
                            ? 'rounded-sm bg-[#38BDF8]/35 px-1 text-white ring-1 ring-[#38BDF8]'
                            : 'rounded-sm bg-[#38BDF8]/18 px-1 text-zinc-200 ring-1 ring-[#38BDF8]/45'
                          : undefined
                      }
                    >
                      {shownLabel}
                      {((isActiveKpiTyping && localTyped > metric.value.length) ||
                        (isActiveKpiEditing && localEditTyped > metric.value.length)) && (
                        <span
                          data-hero-kpi-caret={isActiveKpiTyping ? 'true' : undefined}
                          data-hero-kpi-edit-caret={isActiveKpiEditing ? 'true' : undefined}
                          className="ml-0.5 inline-block h-[0.85em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </div>
                </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
