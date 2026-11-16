import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, MousePointer2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { ResizeDimensionBadge, useDesignCanvas } from './DesignCursorSystem';
import { cursorAudio } from '../utils/cursorAudio';

interface HeroSectionProps {
  onOpenInquiry: () => void;
}

const KPI_SCATTER = [
  { x: -16, y: 18, rotate: -2.2 },
  { x: 24, y: -16, rotate: 2.4 },
  { x: -18, y: -14, rotate: -1.8 },
  { x: 22, y: 16, rotate: 2.0 },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenInquiry }) => {
  const { profile, heroMetrics } = usePortfolioContent();
  const FULL_GREETING = profile.greeting;
  const FULL_NAME = profile.displayName;
  const FULL_ROLE = profile.role;
  const FULL_BIO = profile.bio;
  const FULL_BACKDROP_NAME = profile.backdropName;
  const TOTAL_KPI_CHARS = useMemo(
    () => heroMetrics.reduce((acc, item) => acc + item.value.length + item.label.length, 0),
    [heroMetrics]
  );

  const {
    cursorsEnabled,
    toggleCursors,
    soundEnabled,
    toggleSound,
    isAutoScrolling,
    toggleAutoScroll,
    triggerReplay,
    heroStep,
  } = useDesignCanvas();

  const [typedChars, setTypedChars] = useState(0);
  const [backdropChars, setBackdropChars] = useState(FULL_BACKDROP_NAME.length);
  const [kpiTypedChars, setKpiTypedChars] = useState(TOTAL_KPI_CHARS);
  const [kpiPhase, setKpiPhase] = useState<'cloned' | 'edited'>('edited');
  const [portraitSrc, setPortraitSrc] = useState(profile.portraitUrl);
  const titleBoxRef = useRef<HTMLDivElement | null>(null);
  const shantoBackdropRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 3) {
      setTypedChars(totalLength);
      setBackdropChars(FULL_BACKDROP_NAME.length);
      setKpiTypedChars(TOTAL_KPI_CHARS);
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

    const leadTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        stepTick += 1;
        setTypedChars((prev) => {
          if (prev >= totalLength) return totalLength;
          const next = Math.min(totalLength, prev + 3);
          cursorAudio.playTypeTick(next);
          return next;
        });
        if (stepTick % 5 === 0) {
          setBackdropChars((prev) => Math.min(FULL_BACKDROP_NAME.length, prev + 1));
        }
        setKpiTypedChars((prev) => Math.min(TOTAL_KPI_CHARS, prev + 2));
      }, 32);
    }, 200);

    return () => {
      window.clearTimeout(leadTimer);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [heroStep, cursorsEnabled, totalLength, FULL_BACKDROP_NAME.length, TOTAL_KPI_CHARS]);

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 6) {
      setKpiPhase('edited');
      return;
    }
    if (heroStep < 5) {
      setKpiPhase('cloned');
      return;
    }

    setKpiPhase('cloned');
    const tEdit = window.setTimeout(() => {
      setKpiPhase('edited');
    }, 760);

    return () => window.clearTimeout(tEdit);
  }, [heroStep, cursorsEnabled]);

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
      {/* Step 0: Black Canvas with S. while 18 Cursors Orbit in Ring */}
      {isBlack && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-[#050507]"
          aria-hidden="true"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="font-display text-6xl font-bold tracking-tight text-white"
          >
            S<span className="text-[#DC2626]">.</span>
          </motion.span>
        </div>
      )}

      {/* Crimson Ambient Glow appears during Color / Drop */}
      <motion.div
        animate={{ opacity: isColoring || isDropping || isDone ? 1 : 0 }}
        transition={{ duration: 0.9 }}
        className="pointer-events-none absolute top-6 right-[8%] h-[480px] w-[480px] rounded-full bg-[#DC2626]/20 blur-[140px]"
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
                transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-none absolute -top-3 -left-3 rounded-xl border transition-colors duration-400 ${
                  isResizing
                    ? 'border-[#EF4444]/85 bg-[#DC2626]/5'
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

              {/* SHANTO. Title: Born small & offset -> Enlarged by Crimson -> Colored by Violet -> Dropped straight */}
              <motion.div
                ref={titleBoxRef}
                data-cursor-target="hero-title-box"
                initial={false}
                animate={{
                  scale: isBlack || isDragBox || isTyping ? 0.54 : 1,
                  x: isBlack || isDragBox || isTyping ? -10 : isResizing || isColoring ? -6 : 0,
                  y: isBlack || isDragBox || isTyping ? 10 : isResizing || isColoring ? 6 : 0,
                  rotate: isBlack || isDragBox || isTyping ? -1.8 : isResizing || isColoring ? -1 : 0,
                }}
                transition={{
                  duration: isResizing ? 0.88 : 0.9,
                  delay: isResizing ? 0.26 : isDropping ? 0.2 : 0,
                  ease: [0.35, 0, 0.25, 1],
                }}
                style={{ transformOrigin: 'left center' }}
                className="relative mt-2 inline-block"
              >
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
                            isResizing ? 'text-zinc-400' : 'text-[#DC2626]'
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
                    className="pointer-events-none absolute -inset-1 border border-[#EF4444]"
                  >
                    <span className="absolute -top-1 -left-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <ResizeDimensionBadge
                      targetRef={titleBoxRef}
                      active={isResizing}
                      fromScaleX={0.54}
                      toScaleX={1}
                      fromScaleY={0.54}
                      toScaleY={1}
                      durationMs={880}
                      delayMs={260}
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
                      : 'font-display text-xl font-semibold tracking-wide text-[#EF4444] sm:text-2xl'
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
                transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left center' }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <a
                  href="#works"
                  className="inline-flex items-center gap-2 rounded-md bg-[#DC2626] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#B91C1C] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
              </motion.div>

              {/* Cursor & Auto-Scroll Controls */}
              <motion.div
                initial={false}
                animate={{ opacity: isDone ? 1 : 0 }}
                transition={{ duration: 0.45 }}
                className="mt-7 flex flex-wrap items-center gap-2.5 text-xs"
                data-autoscroll-control
              >
                <button
                  type="button"
                  onClick={toggleCursors}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium transition-colors ${
                    cursorsEnabled
                      ? 'border-[#38BDF8]/60 bg-[#38BDF8]/15 text-blue-200 hover:bg-[#38BDF8]/25'
                      : 'border-white/10 bg-[#111115] text-zinc-400 hover:text-white'
                  }`}
                >
                  <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Live Design Cursors: {cursorsEnabled ? 'On' : 'Off'}
                </button>

                {cursorsEnabled && (
                  <>
                    <button
                      type="button"
                      onClick={toggleAutoScroll}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors ${
                        isAutoScrolling
                          ? 'border-[#DC2626]/60 bg-[#DC2626]/15 text-red-200 hover:bg-[#DC2626]/25'
                          : 'border-white/10 bg-[#111115] text-zinc-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {isAutoScrolling ? (
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Auto-Scroll: {isAutoScrolling ? 'On' : 'Off'}
                    </button>

                    <button
                      type="button"
                      onClick={triggerReplay}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#111115] px-3 py-1.5 font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Replay Build
                    </button>

                    <button
                      type="button"
                      onClick={toggleSound}
                      aria-pressed={soundEnabled}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors ${
                        soundEnabled
                          ? 'border-white/15 bg-[#111115] text-zinc-200 hover:border-white/30 hover:text-white'
                          : 'border-white/10 bg-[#111115] text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {soundEnabled ? (
                        <Volume2 className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Sound: {soundEnabled ? 'On' : 'Off'}
                    </button>
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {/* RIGHT COLUMN: Stretched Tall & Wide Crimson "SHANTO" + Transparent Cutout Over It */}
          <div
            data-cursor-target="hero-right"
            className="relative flex min-h-[440px] items-end justify-center pt-16 sm:pt-20 lg:col-span-7 lg:min-h-[540px] lg:pt-24"
          >
            {(isDragBox || isTyping || isResizing || isColoring) && (
              <motion.div
                aria-hidden="true"
                initial={{ width: '18%', height: '20%' }}
                animate={{ width: '100%', height: '100%' }}
                transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-none absolute top-0 left-0 z-20 rounded-2xl border transition-colors duration-400 ${
                  isColoring ? 'border-[#A855F7]/65' : 'border-[#38BDF8]/75'
                }`}
              >
                <span className="absolute -top-1 -left-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -top-1 -right-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-current bg-white" />
                <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-current bg-white" />
              </motion.div>
            )}

            {/* Giant Tall-Stretched "SHANTO": Born small & offset -> Stretched tall & wide -> Painted crimson -> Dropped center */}
            <motion.div
              ref={shantoBackdropRef}
              data-cursor-target="hero-shanto"
              initial={false}
              animate={{
                opacity: isBlack || isDragBox ? 0 : 1,
                scaleX: isBlack || isDragBox || isTyping ? 0.38 : 1,
                scaleY: isBlack || isDragBox || isTyping ? 0.32 : 1.38,
                x: isBlack || isDragBox || isTyping ? -28 : isResizing || isColoring ? -14 : 0,
                y: isBlack || isDragBox || isTyping ? 24 : isResizing || isColoring ? 12 : 0,
              }}
              transition={{
                duration: isResizing ? 0.88 : 0.9,
                delay: isResizing ? 0.26 : isDropping ? 0.2 : 0,
                ease: [0.35, 0, 0.25, 1],
              }}
              style={{ transformOrigin: 'center top' }}
              className="pointer-events-none absolute top-3 -left-2 -right-2 flex items-start justify-center select-none sm:top-4 sm:-left-4 sm:-right-4 lg:top-2 lg:-left-6 lg:-right-2"
              aria-hidden="true"
            >
              <div className="relative inline-block">
                <span
                  className={`block font-display text-[5.75rem] font-bold leading-[0.84] tracking-[-0.015em] transition-colors duration-700 sm:text-[8.5rem] lg:text-[10.75rem] xl:text-[11.75rem] ${
                    isTyping || isResizing ? 'text-zinc-500' : 'text-[#DC2626]'
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
                  <div className="absolute -inset-1.5 border border-[#EF4444]">
                    <span className="absolute -top-1 -left-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-[#EF4444] bg-white" />
                    <ResizeDimensionBadge
                      targetRef={shantoBackdropRef}
                      active={isResizing}
                      fromScaleX={0.38}
                      toScaleX={1}
                      fromScaleY={0.32}
                      toScaleY={1.38}
                      durationMs={880}
                      delayMs={260}
                    />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Transparent Portrait Cutout: Amber Drop places it centered in front of stretched crimson SHANTO */}
            <motion.div
              data-cursor-target="hero-cutout"
              initial={false}
              animate={{
                opacity: isDropping || isDone ? 1 : 0,
                x: isDropping || isDone ? 0 : 88,
                y: isDropping || isDone ? 0 : -40,
                scale: isDropping || isDone ? 1 : 0.78,
              }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
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
              const showingClone = isDropping && kpiPhase === 'cloned' && idx > 0;
              const rawValue = showingClone ? firstMetric.value : metric.value;
              const rawLabel = showingClone ? firstMetric.label : metric.label;
              const sc = KPI_SCATTER[idx % KPI_SCATTER.length];
              const scatterMult = isNarrow ? 0.52 : 1;

              const kpiStartOffset = heroMetrics.slice(0, idx).reduce(
                (acc, m) => acc + m.value.length + m.label.length,
                0
              );
              const kpiTotalLen = metric.value.length + metric.label.length;
              const localTyped = isTyping
                ? Math.max(0, Math.min(kpiTotalLen, kpiTypedChars - kpiStartOffset))
                : kpiTotalLen;
              const isActiveKpiTyping =
                isTyping &&
                kpiTypedChars >= kpiStartOffset &&
                kpiTypedChars < kpiStartOffset + kpiTotalLen;

              const shownValue = isTyping
                ? metric.value.slice(0, Math.min(localTyped, metric.value.length))
                : rawValue;
              const shownLabel = isTyping
                ? metric.label.slice(0, Math.max(0, localTyped - metric.value.length))
                : rawLabel;

              return (
                <motion.div
                  key={`${metric.value}-${idx}`}
                  data-cursor-target={`hero-kpi-${idx}`}
                  initial={false}
                  animate={{
                    opacity: isTyping || isResizing || isColoring || isDropping || isDone ? 1 : 0,
                    scale: isTyping ? 0.64 : 1,
                    x: isTyping ? sc.x * scatterMult : isResizing || isColoring ? sc.x * scatterMult * 0.8 : 0,
                    y: isTyping ? sc.y * scatterMult : isResizing || isColoring ? sc.y * scatterMult * 0.8 : 0,
                    rotate: isTyping ? sc.rotate : isResizing || isColoring ? sc.rotate * 0.6 : 0,
                  }}
                  transition={{
                    duration: isResizing ? 0.84 : 0.8,
                    delay: isResizing ? 0.26 : isDropping ? 0.2 + idx * 0.08 : 0,
                    ease: [0.35, 0, 0.25, 1],
                  }}
                  style={{ transformOrigin: 'top left' }}
                  className={`relative space-y-1 rounded-lg p-2 transition-colors ${
                    isResizing
                      ? 'border border-[#EF4444]/75 bg-[#0A101C]/35'
                      : isDropping
                        ? 'border border-[#F59E0B]/75 bg-[#0A101C]/45'
                        : 'border border-transparent'
                  }`}
                >
                  {(isResizing || isDropping) && (
                    <>
                      <span className="absolute -top-1 -left-1 h-1.5 w-1.5 border border-current bg-white" />
                      <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border border-current bg-white" />
                    </>
                  )}

                  <div className="font-display text-3xl font-bold text-white tabular-nums sm:text-4xl">
                    <span
                      className={
                        showingClone
                          ? 'rounded-sm bg-[#38BDF8]/25 px-1 ring-1 ring-[#38BDF8]/55'
                          : undefined
                      }
                    >
                      {shownValue}
                      {isActiveKpiTyping && localTyped <= metric.value.length && (
                        <span
                          data-hero-kpi-caret="true"
                          className="ml-0.5 inline-block h-[0.85em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-zinc-400 sm:text-sm">
                    <span
                      className={
                        showingClone
                          ? 'rounded-sm bg-[#38BDF8]/20 px-1 text-zinc-200 ring-1 ring-[#38BDF8]/45'
                          : undefined
                      }
                    >
                      {shownLabel}
                      {isActiveKpiTyping && localTyped > metric.value.length && (
                        <span
                          data-hero-kpi-caret="true"
                          className="ml-0.5 inline-block h-[0.85em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
