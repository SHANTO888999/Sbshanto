import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { trackCvDownload } from '../firebaseViewer';
import { downloadPortfolioCv } from '../utils/cvPdfGenerator';
import { ResizeDimensionBadge, useDesignCanvas } from './DesignCursorSystem';
import { cursorAudio } from '../utils/cursorAudio';

interface HeroSectionProps {
  onOpenInquiry: () => void;
  onExploreProjects?: () => void;
}

type KpiPhase = 'waiting' | 'pasted' | 'selected' | 'editing' | 'done';

interface KpiStepState {
  forStep: number;
  phase: KpiPhase;
  dragStep: 'idle' | 'at-source' | 'pulling';
  dragOrigins: Record<number, { x: number; y: number }>;
  editChars: number;
}

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
  const [resizeEngaged, setResizeEngaged] = useState(() => !cursorsEnabled || heroStep !== 3);
  const [colorStage, setColorStage] = useState<number>(() => (!cursorsEnabled || heroStep >= 5 ? 3 : 0));
  const [kpiState, setKpiState] = useState<KpiStepState>({
    forStep: 6,
    phase: 'done',
    dragStep: 'idle',
    dragOrigins: {},
    editChars: 0,
  });
  const [portraitSrc, setPortraitSrc] = useState(
    () => profile.portraitUrl.trim() || '/assets/shanto-cutout.png'
  );
  const titleBoxRef = useRef<HTMLDivElement | null>(null);
  const shantoBackdropRef = useRef<HTMLDivElement | null>(null);
  const kpiSlotRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    setPortraitSrc(profile.portraitUrl.trim() || '/assets/shanto-cutout.png');
  }, [profile.portraitUrl]);

  const BTN_EXPLORE = 'Explore Projects';
  const BTN_START = 'Start a Project';
  const BTN_CV = viewerControls.showCvDownloadOnViewer ? 'Download CV' : '';

  const textLength =
    FULL_GREETING.length + FULL_NAME.length + FULL_ROLE.length + FULL_BIO.length;
  const totalLength =
    textLength + BTN_EXPLORE.length + BTN_START.length + BTN_CV.length;

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
    if (!cursorsEnabled || heroStep >= 4) {
      setResizeEngaged(true);
      return;
    }
    if (heroStep < 3) {
      setResizeEngaged(false);
      return;
    }
    // Step 3: Cursors lock onto corner handles FIRST for 240ms before scaling SHANTO & buttons!
    setResizeEngaged(false);
    const t = window.setTimeout(() => {
      setResizeEngaged(true);
    }, Math.round(240 * speedMultiplier));
    return () => window.clearTimeout(t);
  }, [heroStep, cursorsEnabled, speedMultiplier]);

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 5) {
      setColorStage(3);
      return;
    }
    if (heroStep < 4) {
      setColorStage(0);
      return;
    }
    setColorStage(0);
    const t1 = window.setTimeout(() => setColorStage(1), Math.round(260 * speedMultiplier));
    const t2 = window.setTimeout(() => setColorStage(2), Math.round(520 * speedMultiplier));
    const t3 = window.setTimeout(() => setColorStage(3), Math.round(780 * speedMultiplier));
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [heroStep, cursorsEnabled, speedMultiplier]);

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

    const typeIntervalMs = Math.max(14, Math.round(22 * speedMultiplier));
    const leadDelayMs = Math.round(110 * speedMultiplier);
    const proseCharStep = Math.max(4, Math.ceil(textLength / 44));

    const leadTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        stepTick += 1;
        setTypedChars((prev) => {
          if (prev >= totalLength) return totalLength;
          const step = prev < textLength ? proseCharStep : 1;
          const next = Math.min(totalLength, prev + step);
          cursorAudio.playTypeTick(next);
          return next;
        });
        if (stepTick % 5 === 0) {
          setBackdropChars((prev) => Math.min(FULL_BACKDROP_NAME.length, prev + 1));
        }
        setKpiTypedChars((prev) => Math.min(firstKpiLen, prev + 1));
      }, typeIntervalMs);
    }, leadDelayMs);

    return () => {
      window.clearTimeout(leadTimer);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [heroStep, cursorsEnabled, textLength, totalLength, FULL_BACKDROP_NAME.length, firstKpiLen, speedMultiplier]);

  const CLONED_KPI_TOTAL_CHARS = useMemo(
    () =>
      heroMetrics
        .slice(1)
        .reduce((acc, item) => acc + item.value.length + item.label.length, 0),
    [heroMetrics]
  );

  useEffect(() => {
    if (!cursorsEnabled || heroStep >= 6) {
      setKpiState({
        forStep: 6,
        phase: 'done',
        dragStep: 'idle',
        dragOrigins: {},
        editChars: CLONED_KPI_TOTAL_CHARS,
      });
      return;
    }
    if (heroStep < 4) {
      setKpiState({
        forStep: heroStep,
        phase: 'waiting',
        dragStep: 'idle',
        dragOrigins: {},
        editChars: 0,
      });
      return;
    }
    if (heroStep === 4) {
      // Wait 180ms for cursors to gather on Card #0 (40+), spawn duplicates ON TOP of Card #0, then drag to Slots 1..3!
      setKpiState({
        forStep: 4,
        phase: 'waiting',
        dragStep: 'idle',
        dragOrigins: {},
        editChars: 0,
      });
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
                x: srcRect.left - dstRect.left + offsetIdx * 3,
                y: srcRect.top - dstRect.top + offsetIdx * 3,
              };
            }
          });
        }
        setKpiState({
          forStep: 4,
          phase: 'pasted',
          dragStep: 'at-source',
          dragOrigins: origins,
          editChars: 0,
        });
        cursorAudio.playLayoutOpen();

        tPull = window.setTimeout(() => {
          setKpiState((prev) =>
            prev.forStep === 4 ? { ...prev, dragStep: 'pulling' } : prev
          );
        }, Math.round(260 * speedMultiplier));
      }, Math.round(180 * speedMultiplier));
      return () => {
        window.clearTimeout(tPaste);
        if (tPull !== null) window.clearTimeout(tPull);
      };
    }

    // heroStep === 5: Select-All blue highlight on pasted duplicates, then retype each into real value!
    setKpiState({
      forStep: 5,
      phase: 'selected',
      dragStep: 'idle',
      dragOrigins: {},
      editChars: 0,
    });

    let editInterval: number | null = null;
    const editIntervalMs = Math.max(14, Math.round(28 * speedMultiplier));
    const tEdit = window.setTimeout(() => {
      setKpiState({
        forStep: 5,
        phase: 'editing',
        dragStep: 'idle',
        dragOrigins: {},
        editChars: 0,
      });
      const step = Math.max(1, Math.ceil(CLONED_KPI_TOTAL_CHARS / 46));
      editInterval = window.setInterval(() => {
        setKpiState((prev) => {
          if (prev.forStep !== 5 || prev.phase !== 'editing') return prev;
          if (prev.editChars >= CLONED_KPI_TOTAL_CHARS) {
            if (editInterval !== null) window.clearInterval(editInterval);
            return prev;
          }
          const next = Math.min(CLONED_KPI_TOTAL_CHARS, prev.editChars + step);
          cursorAudio.playTypeTick(next);
          return { ...prev, editChars: next };
        });
      }, editIntervalMs);
    }, Math.round(420 * speedMultiplier));

    return () => {
      window.clearTimeout(tEdit);
      if (editInterval !== null) window.clearInterval(editInterval);
    };
  }, [heroStep, cursorsEnabled, CLONED_KPI_TOTAL_CHARS, speedMultiplier, heroMetrics]);

  // Synchronously derive effective KPI phase so step transitions NEVER flash stale state for 1 frame
  const effectiveKpi = useMemo(() => {
    if (!cursorsEnabled || heroStep >= 6) {
      return {
        phase: 'done' as KpiPhase,
        dragStep: 'idle' as const,
        dragOrigins: {} as Record<number, { x: number; y: number }>,
        editChars: CLONED_KPI_TOTAL_CHARS,
      };
    }
    if (heroStep < 4) {
      return {
        phase: 'waiting' as KpiPhase,
        dragStep: 'idle' as const,
        dragOrigins: {} as Record<number, { x: number; y: number }>,
        editChars: 0,
      };
    }
    if (heroStep === 4) {
      if (kpiState.forStep === 4) return kpiState;
      return {
        phase: 'waiting' as KpiPhase,
        dragStep: 'idle' as const,
        dragOrigins: {} as Record<number, { x: number; y: number }>,
        editChars: 0,
      };
    }
    if (kpiState.forStep === 5) return kpiState;
    return {
      phase: 'selected' as KpiPhase,
      dragStep: 'idle' as const,
      dragOrigins: {} as Record<number, { x: number; y: number }>,
      editChars: 0,
    };
  }, [cursorsEnabled, heroStep, kpiState, CLONED_KPI_TOTAL_CHARS]);

  const kpiPhase = effectiveKpi.phase;
  const kpiDragStep = effectiveKpi.dragStep;
  const kpiDragOrigins = effectiveKpi.dragOrigins;
  const kpiEditChars = effectiveKpi.editChars;

  const gText = FULL_GREETING.slice(0, Math.min(typedChars, FULL_GREETING.length));
  const remAfterG = Math.max(0, typedChars - FULL_GREETING.length);
  const nText = FULL_NAME.slice(0, Math.min(remAfterG, FULL_NAME.length));
  const remAfterN = Math.max(0, remAfterG - FULL_NAME.length);
  const rText = FULL_ROLE.slice(0, Math.min(remAfterN, FULL_ROLE.length));
  const remAfterR = Math.max(0, remAfterN - FULL_ROLE.length);
  const bText = FULL_BIO.slice(0, Math.min(remAfterR, FULL_BIO.length));
  const remAfterB = Math.max(0, remAfterR - FULL_BIO.length);
  const btnExploreText = BTN_EXPLORE.slice(0, Math.min(remAfterB, BTN_EXPLORE.length));
  const remAfterBtn1 = Math.max(0, remAfterB - BTN_EXPLORE.length);
  const btnStartText = BTN_START.slice(0, Math.min(remAfterBtn1, BTN_START.length));
  const remAfterBtn2 = Math.max(0, remAfterBtn1 - BTN_START.length);
  const btnCvText = BTN_CV.slice(0, Math.min(remAfterBtn2, BTN_CV.length));

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
    isTyping &&
    typedChars > FULL_GREETING.length + FULL_NAME.length + FULL_ROLE.length &&
    typedChars <= textLength;
  const btn1Visible = !isTyping || typedChars > textLength;
  const btn2Visible = !isTyping || typedChars > textLength + BTN_EXPLORE.length;
  const btn3Visible =
    !isTyping || typedChars > textLength + BTN_EXPLORE.length + BTN_START.length;
  const typingBtn1 =
    isTyping &&
    typedChars > textLength &&
    typedChars <= textLength + BTN_EXPLORE.length;
  const typingBtn2 =
    isTyping &&
    typedChars > textLength + BTN_EXPLORE.length &&
    typedChars <= textLength + BTN_EXPLORE.length + BTN_START.length;
  const typingBtn3 =
    isTyping &&
    Boolean(BTN_CV) &&
    typedChars > textLength + BTN_EXPLORE.length + BTN_START.length;

  const isMonochromePhase = isTyping || isResizing || (isColoring && colorStage < 1);
  const shantoSmall = isBlack || isDragBox || isTyping || (isResizing && !resizeEngaged);
  const buttonsSmall = isBlack || isDragBox || isTyping || (isResizing && !resizeEngaged);

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-white/10 bg-[#050507] pt-10 pb-14 lg:pt-12 lg:pb-16"
    >
      {/* Step 0: Clean Black Canvas with Stylish SB Monogram while Cursors Orbit */}
      {isBlack && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-[#050507]"
          aria-hidden="true"
        >
          <div
            className="pointer-events-none absolute h-56 w-56 rounded-full bg-accent/20 blur-[90px]"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0.45, scale: 0.94, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col items-center px-8 py-6 select-none"
          >
            <span className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-white/30" />
            <span className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-accent/70" />
            <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-accent/70" />
            <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-white/30" />

            <span className="font-display text-7xl font-bold leading-none tracking-[-0.04em] sm:text-8xl">
              <span className="text-white drop-shadow-[0_2px_18px_rgba(255,255,255,0.22)]">S</span>
              <span className="text-accent drop-shadow-[0_2px_22px_rgba(220,38,38,0.45)]">B</span>
            </span>

            <motion.span
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.45 * speedMultiplier, delay: 0.1 * speedMultiplier }}
              className="mt-3 block h-[3px] w-16 origin-center rounded-full bg-gradient-to-r from-white/80 via-accent to-accent"
            />
          </motion.div>
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
              {/* Locked-footprint wrapper: invisible final copy keeps height 100% constant during typing/resize */}
              <div className="relative">
                <div className="invisible pointer-events-none select-none" aria-hidden="true">
                  <p className="font-sans text-lg italic sm:text-xl">{FULL_GREETING}</p>
                  <div className="mt-2 inline-block">
                    <h1 className="font-display text-6xl font-bold tracking-tight [text-wrap:balance] sm:text-7xl lg:text-[5rem] lg:leading-[0.95]">
                      {FULL_NAME}
                    </h1>
                  </div>
                  <p className="mt-4 font-display text-xl font-semibold tracking-wide sm:text-2xl">
                    {FULL_ROLE}
                  </p>
                  <p className="mt-5 max-w-lg text-base leading-relaxed">{FULL_BIO}</p>
                </div>

                <div className="absolute inset-x-0 top-0">
                  <p
                    className={`font-sans text-lg italic transition-colors duration-400 sm:text-xl ${
                      isMonochromePhase ? 'text-zinc-400' : 'text-zinc-300'
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

                  {/* SHANTO. Title: Crisp orthogonal Figma text box -> Red resize handles held by cursor -> Crimson accent */}
                  <motion.div
                    ref={titleBoxRef}
                    data-cursor-target="hero-title-box"
                    initial={false}
                    animate={{
                      scale: shantoSmall ? 0.48 : 1,
                      x: 0,
                      y: 0,
                      rotate: 0,
                    }}
                    transition={{
                      duration: (isResizing ? 0.68 : 0.52) * speedMultiplier,
                      delay: 0,
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
                      className={`font-display text-6xl font-bold tracking-tight [text-wrap:balance] transition-colors duration-500 sm:text-7xl lg:text-[5rem] lg:leading-[0.95] ${
                        isMonochromePhase ? 'text-zinc-300' : 'text-white'
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
                              className={`transition-colors duration-500 ${
                                isMonochromePhase ? 'text-zinc-400' : 'text-accent'
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
                        <span
                          data-resize-handle="hero-title"
                          className="absolute -bottom-1 -right-1 h-2 w-2 border border-accent-light bg-white"
                        />
                        <ResizeDimensionBadge
                          targetRef={titleBoxRef}
                          active={isResizing && resizeEngaged}
                          fromScaleX={0.48}
                          toScaleX={1}
                          fromScaleY={0.48}
                          toScaleY={1}
                          durationMs={Math.round(680 * speedMultiplier)}
                          delayMs={0}
                        />
                      </div>
                    )}
                  </motion.div>

                  <p
                    className={`mt-4 font-display text-xl font-semibold tracking-wide transition-colors duration-500 sm:text-2xl ${
                      isMonochromePhase ? 'text-zinc-400' : 'text-accent-light'
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
                    className={`mt-5 max-w-lg text-base leading-relaxed transition-colors duration-500 ${
                      isMonochromePhase ? 'text-zinc-400' : 'text-zinc-300'
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
                </div>
              </div>

              {/* Action Buttons created sequentially by cursors: Wireframe drawn -> Label typed -> Corner resize -> Brand paint */}
              <motion.div
                data-cursor-target="hero-buttons"
                initial={false}
                animate={{
                  opacity: isBlack || isDragBox ? 0 : 1,
                  scale: buttonsSmall ? 0.86 : 1,
                }}
                transition={{ duration: (isResizing ? 0.56 : 0.42) * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left center' }}
                className={`relative mt-8 flex flex-wrap items-center gap-4 ${
                  isResizing ? 'rounded-lg border border-dashed border-accent-light/70 p-1.5' : ''
                }`}
              >
                {isResizing && (
                  <span
                    data-resize-handle="hero-buttons"
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-1 -bottom-1 h-2 w-2 border border-accent-light bg-white"
                  />
                )}

                <motion.a
                  href="#works"
                  data-cursor-target="hero-btn-0"
                  initial={false}
                  animate={{
                    opacity: btn1Visible ? 1 : 0,
                    scaleX: btn1Visible ? 1 : 0.72,
                  }}
                  transition={{ duration: 0.16 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'left center' }}
                  onClick={() => {
                    onExploreProjects?.();
                    prepareSectionJump();
                  }}
                  className={`relative inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-300 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    typingBtn1
                      ? 'border border-[#38BDF8]/85 bg-[#08101E]/55 text-zinc-200'
                      : isTyping || isResizing || (isColoring && colorStage < 2)
                        ? 'border border-dashed border-white/30 bg-[#121318] text-zinc-200'
                        : 'border border-transparent bg-accent text-white hover:bg-accent-dark'
                  }`}
                >
                  {typingBtn1 && (
                    <span
                      data-hero-btn-draw="true"
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-1 -bottom-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white"
                    />
                  )}
                  <span className="relative inline-grid align-baseline">
                    <span className="col-start-1 row-start-1 invisible select-none" aria-hidden="true">
                      {BTN_EXPLORE}
                    </span>
                    <span className="pointer-events-none absolute inset-0 whitespace-nowrap">
                      {isTyping ? btnExploreText : BTN_EXPLORE}
                      {typingBtn1 && (
                        <span
                          data-hero-caret="true"
                          className="ml-0.5 inline-block h-[0.9em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </span>
                  <ArrowUpRight
                    className={`h-4 w-4 transition-opacity duration-300 ${
                      isTyping ? 'opacity-30' : 'opacity-100'
                    }`}
                    aria-hidden="true"
                  />
                </motion.a>

                <motion.button
                  type="button"
                  data-cursor-target="hero-btn-1"
                  initial={false}
                  animate={{
                    opacity: btn2Visible ? 1 : 0,
                    scaleX: btn2Visible ? 1 : 0.72,
                  }}
                  transition={{ duration: 0.16 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'left center' }}
                  onClick={onOpenInquiry}
                  className={`relative inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-medium transition-colors duration-300 whitespace-nowrap shrink-0 ${
                    typingBtn2
                      ? 'border-[#38BDF8]/85 bg-[#08101E]/55 text-zinc-200'
                      : isTyping || isResizing || (isColoring && colorStage < 3)
                        ? 'border-dashed border-white/25 bg-[#0D0E12] text-zinc-300'
                        : 'border-white/15 bg-[#111115] text-zinc-200 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {typingBtn2 && (
                    <span
                      data-hero-btn-draw="true"
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-1 -bottom-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white"
                    />
                  )}
                  <span className="relative inline-grid align-baseline">
                    <span className="col-start-1 row-start-1 invisible select-none" aria-hidden="true">
                      {BTN_START}
                    </span>
                    <span className="pointer-events-none absolute inset-0 whitespace-nowrap">
                      {isTyping ? btnStartText : BTN_START}
                      {typingBtn2 && (
                        <span
                          data-hero-caret="true"
                          className="ml-0.5 inline-block h-[0.9em] w-[2px] bg-white align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </span>
                </motion.button>

                {viewerControls.showCvDownloadOnViewer && (
                  <motion.button
                    type="button"
                    data-cursor-target="hero-btn-2"
                    initial={false}
                    animate={{
                      opacity: btn3Visible ? 1 : 0,
                      scaleX: btn3Visible ? 1 : 0.72,
                    }}
                    transition={{ duration: 0.16 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: 'left center' }}
                    onClick={() => {
                      downloadPortfolioCv(portfolioContent);
                      void trackCvDownload();
                    }}
                    className={`relative inline-flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors duration-300 whitespace-nowrap shrink-0 ${
                      typingBtn3
                        ? 'border-[#38BDF8]/85 bg-[#08101E]/55 text-zinc-200'
                        : isTyping || isResizing || (isColoring && colorStage < 3)
                          ? 'border-dashed border-white/25 bg-[#121318] text-zinc-300'
                          : 'border-accent/45 bg-accent/10 text-white hover:border-accent hover:bg-accent/20'
                    }`}
                  >
                    {typingBtn3 && (
                      <span
                        data-hero-btn-draw="true"
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-1 -bottom-1 h-1.5 w-1.5 border border-[#38BDF8] bg-white"
                      />
                    )}
                    <Download
                      className={`h-4 w-4 transition-colors duration-300 ${
                        isTyping || isResizing || (isColoring && colorStage < 3)
                          ? 'text-zinc-400'
                          : 'text-accent-light'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="relative inline-grid align-baseline">
                      <span className="col-start-1 row-start-1 invisible select-none" aria-hidden="true">
                        {BTN_CV}
                      </span>
                      <span className="pointer-events-none absolute inset-0 whitespace-nowrap">
                        {isTyping ? btnCvText : BTN_CV}
                        {typingBtn3 && (
                          <span
                            data-hero-caret="true"
                            className="ml-0.5 inline-block h-[0.9em] w-[2px] bg-white align-middle"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </span>
                  </motion.button>
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

            {/* Giant Tall-Stretched "SHANTO": Cursor grabs handle FIRST, then pulls & stretches -> Painted crimson -> Dropped */}
            <motion.div
              ref={shantoBackdropRef}
              initial={false}
              animate={{
                opacity: isBlack || isDragBox ? 0 : 1,
                scaleX: shantoSmall ? 0.56 : 1,
                scaleY: shantoSmall ? 0.52 : 1.38,
                x: 0,
                y: 0,
              }}
              transition={{
                duration: (isResizing ? 0.72 : 0.6) * speedMultiplier,
                delay: 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'center top' }}
              className="pointer-events-none absolute top-3 -left-2 -right-2 flex items-start justify-center select-none sm:top-4 sm:-left-4 sm:-right-4 lg:top-2 lg:-left-6 lg:-right-2"
              aria-hidden="true"
            >
              <div data-cursor-target="hero-shanto" className="relative inline-block">
                <span
                  className={`block font-display text-[5.75rem] font-bold leading-[0.84] tracking-[-0.015em] transition-colors duration-600 sm:text-[8.5rem] lg:text-[10.75rem] xl:text-[11.75rem] ${
                    isMonochromePhase ? 'text-zinc-500' : 'text-accent'
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
                    <span
                      data-resize-handle="hero-shanto"
                      className="absolute -bottom-1 -right-1 h-2 w-2 border border-accent-light bg-white"
                    />
                    <ResizeDimensionBadge
                      targetRef={shantoBackdropRef}
                      active={isResizing && resizeEngaged}
                      fromScaleX={0.56}
                      toScaleX={1}
                      fromScaleY={0.52}
                      toScaleY={1.38}
                      durationMs={Math.round(720 * speedMultiplier)}
                      delayMs={0}
                    />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Pure Transparent Portrait Cutout (no background box): Enters from top of display -> Cursor #14 pulls straight down into place over SHANTO */}
            <motion.div
              data-cursor-target="hero-cutout"
              initial={false}
              animate={{
                opacity: isDropping || isDone || (isColoring && colorStage >= 2) ? 1 : 0,
                x: 0,
                y: isDropping || isDone ? 0 : isColoring && colorStage >= 2 ? -250 : -460,
                scale: isDropping || isDone ? 1 : 0.92,
              }}
              transition={{
                duration: (isDropping ? 0.92 : isColoring ? 0.42 : 0.25) * speedMultiplier,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'center top' }}
              className="relative z-20 flex w-full max-w-[340px] items-end justify-center bg-transparent sm:max-w-[360px]"
            >
              {(isDropping || (isColoring && colorStage >= 2)) && (
                <div
                  data-cursor-target="hero-cutout-grab"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[58%] left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
                />
              )}
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
              {isDone && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#050507] via-[#050507]/85 to-transparent"
                  aria-hidden="true"
                />
              )}
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

              const isTemplateCopyingSource =
                isTemplateCard && isColoring && kpiPhase === 'pasted';

              return (
                <div
                  key={`kpi-${idx}`}
                  data-cursor-target={`hero-kpi-slot-${idx}`}
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
                      scaleX: isTemplateCard && buttonsSmall ? 0.84 : 1,
                      scaleY: 1,
                      x: isKpiAtSource ? originOffset.x : 0,
                      y: isKpiAtSource ? originOffset.y : 0,
                      rotate: 0,
                    }}
                    transition={
                      isKpiAtSource
                        ? {
                            x: { duration: 0 },
                            y: { duration: 0 },
                            opacity: { duration: 0.08 * speedMultiplier },
                            scaleX: { duration: 0.08 * speedMultiplier },
                            scaleY: { duration: 0.08 * speedMultiplier },
                          }
                        : isKpiPulling
                          ? {
                              x: {
                                duration: 0.58 * speedMultiplier,
                                delay: (idx - 1) * 0.07 * speedMultiplier,
                                ease: [0.22, 1, 0.36, 1],
                              },
                              y: {
                                duration: 0.58 * speedMultiplier,
                                delay: (idx - 1) * 0.07 * speedMultiplier,
                                ease: [0.22, 1, 0.36, 1],
                              },
                              opacity: { duration: 0.14 * speedMultiplier },
                              scaleX: {
                                duration: 0.45 * speedMultiplier,
                                delay: (idx - 1) * 0.07 * speedMultiplier,
                              },
                              scaleY: {
                                duration: 0.45 * speedMultiplier,
                                delay: (idx - 1) * 0.07 * speedMultiplier,
                              },
                            }
                          : {
                              duration: (isResizing ? 0.52 : 0.4) * speedMultiplier,
                              delay: isTemplateCard && isResizing ? 0.04 * speedMultiplier : 0,
                              ease: [0.22, 1, 0.36, 1],
                            }
                    }
                    style={{ transformOrigin: 'left center' }}
                    className={`relative space-y-1 rounded-lg p-2 transition-colors ${
                      isTemplateCard && isResizing
                        ? 'border border-accent-light/75 bg-[#0A101C]/35'
                        : isTemplateCopyingSource
                          ? 'border border-[#38BDF8] bg-[#0A1526]/65 shadow-[0_0_24px_rgba(56,189,248,0.22)]'
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

                  <div className="relative font-display text-3xl font-bold text-white tabular-nums sm:text-4xl">
                    <span className="invisible select-none" aria-hidden="true">
                      {metric.value}
                    </span>
                    <span
                      className={`absolute inset-x-0 top-0 ${
                        isDuplicateHoldingClone
                          ? cloneSelectedHighlight
                            ? 'rounded-sm bg-[#38BDF8]/40 px-1 ring-1 ring-[#38BDF8]'
                            : 'rounded-sm bg-[#38BDF8]/20 px-1 ring-1 ring-[#38BDF8]/50'
                          : ''
                      }`}
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
                  <div className="relative text-xs font-medium text-zinc-400 sm:text-sm">
                    <span className="invisible select-none" aria-hidden="true">
                      {metric.label}
                    </span>
                    <span
                      className={`absolute inset-x-0 top-0 ${
                        isDuplicateHoldingClone
                          ? cloneSelectedHighlight
                            ? 'rounded-sm bg-[#38BDF8]/35 px-1 text-white ring-1 ring-[#38BDF8]'
                            : 'rounded-sm bg-[#38BDF8]/18 px-1 text-zinc-200 ring-1 ring-[#38BDF8]/45'
                          : ''
                      }`}
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
