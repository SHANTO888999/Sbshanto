import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion } from 'motion/react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { cursorAudio } from '../utils/cursorAudio';
import { computeAccentPalette } from '../utils/themeAccent';

export type WireframeShape = 'navbar' | 'hero-copy' | 'image' | 'card' | 'row' | 'panel' | 'metrics';

export type ClonePhase = 'none' | 'pasted' | 'selected';

export type BlockStage =
  | 'hidden'
  | 'layout-drag'
  | 'type-draft'
  | 'resize-scale'
  | 'style-color'
  | 'place-drop'
  | 'done';

const BASE_STAGE_DURATIONS: Record<Exclude<BlockStage, 'hidden' | 'done'>, number> = {
  'layout-drag': 440,
  'type-draft': 1380,
  'resize-scale': 760,
  'style-color': 640,
  'place-drop': 680,
};

const MAX_CONCURRENT_BLOCKS = 4;
const STAGGER_DISPATCH_MS = 380;

const ORTHOGONAL_OFFSETS = [
  { x: 0, y: -12 },
  { x: 0, y: -10 },
  { x: 0, y: -14 },
  { x: 0, y: -8 },
  { x: 0, y: -12 },
  { x: 0, y: -10 },
];

interface RegisteredBlockMeta {
  cloneGroup?: string;
  isCloneItem?: boolean;
}

interface RegisteredBlock {
  id: string;
  el: HTMLElement;
  inView: boolean;
  stage: BlockStage;
  stageStartedAt: number;
  stageDurationMs: number;
  slotLane: number | null;
  cloneGroup?: string;
  isCloneItem: boolean;
  setStage: (stage: BlockStage) => void;
}

interface BuildProgressState {
  completed: number;
  total: number;
}

interface DesignCanvasContextValue {
  cursorsEnabled: boolean;
  toggleCursors: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  autoScrollEnabled: boolean;
  isAutoScrolling: boolean;
  toggleAutoScroll: () => void;
  stopAutoScroll: () => void;
  prepareSectionJump: () => void;
  replayBuildKey: number;
  triggerReplay: () => void;
  heroStep: number; // 0: black+orbit, 1: burst+layout drag, 2: type, 3: resize, 4: color accent, 5: drop into place, 6: complete
  skipHeroBuild: () => void;
  speedMultiplier: number;
  buildProgress: BuildProgressState;
  registerBlock: (
    id: string,
    el: HTMLElement,
    setStage: (s: BlockStage) => void,
    meta?: RegisteredBlockMeta
  ) => void;
  unregisterBlock: (id: string) => void;
  updateBlockInView: (id: string, inView: boolean) => void;
}

const DesignCanvasContext = createContext<DesignCanvasContextValue>({
  cursorsEnabled: true,
  toggleCursors: () => {},
  soundEnabled: true,
  toggleSound: () => {},
  autoScrollEnabled: true,
  isAutoScrolling: false,
  toggleAutoScroll: () => {},
  stopAutoScroll: () => {},
  prepareSectionJump: () => {},
  replayBuildKey: 0,
  triggerReplay: () => {},
  heroStep: 6,
  skipHeroBuild: () => {},
  speedMultiplier: 1,
  buildProgress: { completed: 0, total: 0 },
  registerBlock: () => {},
  unregisterBlock: () => {},
  updateBlockInView: () => {},
});

export const useDesignCanvas = () => useContext(DesignCanvasContext);

interface TypedLineRecord {
  id: string;
  el: HTMLElement;
  len: number;
}

interface DesignBlockStageContextValue {
  stage: BlockStage;
  cursorsEnabled: boolean;
  isCloneHighlight: boolean;
  clonePhase: ClonePhase;
  charProgress: number;
  registerTypedLine: (id: string, el: HTMLElement, len: number) => void;
  unregisterTypedLine: (id: string) => void;
  getLineSlice: (id: string, len: number) => { visibleChars: number; isActiveLine: boolean };
}

const DesignBlockStageContext = createContext<DesignBlockStageContextValue>({
  stage: 'done',
  cursorsEnabled: true,
  isCloneHighlight: false,
  clonePhase: 'none',
  charProgress: 999999,
  registerTypedLine: () => {},
  unregisterTypedLine: () => {},
  getLineSlice: (_, len) => ({ visibleChars: len, isActiveLine: false }),
});

export const useBlockStage = () => useContext(DesignBlockStageContext);

/** Crisp single Figma-style pointer arrow */
export const ActiveCursor: React.FC<{
  color?: string;
  className?: string;
}> = ({ color = '#FFFFFF', className = '' }) => (
  <div className={`pointer-events-none relative ${className}`} aria-hidden="true">
    <svg
      width="17"
      height="19"
      viewBox="0 0 20 22"
      fill="none"
      className="relative drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
    >
      <path
        d="M2.5 2L17.5 9.5L10.5 12L7.5 19.5L2.5 2Z"
        fill={color}
        stroke="#050507"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

/** Live Figma-style crimson W × H counter visible strictly during active resize */
export const ResizeDimensionBadge: React.FC<{
  targetRef: React.RefObject<HTMLElement | null>;
  active: boolean;
  fromScaleX?: number;
  toScaleX?: number;
  fromScaleY?: number;
  toScaleY?: number;
  durationMs?: number;
  delayMs?: number;
}> = ({
  targetRef,
  active,
  fromScaleX = 0.62,
  toScaleX = 1,
  fromScaleY = 0.62,
  toScaleY = 1,
  durationMs = 760,
  delayMs = 260,
}) => {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setDims(null);
      return;
    }
    const el = targetRef.current;
    if (!el) return;

    const baseW = Math.max(24, el.offsetWidth);
    const baseH = Math.max(18, el.offsetHeight);
    setDims({
      w: Math.round(baseW * fromScaleX),
      h: Math.round(baseH * fromScaleY),
    });

    const startedAt = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = Math.max(0, now - startedAt - delayMs);
      const p = easeOutCubic(elapsed / durationMs);
      const curSX = fromScaleX + (toScaleX - fromScaleX) * p;
      const curSY = fromScaleY + (toScaleY - fromScaleY) * p;
      setDims({
        w: Math.round(baseW * curSX),
        h: Math.round(baseH * curSY),
      });
      if (p < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [active, targetRef, fromScaleX, toScaleX, fromScaleY, toScaleY, durationMs, delayMs]);

  if (!active || !dims) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-6 right-0 z-30 rounded-[3px] bg-accent-light px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.65)] tabular-nums whitespace-nowrap"
    >
      {dims.w} × {dims.h}
    </span>
  );
};

/**
 * Line-by-line TypedText synced sequentially across every TypedText inside its parent DesignBlock:
 * Line 1 finishes typing -> Line 2 starts -> Line 3 starts -> etc.
 * Only the active currently-typing line exposes [data-typed-caret="true"], so the dispatched
 * White Type Cursor physically jumps line-to-line writing every text element cleanly.
 */
export const TypedText: React.FC<{
  text: string;
  cloneFrom?: string;
  accentText?: string;
  accentBreak?: boolean;
  accentClassName?: string;
  className?: string;
  showCursor?: boolean;
}> = ({
  text,
  cloneFrom,
  accentText = '',
  accentBreak = false,
  accentClassName = 'text-accent',
  className = '',
  showCursor = true,
}) => {
  const lineId = useId();
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const {
    stage,
    cursorsEnabled,
    isCloneHighlight,
    clonePhase,
    registerTypedLine,
    unregisterTypedLine,
    getLineSlice,
  } = useBlockStage();

  const fullText = `${text}${accentText}`;

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    registerTypedLine(lineId, el, fullText.length);
    return () => unregisterTypedLine(lineId);
  }, [lineId, fullText.length, registerTypedLine, unregisterTypedLine]);

  if (!cursorsEnabled || stage === 'done') {
    return (
      <span ref={spanRef} data-typed-line={lineId} data-char-len={fullText.length} className={className}>
        {text}
        {accentBreak && <br />}
        {accentText && <span className={accentClassName}>{accentText}</span>}
      </span>
    );
  }

  const isLayoutDrag = stage === 'layout-drag';
  const isTyping = stage === 'type-draft';
  const showClonedSelection = isCloneHighlight && (isLayoutDrag || isTyping);
  const isMonochromeDraft = stage === 'type-draft' || stage === 'resize-scale';

  let charCount = 0;
  let isActiveLine = false;

  if (stage === 'resize-scale' || stage === 'style-color' || stage === 'place-drop') {
    charCount = fullText.length;
  } else if (isTyping && !showClonedSelection) {
    const slice = getLineSlice(lineId, fullText.length);
    charCount = slice.visibleChars;
    isActiveLine = slice.isActiveLine;
  }

  const baseShown = text.slice(0, Math.min(charCount, text.length));
  const rem = Math.max(0, charCount - text.length);
  const accentShown = accentText.slice(0, rem);
  const cursorOnAccent = isTyping && !showClonedSelection && isActiveLine && charCount > text.length;
  const cursorOnBase = isTyping && !showClonedSelection && isActiveLine && charCount <= text.length;

  return (
    <span
      ref={spanRef}
      data-typed-line={lineId}
      data-char-len={fullText.length}
      className={`inline-grid ${className}`}
    >
      <span className="col-start-1 row-start-1 invisible" aria-hidden="true">
        {text}
        {accentBreak && <br />}
        {accentText}
      </span>

      {showClonedSelection ? (
        <span className="col-start-1 row-start-1 font-mono opacity-95">
          <span
            className={`rounded-[2px] px-0.5 transition-colors duration-200 ${
              clonePhase === 'selected'
                ? 'bg-[#38BDF8]/40 text-white ring-1 ring-[#38BDF8]'
                : 'bg-[#38BDF8]/18 text-zinc-200 ring-1 ring-[#38BDF8]/45'
            }`}
          >
            {cloneFrom ?? text}
          </span>
        </span>
      ) : (
        <span
          className={`col-start-1 row-start-1 transition-colors duration-400 ${
            stage === 'hidden' || stage === 'layout-drag'
              ? 'opacity-0'
              : isTyping
                ? charCount > 0 || isActiveLine
                  ? 'font-mono opacity-95 text-zinc-300'
                  : 'opacity-0'
                : 'opacity-100'
          }`}
        >
          <span>{baseShown}</span>
          {showCursor && cursorOnBase && (
            <span
              data-typed-caret="true"
              className="relative inline-block w-0 align-middle"
              aria-hidden="true"
            >
              <span className="inline-block h-[0.88em] w-[2px] bg-white align-middle shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
            </span>
          )}
          {accentBreak && <br />}
          {accentText && (
            <span
              className={`transition-colors duration-400 ${
                isMonochromeDraft ? 'text-zinc-300' : accentClassName
              }`}
            >
              {accentShown}
              {showCursor && cursorOnAccent && (
                <span
                  data-typed-caret="true"
                  className="relative inline-block w-0 align-middle"
                  aria-hidden="true"
                >
                  <span className="inline-block h-[0.88em] w-[2px] bg-white align-middle shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

type RoleKind = 'layout' | 'type' | 'resize' | 'style' | 'place';

interface CursorAgentSpec {
  id: number;
  role: RoleKind;
  color: string;
}

const ROSTER_18: CursorAgentSpec[] = [
  { id: 0, role: 'layout', color: '#38BDF8' },
  { id: 1, role: 'layout', color: '#38BDF8' },
  { id: 2, role: 'layout', color: '#38BDF8' },
  { id: 3, role: 'layout', color: '#38BDF8' },

  { id: 4, role: 'type', color: '#FFFFFF' },
  { id: 5, role: 'type', color: '#FFFFFF' },
  { id: 6, role: 'type', color: '#FFFFFF' },
  { id: 7, role: 'type', color: '#FFFFFF' },

  { id: 8, role: 'resize', color: '#EF4444' },
  { id: 9, role: 'resize', color: '#EF4444' },
  { id: 10, role: 'resize', color: '#EF4444' },

  { id: 11, role: 'style', color: '#A855F7' },
  { id: 12, role: 'style', color: '#A855F7' },
  { id: 13, role: 'style', color: '#22C55E' },

  { id: 14, role: 'place', color: '#F59E0B' },
  { id: 15, role: 'place', color: '#F59E0B' },
  { id: 16, role: 'place', color: '#F59E0B' },
  { id: 17, role: 'place', color: '#F59E0B' },
];

const LANE_CURSORS: Array<Record<Exclude<BlockStage, 'hidden' | 'done'>, number[]>> = [
  { 'layout-drag': [0], 'type-draft': [4], 'resize-scale': [8], 'style-color': [11], 'place-drop': [14] },
  { 'layout-drag': [1], 'type-draft': [5], 'resize-scale': [9], 'style-color': [12], 'place-drop': [15] },
  { 'layout-drag': [2], 'type-draft': [6], 'resize-scale': [10], 'style-color': [13], 'place-drop': [16] },
  { 'layout-drag': [3], 'type-draft': [7], 'resize-scale': [8], 'style-color': [11], 'place-drop': [17] },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);

/**
 * Finds the best visible source card in the same cloneGroup (Card #1 if visible on screen,
 * otherwise the nearest completed visible card in that group when scrolled deep through many rows).
 */
function findVisibleCloneSourceRect(
  cloneGroup: string | undefined,
  dstRect: DOMRect
): DOMRect | null {
  if (typeof window === 'undefined' || !cloneGroup) return null;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const isVisible = (r: DOMRect) =>
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 68 &&
    r.top < vh - 16 &&
    r.right > 0 &&
    r.left < vw;

  const templateEl = document.querySelector(
    `[data-clone-template="${cloneGroup}"]`
  ) as HTMLElement | null;
  if (templateEl) {
    const tRect = templateEl.getBoundingClientRect();
    if (isVisible(tRect)) return tRect;
  }

  const doneEls = Array.from(
    document.querySelectorAll(`[data-clone-done="${cloneGroup}"]`)
  ) as HTMLElement[];

  let bestRect: DOMRect | null = null;
  let bestDist = Infinity;
  for (const el of doneEls) {
    const r = el.getBoundingClientRect();
    if (!isVisible(r)) continue;
    const d = Math.hypot(r.left - dstRect.left, r.top - dstRect.top);
    if (d > 8 && d < bestDist) {
      bestDist = d;
      bestRect = r;
    }
  }
  return bestRect;
}

/**
 * Clean 18-Cursor Circular Orbit & Live Work Dispatcher:
 * Smoothly orbits in clean concentric rings around center on boot, then peels out
 * cleanly to drag/copy-paste/type/resize/color/drop each visible block on screen.
 */
const CollaborativeCursorRosterOverlay: React.FC<{
  active: boolean;
  heroStep: number;
  speedMultiplier: number;
  accentLightHex: string;
  heroStepStartedAtRef: React.MutableRefObject<number>;
  blocksRef: React.MutableRefObject<Map<string, RegisteredBlock>>;
}> = ({ active, heroStep, speedMultiplier, accentLightHex, heroStepStartedAtRef, blocksRef }) => {
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const heroStepRef = useRef(heroStep);
  heroStepRef.current = heroStep;
  const speedMultRef = useRef(speedMultiplier);
  speedMultRef.current = speedMultiplier;

  useEffect(() => {
    if (typeof window === 'undefined' || !active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const positions = ROSTER_18.map((_, idx) => {
      const a = (idx / ROSTER_18.length) * Math.PI * 2;
      const r = idx % 2 === 0 ? 84 : 116;
      return {
        x: window.innerWidth / 2 + Math.cos(a) * r,
        y: window.innerHeight / 2 + Math.sin(a) * r,
      };
    });

    let rafId = 0;
    const bootTime = performance.now();

    const tick = (now: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const step = heroStepRef.current;
      const sMult = speedMultRef.current;
      const elapsedSec = (now - bootTime) * 0.001;
      const isNarrow = vw < 640;

      const orbitCenterX =
        step === 0
          ? vw * 0.5
          : isNarrow
            ? vw * 0.84 + Math.sin(elapsedSec * 0.32) * 5
            : vw * 0.74 + Math.sin(elapsedSec * 0.28) * 24;
      const orbitCenterY =
        step === 0
          ? vh * 0.5
          : isNarrow
            ? Math.max(78, vh * 0.14) + Math.cos(elapsedSec * 0.26) * 5
            : vh * 0.42 + Math.cos(elapsedSec * 0.24) * 20;

      const targets: Array<{ x: number; y: number; working: boolean; lockTight?: boolean }> =
        ROSTER_18.map((_, idx) => {
          const ringDir = idx % 2 === 0 ? 1 : -0.78;
          const baseAngle = (idx / ROSTER_18.length) * Math.PI * 2;
          const angle = baseAngle + elapsedSec * (1.05 / sMult) * ringDir;
          const radius =
            step === 0
              ? idx % 2 === 0
                ? isNarrow
                  ? 58
                  : 82
                : isNarrow
                  ? 88
                  : 118
              : isNarrow
                ? idx % 2 === 0
                  ? 18
                  : 30
                : idx % 2 === 0
                  ? 52
                  : 84;

          return {
            x: orbitCenterX + Math.cos(angle) * radius,
            y: orbitCenterY + Math.sin(angle) * radius,
            working: false,
          };
        });

      const assignTarget = (
        cursorIdx: number,
        x: number,
        y: number,
        lockTight = false
      ) => {
        if (cursorIdx < 0 || cursorIdx >= targets.length) return;
        targets[cursorIdx] = {
          x: Math.max(8, Math.min(vw - 20, x)),
          y: Math.max(8, Math.min(vh - 20, y)),
          working: true,
          lockTight,
        };
      };

      const queryRect = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        return el.getBoundingClientRect();
      };

      const stepElapsed = now - heroStepStartedAtRef.current;

      // PHASE A: HERO ORCHESTRATION (steps 1..5)
      if (step === 1) {
        const p = easeOutCubic(stepElapsed / (1000 * sMult));
        const navRect = queryRect('[data-cursor-target="navbar"]');
        const leftRect = queryRect('[data-cursor-target="hero-left"]');
        const rightRect = queryRect('[data-cursor-target="hero-right"]');

        if (navRect) {
          assignTarget(2, navRect.left + 20 + p * (navRect.width - 40), navRect.top + navRect.height * 0.5);
        }
        if (leftRect) {
          assignTarget(0, leftRect.left + 12 + p * (leftRect.width - 18), leftRect.top + 12 + p * (leftRect.height - 18));
        }
        if (rightRect) {
          assignTarget(1, rightRect.left + 12 + p * (rightRect.width - 18), rightRect.top + 12 + p * (rightRect.height - 18));
        }
      } else if (step === 2) {
        const caretRect = queryRect('[data-hero-caret="true"]');
        const shantoCaretRect = queryRect('[data-hero-shanto-caret="true"]');
        const kpiCaretRect = queryRect('[data-hero-kpi-caret="true"]');
        const leftRect = queryRect('[data-cursor-target="hero-left"]');
        const shantoRect = queryRect('[data-cursor-target="hero-shanto"]');

        if (caretRect) {
          assignTarget(4, caretRect.right + 2, caretRect.bottom - 1, true);
        } else if (leftRect) {
          assignTarget(4, leftRect.left + 16, leftRect.top + 24);
        }
        if (shantoCaretRect) {
          assignTarget(5, shantoCaretRect.right + 2, shantoCaretRect.bottom - 2, true);
        } else if (shantoRect) {
          assignTarget(5, shantoRect.left + 12, shantoRect.bottom - 2);
        }
        if (kpiCaretRect) {
          assignTarget(6, kpiCaretRect.right + 2, kpiCaretRect.bottom - 1, true);
        }
      } else if (step === 3) {
        const p = easeOutCubic((stepElapsed - 220 * sMult) / (820 * sMult));
        const titleRect = queryRect('[data-cursor-target="hero-title-box"]');
        const leftRect = queryRect('[data-cursor-target="hero-left"]');
        const shantoRect = queryRect('[data-cursor-target="hero-shanto"]');

        if (titleRect) {
          assignTarget(8, titleRect.right - 2, titleRect.bottom - 2, true);
        }
        if (shantoRect) {
          assignTarget(9, shantoRect.right - 2, shantoRect.bottom - 2, true);
        }
        if (leftRect) {
          assignTarget(10, leftRect.left + leftRect.width * (0.62 + 0.38 * p), leftRect.bottom - 6, true);
        }
        const kpi0Rect = queryRect('[data-cursor-target="hero-kpi-0"]');
        if (kpi0Rect) {
          assignTarget(8, kpi0Rect.right - 2, kpi0Rect.bottom - 2, true);
        }
      } else if (step === 4) {
        const p = easeOutCubic(stepElapsed / (1150 * sMult));
        const titleRect = queryRect('[data-cursor-target="hero-title-box"]');
        const leftRect = queryRect('[data-cursor-target="hero-left"]');
        const shantoRect = queryRect('[data-cursor-target="hero-shanto"]');

        if (titleRect) {
          assignTarget(11, titleRect.left + p * (titleRect.width + 14), titleRect.bottom + 2);
        }
        if (shantoRect) {
          assignTarget(12, shantoRect.left + p * (shantoRect.width - 10), shantoRect.bottom + 2);
        }
        if (leftRect) {
          assignTarget(13, leftRect.left + p * (leftRect.width * 0.72), leftRect.bottom - 10);
        }
        const kpi0Rect = queryRect('[data-cursor-target="hero-kpi-0"]');
        if (stepElapsed < 360 * sMult) {
          [0, 1, 2].forEach((slotOffset) => {
            if (kpi0Rect) {
              assignTarget(
                14 + slotOffset,
                kpi0Rect.left + kpi0Rect.width * (0.28 + slotOffset * 0.22),
                kpi0Rect.top + 14,
                true
              );
            }
          });
        } else {
          [1, 2, 3].forEach((kpiIdx, idxOffset) => {
            const kpiRect = queryRect(`[data-cursor-target="hero-kpi-${kpiIdx}"]`);
            if (kpiRect) {
              assignTarget(
                14 + (idxOffset % 4),
                kpiRect.left + Math.min(28, kpiRect.width * 0.35),
                kpiRect.top + 12,
                true
              );
            }
          });
        }
      } else if (step === 5) {
        const cutoutRect = queryRect('[data-cursor-target="hero-cutout"]');
        if (cutoutRect) {
          assignTarget(14, cutoutRect.left + cutoutRect.width * 0.5, cutoutRect.top + 12, true);
        }
        const kpiEditCaret = queryRect('[data-hero-kpi-edit-caret="true"]');
        if (kpiEditCaret) {
          assignTarget(4, kpiEditCaret.right + 2, kpiEditCaret.bottom - 1, true);
        }
        [0, 1, 2, 3].forEach((kpiIdx) => {
          const kpiRect = queryRect(`[data-cursor-target="hero-kpi-${kpiIdx}"]`);
          if (kpiRect) {
            assignTarget(15 + (kpiIdx % 3), kpiRect.left + kpiRect.width * 0.5, kpiRect.top + 8, true);
          }
        });
      }

      // PHASE B: ACTIVE DESIGN BLOCK DISPATCH
      blocksRef.current.forEach((block) => {
        if (
          block.stage === 'hidden' ||
          block.stage === 'done' ||
          block.slotLane === null
        ) {
          return;
        }

        const frameEl = block.el.querySelector('[data-block-frame="true"]') as HTMLElement | null;
        const targetEl = frameEl ?? block.el;
        const rect = targetEl.getBoundingClientRect();
        if (rect.bottom < -60 || rect.top > vh + 60 || rect.width === 0) return;

        const duration = Math.max(1, block.stageDurationMs);
        const rawP = clamp01((now - block.stageStartedAt) / duration);
        const p = easeOutCubic(rawP);
        const laneSet = LANE_CURSORS[block.slotLane % LANE_CURSORS.length];
        const cursorIds = laneSet[block.stage] || [];

        const isCloneBlock = block.isCloneItem;

        if (block.stage === 'layout-drag') {
          if (isCloneBlock) {
            const elapsedStageMs = now - block.stageStartedAt;
            const amberCloneId = 14 + (block.slotLane % 4);
            let dragX = rect.left + Math.min(28, rect.width * 0.24);
            let dragY = rect.top + 14;

            if (elapsedStageMs < 220 * sMult && block.cloneGroup) {
              const srcRect = findVisibleCloneSourceRect(block.cloneGroup, rect);
              if (srcRect) {
                dragX = srcRect.left + Math.min(40, srcRect.width * 0.35);
                dragY = srcRect.top + 16;
              }
            }

            cursorIds.forEach((cid) => {
              assignTarget(cid, dragX, dragY, true);
            });
            assignTarget(amberCloneId, dragX + 4, dragY + 4, true);
          } else {
            cursorIds.forEach((cid) => {
              assignTarget(
                cid,
                rect.left + 6 + p * Math.max(18, rect.width - 10),
                rect.top + 6 + p * Math.max(14, rect.height - 10)
              );
            });
          }
        } else if (block.stage === 'type-draft') {
          const caretEl = block.el.querySelector('[data-typed-caret="true"]');
          if (caretEl) {
            const cRect = caretEl.getBoundingClientRect();
            cursorIds.forEach((cid) => {
              assignTarget(cid, cRect.right + 2, cRect.bottom - 1, true);
            });
          } else {
            cursorIds.forEach((cid) => {
              assignTarget(cid, rect.left + 12, rect.top + 14, true);
            });
          }
        } else if (block.stage === 'resize-scale') {
          cursorIds.forEach((cid) => {
            assignTarget(cid, rect.right - 2, rect.bottom - 2, true);
          });
        } else if (block.stage === 'style-color') {
          cursorIds.forEach((cid) => {
            assignTarget(
              cid,
              rect.left + 8 + p * Math.max(20, rect.width - 16),
              rect.top + 6
            );
          });
        } else if (block.stage === 'place-drop') {
          cursorIds.forEach((cid) => {
            assignTarget(cid, rect.left + rect.width * 0.5, rect.top + 4, true);
          });
        }
      });

      ROSTER_18.forEach((_, idx) => {
        const target = targets[idx];
        const dist = Math.hypot(target.x - positions[idx].x, target.y - positions[idx].y);
        const speedBoost = sMult < 1 ? 1.25 : sMult > 1 ? 0.8 : 1;
        const baseLerp = !target.working
          ? 0.085
          : target.lockTight
            ? dist < 44
              ? 0.88
              : 0.46
            : 0.34;
        const lerpAmt = Math.min(0.95, baseLerp * speedBoost);
        positions[idx].x += (target.x - positions[idx].x) * lerpAmt;
        positions[idx].y += (target.y - positions[idx].y) * lerpAmt;

        const curEl = cursorRefs.current[idx];
        if (curEl) {
          const curScale = isNarrow
            ? target.working
              ? 0.96
              : 0.58
            : target.working
              ? 1.08
              : 0.84;
          curEl.style.transform = `translate3d(${positions[idx].x}px, ${positions[idx].y}px, 0) scale(${curScale})`;
          curEl.style.opacity =
            step === 0 || target.working ? '0.98' : isNarrow ? '0.45' : '0.72';
        }
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [active, blocksRef, heroStepStartedAtRef]);

  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {ROSTER_18.map((agent, idx) => (
        <div
          key={`cur-${agent.id}`}
          ref={(el) => {
            cursorRefs.current[idx] = el;
          }}
          className="fixed top-0 left-0 origin-top-left will-change-transform"
        >
          <ActiveCursor color={agent.role === 'resize' ? accentLightHex : agent.color} />
        </div>
      ))}
    </div>
  );
};

type CursorMode = 'arrow' | 'pointer' | 'text' | 'eye' | 'plus' | 'crosshair';

const CROSSHAIR_SELECTOR = '[data-cursor="crosshair"], [role="slider"], [draggable="true"]';
const PLUS_SELECTOR = '[data-magnetic="card"], [data-cursor="plus"]';
const EYE_SELECTOR = '[data-cursor="eye"], img';
const POINTER_SELECTOR =
  'a, button:not(:disabled), [role="tab"]:not([aria-disabled="true"]), [data-magnetic]';
const TEXT_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-cursor="text"], p, h1, h2, h3, h4, blockquote, label, li';

interface CursorHoverState {
  mode: CursorMode;
  magneticTarget: HTMLElement | null;
}

const MagneticCursorOverlay: React.FC<{ active: boolean; accentHex?: string }> = ({
  active,
  accentHex,
}) => {
  const palette = computeAccentPalette(accentHex);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const cursorLayerRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const arrowIconRef = useRef<SVGSVGElement | null>(null);
  const pointerIconRef = useRef<SVGSVGElement | null>(null);
  const textIconRef = useRef<SVGSVGElement | null>(null);
  const eyeIconRef = useRef<SVGSVGElement | null>(null);
  const plusIconRef = useRef<SVGSVGElement | null>(null);
  const crosshairIconRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pointerFine = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!active || !pointerFine || reducedMotion) {
      document.documentElement.classList.remove('magnetic-cursor-active');
      return;
    }

    document.documentElement.classList.add('magnetic-cursor-active');

    let rafId = 0;
    let visible = false;
    let isPressed = false;
    let hasMoved = false;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let curX = mouseX;
    let curY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let curScale = 1;
    let ringScale = 1;

    let frameX = mouseX - 16;
    let frameY = mouseY - 16;
    let frameW = 32;
    let frameH = 32;
    let frameOpacity = 0;

    let hoveredEl: HTMLElement | null = null;
    let currentMode: CursorMode = 'arrow';
    let appliedMode: CursorMode | null = null;
    let wasHovering = false;

    const resolveHoverState = (target: EventTarget | null): CursorHoverState => {
      if (!(target instanceof Element)) {
        return { mode: 'arrow', magneticTarget: null };
      }

      const crosshairEl = target.closest(CROSSHAIR_SELECTOR);
      if (crosshairEl instanceof HTMLElement) {
        return {
          mode: 'crosshair',
          magneticTarget:
            crosshairEl.hasAttribute('data-magnetic') ||
            crosshairEl.getAttribute('role') === 'slider'
              ? crosshairEl
              : null,
        };
      }

      const plusEl = target.closest(PLUS_SELECTOR);
      if (plusEl instanceof HTMLElement) {
        return {
          mode: 'plus',
          magneticTarget: plusEl,
        };
      }

      const eyeEl = target.closest(EYE_SELECTOR);
      if (eyeEl instanceof HTMLElement) {
        return {
          mode: 'eye',
          magneticTarget: null,
        };
      }

      const pointerEl = target.closest(POINTER_SELECTOR);
      if (pointerEl instanceof HTMLElement) {
        return {
          mode: 'pointer',
          magneticTarget: pointerEl,
        };
      }

      const textEl = target.closest(TEXT_SELECTOR);
      if (textEl instanceof HTMLElement) {
        return {
          mode: 'text',
          magneticTarget: null,
        };
      }

      return { mode: 'arrow', magneticTarget: null };
    };

    const updateHoverFromPoint = (fallbackTarget?: EventTarget | null) => {
      const underPointer = document.elementFromPoint(mouseX, mouseY);
      const state = resolveHoverState(underPointer ?? fallbackTarget ?? null);
      currentMode = state.mode;
      hoveredEl = state.magneticTarget;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      mouseX = e.clientX;
      mouseY = e.clientY;
      visible = true;

      if (!hasMoved) {
        hasMoved = true;
        curX = mouseX;
        curY = mouseY;
        ringX = mouseX;
        ringY = mouseY;
        frameX = mouseX - 16;
        frameY = mouseY - 16;
      }

      updateHoverFromPoint(e.target);
    };

    const onPointerDown = () => {
      isPressed = true;
    };

    const onPointerUp = () => {
      isPressed = false;
    };

    const onPointerLeave = () => {
      visible = false;
      hoveredEl = null;
      currentMode = 'arrow';
      isPressed = false;
    };

    const onScrollOrResize = () => {
      if (!visible) return;
      updateHoverFromPoint();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    document.addEventListener('mouseleave', onPointerLeave);

    const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;

    const applyModeIcons = (mode: CursorMode, ring: HTMLDivElement) => {
      const icons: Record<CursorMode, SVGSVGElement | null> = {
        arrow: arrowIconRef.current,
        pointer: pointerIconRef.current,
        text: textIconRef.current,
        eye: eyeIconRef.current,
        plus: plusIconRef.current,
        crosshair: crosshairIconRef.current,
      };

      (Object.keys(icons) as CursorMode[]).forEach((key) => {
        const svg = icons[key];
        if (!svg) return;
        const activeIcon = key === mode;
        svg.style.opacity = activeIcon ? '1' : '0';
        svg.style.transform = activeIcon ? 'scale(1)' : 'scale(0.68)';
      });

      if (mode === 'pointer' || mode === 'plus') {
        const pal = paletteRef.current;
        ring.style.borderColor = `rgba(${pal.rgb}, 0.9)`;
        ring.style.backgroundColor = `rgba(${pal.rgb}, 0.14)`;
      } else if (mode === 'eye') {
        ring.style.borderColor = 'rgba(56, 189, 248, 0.85)';
        ring.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
      } else if (mode === 'crosshair') {
        ring.style.borderColor = 'rgba(245, 158, 11, 0.85)';
        ring.style.backgroundColor = 'rgba(245, 158, 11, 0.10)';
      } else if (mode === 'text') {
        ring.style.borderColor = 'rgba(56, 189, 248, 0.55)';
        ring.style.backgroundColor = 'transparent';
      } else {
        ring.style.borderColor = 'rgba(255, 255, 255, 0.35)';
        ring.style.backgroundColor = 'transparent';
      }
    };

    const tick = () => {
      if (hoveredEl && !hoveredEl.isConnected) {
        hoveredEl = null;
        currentMode = 'arrow';
      }

      const layer = cursorLayerRef.current;
      const arrow = arrowRef.current;
      const ring = ringRef.current;
      const frame = frameRef.current;

      if (layer && arrow && ring && frame) {
        layer.style.opacity = visible ? '1' : '0';

        const effectiveMode: CursorMode = currentMode;

        if (effectiveMode !== appliedMode) {
          appliedMode = effectiveMode;
          applyModeIcons(effectiveMode, ring);
        }

        let targetCurX = mouseX;
        let targetCurY = mouseY;
        let targetRingX = mouseX;
        let targetRingY = mouseY;
        let targetRingScale = isPressed ? 0.78 : effectiveMode === 'text' ? 0.72 : 1;
        let targetCurScale = isPressed ? 0.86 : 1;

        let targetFrameX = curX - 16;
        let targetFrameY = curY - 16;
        let targetFrameW = 32;
        let targetFrameH = 32;
        let targetFrameOpacity = 0;

        if (hoveredEl && visible) {
          const rect = hoveredEl.getBoundingClientRect();
          const isCard = hoveredEl.dataset.magnetic === 'card' || rect.height > 110;
          const isWideRow = !isCard && rect.width > 260;

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          if (isCard) {
            targetCurX = centerX + (mouseX - centerX) * 0.18;
            targetCurY = centerY + (mouseY - centerY) * 0.18;
            targetRingX = centerX + (mouseX - centerX) * 0.1;
            targetRingY = centerY + (mouseY - centerY) * 0.1;
            targetRingScale = isPressed ? 1.15 : 1.5;
          } else if (isWideRow) {
            targetCurX = centerX + (mouseX - centerX) * 0.25;
            targetCurY = centerY + (mouseY - centerY) * 0.15;
            targetRingX = targetCurX;
            targetRingY = centerY;
            targetRingScale = isPressed ? 1.05 : 1.32;
          } else {
            targetCurX = centerX + (mouseX - centerX) * 0.14;
            targetCurY = centerY + (mouseY - centerY) * 0.14;
            targetRingX = centerX;
            targetRingY = centerY;
            targetRingScale = isPressed ? 1.0 : 1.38;
          }

          const leanX = Math.max(-5, Math.min(5, (mouseX - centerX) * 0.04));
          const leanY = Math.max(-5, Math.min(5, (mouseY - centerY) * 0.04));
          const pad = isCard ? 5 : 4;

          targetFrameX = rect.left - pad + leanX;
          targetFrameY = rect.top - pad + leanY;
          targetFrameW = rect.width + pad * 2;
          targetFrameH = rect.height + pad * 2;
          targetFrameOpacity = 1;

          if (!wasHovering) {
            if (frameOpacity < 0.15) {
              frameX = curX - 18;
              frameY = curY - 18;
              frameW = 36;
              frameH = 36;
            }
            wasHovering = true;
          }
        } else {
          wasHovering = false;
        }

        curX = lerp(curX, targetCurX, 0.3);
        curY = lerp(curY, targetCurY, 0.3);
        ringX = lerp(ringX, targetRingX, 0.18);
        ringY = lerp(ringY, targetRingY, 0.18);
        curScale = lerp(curScale, targetCurScale, 0.26);
        ringScale = lerp(ringScale, targetRingScale, 0.22);

        frameX = lerp(frameX, targetFrameX, 0.24);
        frameY = lerp(frameY, targetFrameY, 0.24);
        frameW = lerp(frameW, targetFrameW, 0.24);
        frameH = lerp(frameH, targetFrameH, 0.24);
        frameOpacity = lerp(frameOpacity, targetFrameOpacity, 0.22);

        arrow.style.transform = `translate3d(${curX}px, ${curY}px, 0) scale(${curScale})`;
        ring.style.transform = `translate3d(${ringX - 14}px, ${ringY - 14}px, 0) scale(${ringScale})`;
        frame.style.transform = `translate3d(${frameX}px, ${frameY}px, 0)`;
        frame.style.width = `${frameW}px`;
        frame.style.height = `${frameH}px`;
        frame.style.opacity = `${frameOpacity}`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('magnetic-cursor-active');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('blur', onPointerLeave);
      document.removeEventListener('mouseleave', onPointerLeave);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={cursorLayerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] opacity-0 transition-opacity duration-150"
    >
      <div
        ref={frameRef}
        className="fixed top-0 left-0 rounded-xl border border-accent-light/85 bg-accent/[0.04] shadow-[0_0_24px_rgba(var(--accent-rgb),0.16)] will-change-transform"
        style={{ opacity: 0, width: 32, height: 32 }}
      >
        <span className="absolute -top-1 -left-1 h-1.5 w-1.5 border border-accent-light bg-white" />
        <span className="absolute -top-1 -right-1 h-1.5 w-1.5 border border-accent-light bg-white" />
        <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 border border-accent-light bg-white" />
        <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border border-accent-light bg-white" />
      </div>

      <div
        ref={ringRef}
        className="fixed top-0 left-0 h-7 w-7 rounded-full border border-white/35 transition-colors duration-150 will-change-transform"
      />

      <div ref={arrowRef} className="fixed top-0 left-0 origin-top-left will-change-transform">
        <svg
          ref={arrowIconRef}
          width="19"
          height="21"
          viewBox="0 0 20 22"
          fill="none"
          className="absolute top-0 left-0 -translate-x-[2px] -translate-y-[2px] drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)] transition-[opacity,transform] duration-150"
        >
          <path
            d="M2.5 2L17.5 9.5L10.5 12L7.5 19.5L2.5 2Z"
            fill="#FFFFFF"
            stroke="#050507"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>

        <svg
          ref={pointerIconRef}
          width="20"
          height="22"
          viewBox="0 0 20 22"
          fill="none"
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 -translate-x-[2px] -translate-y-[2px] drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] transition-[opacity,transform] duration-150"
        >
          <path
            d="M2.5 2L17.5 9.5L10.5 12L7.5 19.5L2.5 2Z"
            fill={palette.light}
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="15" cy="17" r="2.2" fill="#FFFFFF" stroke="#050507" strokeWidth="1" />
        </svg>

        <svg
          ref={textIconRef}
          width="18"
          height="24"
          viewBox="0 0 18 24"
          fill="none"
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 -translate-x-[9px] -translate-y-[12px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] transition-[opacity,transform] duration-150"
        >
          <path
            d="M5 3H13M5 21H13M9 3V21"
            stroke="#050507"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d="M5 3H13M5 21H13M9 3V21"
            stroke="#38BDF8"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>

        <svg
          ref={eyeIconRef}
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 -translate-x-[13px] -translate-y-[13px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-[opacity,transform] duration-150"
        >
          <path
            d="M2.2 12C4.2 7.8 7.8 5.5 12 5.5C16.2 5.5 19.8 7.8 21.8 12C19.8 16.2 16.2 18.5 12 18.5C7.8 18.5 4.2 16.2 2.2 12Z"
            fill="#050507"
            stroke="#38BDF8"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="1.2" fill="#050507" />
        </svg>

        <svg
          ref={plusIconRef}
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 -translate-x-[13px] -translate-y-[13px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-[opacity,transform] duration-150"
        >
          <circle cx="12" cy="12" r="10" fill={palette.primary} stroke="#FFFFFF" strokeWidth="1.5" />
          <path
            d="M12 7.5V16.5M7.5 12H16.5"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>

        <svg
          ref={crosshairIconRef}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 -translate-x-[12px] -translate-y-[12px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] transition-[opacity,transform] duration-150"
        >
          <path
            d="M12 2V8M12 16V22M2 12H8M16 12H22"
            stroke="#050507"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path
            d="M12 2V8M12 16V22M2 12H8M16 12H22"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" stroke="#050507" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};

function computeTypeDurationMs(blockEl: HTMLElement): number {
  const lineEls = blockEl.querySelectorAll('[data-typed-line]');
  let totalChars = 0;
  lineEls.forEach((n) => {
    totalChars += Number(n.getAttribute('data-char-len') || 0);
  });
  const cloneSelectDelayMs = blockEl.getAttribute('data-clone-item') === 'true' ? 460 : 0;
  return cloneSelectDelayMs + Math.max(980, Math.min(2200, 480 + totalChars * 13));
}

export const DesignCanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { viewerControls } = usePortfolioContent();
  const accentPalette = computeAccentPalette(viewerControls.accentColor);
  const speedMultiplier =
    viewerControls.cursorSpeed === 'slow'
      ? 1.55
      : viewerControls.cursorSpeed === 'fast'
        ? 0.58
        : 1;
  const speedMultRef = useRef(speedMultiplier);
  speedMultRef.current = speedMultiplier;

  const [cursorsEnabled, setCursorsEnabled] = useState(
    () => viewerControls.enableCursorsByDefault
  );
  const [soundEnabled, setSoundEnabled] = useState(() => viewerControls.enableSoundByDefault);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      viewerControls.enableCursorsByDefault &&
      viewerControls.enableAutoScrollByDefault
    );
  });
  const [replayBuildKey, setReplayBuildKey] = useState(0);
  const [heroStep, setHeroStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 6;
    if (!viewerControls.enableCursorsByDefault) return 6;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 6;
    return window.scrollY > 110 ? 6 : 0;
  });

  const userTouchedCursorsRef = useRef(false);
  const userTouchedSoundRef = useRef(false);
  const userTouchedAutoScrollRef = useRef(false);

  const heroStepRef = useRef<number>(heroStep);
  heroStepRef.current = heroStep;
  const heroTimersRef = useRef<number[]>([]);
  const replayRequestedRef = useRef<boolean>(false);

  const heroStepStartedAtRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const blocksRef = useRef<Map<string, RegisteredBlock>>(new Map());
  const blockTimersRef = useRef<Map<string, number[]>>(new Map());
  const lastDispatchAtRef = useRef<number>(0);

  useEffect(() => {
    if (!userTouchedCursorsRef.current) {
      setCursorsEnabled(viewerControls.enableCursorsByDefault);
    }
    if (!userTouchedSoundRef.current) {
      setSoundEnabled(viewerControls.enableSoundByDefault);
      cursorAudio.setMuted(!viewerControls.enableSoundByDefault);
    }
    if (!userTouchedAutoScrollRef.current) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setAutoScrollEnabled(
        !prefersReduced &&
          viewerControls.enableCursorsByDefault &&
          viewerControls.enableAutoScrollByDefault
      );
    }
  }, [
    viewerControls.enableCursorsByDefault,
    viewerControls.enableSoundByDefault,
    viewerControls.enableAutoScrollByDefault,
  ]);

  const [buildProgress, setBuildProgress] = useState<BuildProgressState>({
    completed: 0,
    total: 0,
  });

  const syncBuildProgress = useCallback(() => {
    const blocks = Array.from(blocksRef.current.values());
    const completed = blocks.filter((b) => b.stage === 'done').length;
    const total = blocks.length;
    setBuildProgress((prev) =>
      prev.completed === completed && prev.total === total ? prev : { completed, total }
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlockOnce = () => {
      if (!cursorAudio.isMuted()) {
        cursorAudio.unlock();
      }
    };
    window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
    window.addEventListener('keydown', unlockOnce, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
  }, []);

  const clearHeroTimers = useCallback(() => {
    if (heroTimersRef.current.length > 0) {
      heroTimersRef.current.forEach((tid) => window.clearTimeout(tid));
      heroTimersRef.current = [];
    }
  }, []);

  const completeHeroImmediately = useCallback(() => {
    clearHeroTimers();
    if (heroStepRef.current < 6) {
      heroStepRef.current = 6;
      heroStepStartedAtRef.current = performance.now();
      setHeroStep(6);
    }
  }, [clearHeroTimers]);

  const clearBlockTimers = useCallback((id: string) => {
    const timers = blockTimersRef.current.get(id);
    if (timers) {
      timers.forEach((tid) => window.clearTimeout(tid));
      blockTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    clearHeroTimers();

    if (!cursorsEnabled || typeof window === 'undefined') {
      heroStepRef.current = 6;
      heroStepStartedAtRef.current = performance.now();
      setHeroStep(6);
      return;
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isReplay = replayRequestedRef.current;
    replayRequestedRef.current = false;

    if (prefersReduced || (!isReplay && window.scrollY > 110)) {
      heroStepRef.current = 6;
      heroStepStartedAtRef.current = performance.now();
      setHeroStep(6);
      return;
    }

    const advanceHero = (nextStep: number) => {
      heroStepRef.current = nextStep;
      heroStepStartedAtRef.current = performance.now();
      setHeroStep(nextStep);
    };

    advanceHero(0);

    const m = speedMultRef.current;
    const t1 = window.setTimeout(() => advanceHero(1), Math.round(900 * m));
    const t2 = window.setTimeout(() => advanceHero(2), Math.round(2000 * m));
    const t3 = window.setTimeout(() => advanceHero(3), Math.round(4250 * m));
    const t4 = window.setTimeout(() => advanceHero(4), Math.round(5600 * m));
    const t5 = window.setTimeout(() => advanceHero(5), Math.round(7000 * m));
    const t6 = window.setTimeout(() => advanceHero(6), Math.round(9400 * m));

    heroTimersRef.current = [t1, t2, t3, t4, t5, t6];

    return () => {
      clearHeroTimers();
    };
  }, [replayBuildKey, cursorsEnabled, clearHeroTimers]);

  useEffect(() => {
    if (typeof window === 'undefined' || !cursorsEnabled) return;

    const onManualScrollPastHero = () => {
      if (heroStepRef.current < 6 && window.scrollY > 110) {
        completeHeroImmediately();
      }
    };

    const onHashJump = () => {
      setAutoScrollEnabled(false);
      lastDispatchAtRef.current = 0;
      completeHeroImmediately();
    };

    window.addEventListener('scroll', onManualScrollPastHero, { passive: true });
    window.addEventListener('hashchange', onHashJump);
    return () => {
      window.removeEventListener('scroll', onManualScrollPastHero);
      window.removeEventListener('hashchange', onHashJump);
    };
  }, [cursorsEnabled, completeHeroImmediately]);

  const registerBlock = useCallback(
    (
      id: string,
      el: HTMLElement,
      setStage: (s: BlockStage) => void,
      meta?: RegisteredBlockMeta
    ) => {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const existing = blocksRef.current.get(id);
      const nextStage: BlockStage =
        existing?.stage ?? (cursorsEnabled && !prefersReduced ? 'hidden' : 'done');
      blocksRef.current.set(id, {
        id,
        el,
        inView: existing?.inView ?? false,
        stage: nextStage,
        stageStartedAt: existing?.stageStartedAt ?? 0,
        stageDurationMs: existing?.stageDurationMs ?? 900,
        slotLane: existing?.slotLane ?? null,
        cloneGroup: meta?.cloneGroup ?? existing?.cloneGroup,
        isCloneItem: Boolean(meta?.isCloneItem ?? existing?.isCloneItem),
        setStage,
      });
      setStage(nextStage);
      syncBuildProgress();
    },
    [cursorsEnabled, syncBuildProgress]
  );

  const unregisterBlock = useCallback(
    (id: string) => {
      clearBlockTimers(id);
      blocksRef.current.delete(id);
      syncBuildProgress();
    },
    [clearBlockTimers, syncBuildProgress]
  );

  const updateBlockInView = useCallback((id: string, inView: boolean) => {
    const rec = blocksRef.current.get(id);
    if (rec) {
      rec.inView = inView;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initialStage: BlockStage = !cursorsEnabled || prefersReduced ? 'done' : 'hidden';

    blocksRef.current.forEach((block, id) => {
      clearBlockTimers(id);
      block.stage = initialStage;
      block.slotLane = null;
      block.stageStartedAt = 0;
      block.setStage(initialStage);
    });
    lastDispatchAtRef.current = 0;
    syncBuildProgress();
  }, [cursorsEnabled, replayBuildKey, clearBlockTimers, syncBuildProgress]);

  // Strict Viewport-Visible Sequential Dispatcher:
  // Blocks wait at 'hidden' until comfortably inside the visible viewport;
  // dynamic type duration waits until EVERY line inside the block types out line-by-line!
  useEffect(() => {
    if (typeof window === 'undefined' || !cursorsEnabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dispatchBlock = (block: RegisteredBlock, lane: number) => {
      clearBlockTimers(block.id);
      const timers: number[] = [];
      const m = speedMultRef.current;

      const dLayout = Math.round((block.isCloneItem ? 880 : BASE_STAGE_DURATIONS['layout-drag']) * m);
      const typeDur = Math.round(computeTypeDurationMs(block.el) * m);
      const dResize = Math.round(BASE_STAGE_DURATIONS['resize-scale'] * m);
      const dColor = Math.round(BASE_STAGE_DURATIONS['style-color'] * m);
      const dDrop = Math.round((block.isCloneItem ? 440 : BASE_STAGE_DURATIONS['place-drop']) * m);

      const setBlockStage = (
        nextStage: BlockStage,
        durationMs = 0
      ) => {
        block.stage = nextStage;
        block.stageStartedAt = performance.now();
        block.stageDurationMs = durationMs;
        block.setStage(nextStage);
        if (nextStage === 'layout-drag') {
          cursorAudio.playLayoutOpen();
        } else if (nextStage === 'resize-scale') {
          cursorAudio.playResizeSweep();
        } else if (nextStage === 'style-color') {
          cursorAudio.playColorChime();
        } else if (nextStage === 'place-drop') {
          cursorAudio.playDropSnap();
        } else if (nextStage === 'done') {
          block.slotLane = null;
          syncBuildProgress();
        }
      };

      block.slotLane = lane;
      lastDispatchAtRef.current = performance.now();
      setBlockStage('layout-drag', dLayout);

      if (block.isCloneItem) {
        const d1 = dLayout;
        const d2 = d1 + typeDur;
        const d3 = d2 + dDrop;

        timers.push(window.setTimeout(() => setBlockStage('type-draft', typeDur), d1));
        timers.push(window.setTimeout(() => setBlockStage('place-drop', dDrop), d2));
        timers.push(window.setTimeout(() => setBlockStage('done', 0), d3));
      } else {
        const d1 = dLayout;
        const d2 = d1 + typeDur;
        const d3 = d2 + dResize;
        const d4 = d3 + dColor;
        const d5 = d4 + dDrop;

        timers.push(window.setTimeout(() => setBlockStage('type-draft', typeDur), d1));
        timers.push(window.setTimeout(() => setBlockStage('resize-scale', dResize), d2));
        timers.push(window.setTimeout(() => setBlockStage('style-color', dColor), d3));
        timers.push(window.setTimeout(() => setBlockStage('place-drop', dDrop), d4));
        timers.push(window.setTimeout(() => setBlockStage('done', 0), d5));
      }

      blockTimersRef.current.set(block.id, timers);
    };

    const scheduler = window.setInterval(() => {
      if (heroStepRef.current < 6) return;

      const now = performance.now();
      const m = speedMultRef.current;
      const vh = window.innerHeight;
      const maxConcurrent = window.innerWidth < 640 ? 3 : MAX_CONCURRENT_BLOCKS;
      const baseStagger = (window.innerWidth < 640 ? 340 : STAGGER_DISPATCH_MS) * m;
      const blocks = Array.from(blocksRef.current.values());

      // Watchdog & fast-scroll recovery:
      // 1) Force-finish any active block that exceeded its max duration or unmounted.
      // 2) If user flick-scrolled completely past an active block (>140px offscreen), release its lane immediately
      //    so new visible blocks at the destination never stall waiting on offscreen slots.
      let progressChanged = false;
      for (const b of blocks) {
        if (b.stage === 'hidden' || b.stage === 'done') continue;
        if (!b.el.isConnected) {
          clearBlockTimers(b.id);
          b.stage = 'done';
          b.slotLane = null;
          b.setStage('done');
          progressChanged = true;
          continue;
        }
        const elapsedStage = now - b.stageStartedAt;
        const maxAllowed = Math.max(4500, b.stageDurationMs + 2500);
        if (elapsedStage > maxAllowed) {
          clearBlockTimers(b.id);
          b.stage = 'done';
          b.slotLane = null;
          b.setStage('done');
          progressChanged = true;
          continue;
        }
        const rect = b.el.getBoundingClientRect();
        if (rect.bottom < -140 || rect.top > vh + 220) {
          clearBlockTimers(b.id);
          const resetToHidden = b.stage === 'layout-drag' && elapsedStage < 450;
          b.stage = resetToHidden ? 'hidden' : 'done';
          b.slotLane = null;
          b.stageStartedAt = 0;
          b.setStage(b.stage);
          if (!resetToHidden) {
            progressChanged = true;
          }
        }
      }
      if (progressChanged) {
        syncBuildProgress();
      }

      const activeBlocks = blocks.filter(
        (b) => b.stage !== 'hidden' && b.stage !== 'done'
      );

      const effectiveStagger = activeBlocks.some((b) => b.isCloneItem) ? 200 * m : baseStagger;

      if (activeBlocks.length >= maxConcurrent) return;
      if (activeBlocks.length > 0 && now - lastDispatchAtRef.current < effectiveStagger) {
        return;
      }

      // Strict Comfortable Viewport Gate + Template-First Clone Gating:
      // Duplicate cards (isCloneItem) NEVER start until Card #1 of their cloneGroup finishes!
      const topSafe = 68;
      const bottomSafe = vh - (vh < 700 ? 84 : 108);
      const atPageBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;

      const candidates = blocks
        .filter((b) => {
          if (b.stage !== 'hidden' || !b.el.isConnected) return false;
          if (b.isCloneItem && b.cloneGroup) {
            const templateBlock = blocks.find(
              (t) => t.el.isConnected && !t.isCloneItem && t.cloneGroup === b.cloneGroup
            );
            if (templateBlock && templateBlock.stage !== 'done') {
              const tr = templateBlock.el.getBoundingClientRect();
              const templateVisibleOrActive =
                templateBlock.stage !== 'hidden' || (tr.bottom > topSafe && tr.top < vh);
              if (templateVisibleOrActive) {
                return false;
              }
            }
          }
          const r = b.el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return false;
          if (atPageBottom) {
            return r.top < vh - 12 && r.bottom > topSafe;
          }
          const visiblePx = Math.min(bottomSafe, r.bottom) - Math.max(topSafe, r.top);
          const minVisibleRequired = Math.min(110, Math.max(36, r.height * 0.45));
          return r.top < vh * 0.78 && r.bottom > topSafe && visiblePx >= minVisibleRequired;
        })
        .map((b) => ({ block: b, rect: b.el.getBoundingClientRect() }))
        .sort((a, b) => {
          const rowDiff = a.rect.top - b.rect.top;
          if (Math.abs(rowDiff) > 48) return rowDiff;
          return a.rect.left - b.rect.left;
        });

      if (candidates.length === 0) return;

      const usedLanes = new Set(
        activeBlocks.map((b) => b.slotLane).filter((l): l is number => l !== null)
      );
      let freeLane = 0;
      while (usedLanes.has(freeLane) && freeLane < MAX_CONCURRENT_BLOCKS) {
        freeLane += 1;
      }

      dispatchBlock(candidates[0].block, freeLane);
    }, 120);

    return () => {
      window.clearInterval(scheduler);
      blockTimersRef.current.forEach((timers) => timers.forEach((tid) => window.clearTimeout(tid)));
      blockTimersRef.current.clear();
    };
  }, [cursorsEnabled, replayBuildKey, clearBlockTimers, syncBuildProgress]);

  const isAutoScrolling = cursorsEnabled && autoScrollEnabled && heroStep >= 6;

  useEffect(() => {
    if (!isAutoScrolling || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    let lastTime = performance.now();
    let exactY = window.scrollY;

    const pauseOnUserIntent = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('[data-autoscroll-control]')) {
        return;
      }
      setAutoScrollEnabled(false);
    };

    const pauseOnScrollKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'].includes(e.code)) {
        setAutoScrollEnabled(false);
      }
    };

    window.addEventListener('wheel', pauseOnUserIntent, { passive: true });
    window.addEventListener('touchstart', pauseOnUserIntent, { passive: true });
    window.addEventListener('pointerdown', pauseOnUserIntent, { passive: true });
    window.addEventListener('keydown', pauseOnScrollKey);

    const stepScroll = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const vh = window.innerHeight;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

      if (exactY >= maxScroll - 2) {
        setAutoScrollEnabled(false);
        return;
      }

      const topSafe = 68;
      const bottomSafe = vh - (vh < 700 ? 84 : 108);
      let activeCount = 0;
      let hasWaitingVisible = false;

      blocksRef.current.forEach((b) => {
        if (!b.el.isConnected) return;
        const r = b.el.getBoundingClientRect();
        if (b.stage !== 'hidden' && b.stage !== 'done') {
          activeCount += 1;
        } else if (b.stage === 'hidden' && r.width > 0 && r.height > 0) {
          const visiblePx = Math.min(bottomSafe, r.bottom) - Math.max(topSafe, r.top);
          const minVisibleRequired = Math.min(110, Math.max(36, r.height * 0.45));
          if (r.top < vh * 0.78 && r.bottom > topSafe && visiblePx >= minVisibleRequired) {
            hasWaitingVisible = true;
          }
        }
      });

      // Pause scrolling completely while visible sections finish building cleanly in view!
      const speedPxPerSec =
        hasWaitingVisible || activeCount > 0 ? 0 : Math.round(120 / speedMultRef.current);

      if (speedPxPerSec > 0) {
        exactY = Math.min(maxScroll, exactY + speedPxPerSec * dt);
        window.scrollTo({ top: exactY, behavior: 'instant' as ScrollBehavior });
      } else {
        exactY = window.scrollY;
      }

      rafId = window.requestAnimationFrame(stepScroll);
    };

    rafId = window.requestAnimationFrame(stepScroll);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', pauseOnUserIntent);
      window.removeEventListener('touchstart', pauseOnUserIntent);
      window.removeEventListener('pointerdown', pauseOnUserIntent);
      window.removeEventListener('keydown', pauseOnScrollKey);
    };
  }, [isAutoScrolling]);

  const toggleCursors = useCallback(() => {
    userTouchedCursorsRef.current = true;
    setCursorsEnabled((prev) => {
      const next = !prev;
      if (!next) setAutoScrollEnabled(false);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    userTouchedSoundRef.current = true;
    setSoundEnabled((prev) => {
      const next = !prev;
      cursorAudio.setMuted(!next);
      if (next) {
        cursorAudio.unlock();
        cursorAudio.playColorChime();
      }
      return next;
    });
  }, []);

  const toggleAutoScroll = useCallback(() => {
    userTouchedAutoScrollRef.current = true;
    setAutoScrollEnabled((prev) => {
      const next = !prev;
      if (next) {
        completeHeroImmediately();
      }
      return next;
    });
  }, [completeHeroImmediately]);

  const stopAutoScroll = useCallback(() => {
    userTouchedAutoScrollRef.current = true;
    setAutoScrollEnabled(false);
  }, []);

  const prepareSectionJump = useCallback(() => {
    setAutoScrollEnabled(false);
    lastDispatchAtRef.current = 0;
    completeHeroImmediately();
  }, [completeHeroImmediately]);

  const triggerReplay = useCallback(() => {
    clearHeroTimers();
    userTouchedCursorsRef.current = true;
    userTouchedAutoScrollRef.current = true;
    replayRequestedRef.current = true;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    heroStepStartedAtRef.current = performance.now();
    setCursorsEnabled(true);
    setAutoScrollEnabled(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setReplayBuildKey((k) => k + 1);
  }, [clearHeroTimers]);

  const skipHeroBuild = useCallback(() => {
    completeHeroImmediately();
  }, [completeHeroImmediately]);

  return (
    <DesignCanvasContext.Provider
      value={{
        cursorsEnabled,
        toggleCursors,
        soundEnabled,
        toggleSound,
        autoScrollEnabled,
        isAutoScrolling,
        toggleAutoScroll,
        stopAutoScroll,
        prepareSectionJump,
        replayBuildKey,
        triggerReplay,
        heroStep,
        skipHeroBuild,
        speedMultiplier,
        buildProgress,
        registerBlock,
        unregisterBlock,
        updateBlockInView,
      }}
    >
      {children}
      <CollaborativeCursorRosterOverlay
        active={cursorsEnabled}
        heroStep={heroStep}
        speedMultiplier={speedMultiplier}
        accentLightHex={accentPalette.light}
        heroStepStartedAtRef={heroStepStartedAtRef}
        blocksRef={blocksRef}
      />
      <MagneticCursorOverlay
        active={cursorsEnabled && heroStep >= 5}
        accentHex={viewerControls.accentColor}
      />
    </DesignCanvasContext.Provider>
  );
};

interface DesignBlockProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  delay?: number;
  slotIndex?: number;
  shape?: WireframeShape;
  cloneGroup?: string;
  isCloneItem?: boolean;
}

export const DesignBlock: React.FC<DesignBlockProps> = ({
  children,
  className = '',
  slotIndex = 0,
  shape = 'panel',
  cloneGroup,
  isCloneItem = false,
}) => {
  const reactId = useId();
  const {
    cursorsEnabled,
    speedMultiplier,
    registerBlock,
    unregisterBlock,
    updateBlockInView,
  } = useDesignCanvas();
  const blockRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<BlockStage>(() => {
    if (typeof window === 'undefined') return 'done';
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return cursorsEnabled && !prefersReduced ? 'hidden' : 'done';
  });
  const [isCloneHighlight, setIsCloneHighlight] = useState(false);
  const [clonePhase, setClonePhase] = useState<ClonePhase>('none');
  const [cloneDragOrigin, setCloneDragOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cloneDragStep, setCloneDragStep] = useState<'idle' | 'at-source' | 'dragging'>('idle');
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Measure Card #1 position so clone cards spawn AT Card #1 and physically get dragged to their destination slot
  useLayoutEffect(() => {
    if (!cursorsEnabled || !isCloneItem || stage !== 'layout-drag') {
      setCloneDragStep('idle');
      setCloneDragOrigin({ x: 0, y: 0 });
      return;
    }

    let dx = -36;
    let dy = -18;
    if (blockRef.current) {
      const dstRect = blockRef.current.getBoundingClientRect();
      const srcRect = findVisibleCloneSourceRect(cloneGroup, dstRect);
      if (srcRect) {
        dx = srcRect.left - dstRect.left;
        dy = srcRect.top - dstRect.top;
      } else if (typeof window !== 'undefined') {
        const vw = window.innerWidth;
        dx =
          dstRect.left > vw * 0.45
            ? -Math.min(180, Math.max(24, dstRect.left - 24))
            : Math.min(140, Math.max(0, vw - dstRect.right - 24));
        dy = Math.max(76 - dstRect.top, -120);
      }
    }

    setCloneDragOrigin({ x: dx, y: dy });
    setCloneDragStep('at-source');

    const startDragTimer = window.setTimeout(() => {
      setCloneDragStep('dragging');
    }, Math.round(220 * speedMultiplier));

    return () => window.clearTimeout(startDragTimer);
  }, [cursorsEnabled, isCloneItem, stage, cloneGroup, speedMultiplier]);

  // Sequential line-by-line typing registry & character progress inside this block
  const linesMapRef = useRef<Map<string, TypedLineRecord>>(new Map());
  const orderedLinesRef = useRef<Array<{ id: string; start: number; len: number }>>([]);
  const totalCharsRef = useRef<number>(0);
  const [charProgress, setCharProgress] = useState<number>(0);

  const rebuildLineOrder = useCallback(() => {
    const entries = Array.from(linesMapRef.current.values()).sort((a, b) => {
      if (a.el === b.el) return 0;
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    let offset = 0;
    const ordered: Array<{ id: string; start: number; len: number }> = [];
    for (const entry of entries) {
      ordered.push({ id: entry.id, start: offset, len: entry.len });
      offset += entry.len;
    }
    orderedLinesRef.current = ordered;
    totalCharsRef.current = offset;
  }, []);

  const registerTypedLine = useCallback(
    (id: string, el: HTMLElement, len: number) => {
      linesMapRef.current.set(id, { id, el, len });
      rebuildLineOrder();
    },
    [rebuildLineOrder]
  );

  const unregisterTypedLine = useCallback(
    (id: string) => {
      linesMapRef.current.delete(id);
      rebuildLineOrder();
    },
    [rebuildLineOrder]
  );

  const getLineSlice = useCallback((id: string, len: number) => {
    const ordered = orderedLinesRef.current;
    const idx = ordered.findIndex((item) => item.id === id);
    if (idx === -1) {
      return { visibleChars: len, isActiveLine: false };
    }
    const item = ordered[idx];
    const end = item.start + item.len;
    const isLast = idx === ordered.length - 1;
    const visibleChars = Math.max(0, Math.min(item.len, charProgress - item.start));
    const isActiveLine = isLast
      ? charProgress >= item.start
      : charProgress >= item.start && charProgress < end;
    return { visibleChars, isActiveLine };
  }, [charProgress]);

  // Run sequential character ticker + forward-only Copy-Paste -> Select-All -> Edit on cloned blocks
  useEffect(() => {
    if (!cursorsEnabled) {
      setIsCloneHighlight(false);
      setClonePhase('none');
      setCharProgress(totalCharsRef.current + 100);
      return;
    }

    if (stage === 'layout-drag') {
      if (isCloneItem) {
        // Show pasted duplicate of Card #1 immediately inside the #38BDF8 paste frame!
        setIsCloneHighlight(true);
        setClonePhase('pasted');
        setCharProgress(-1);
      } else {
        setIsCloneHighlight(false);
        setClonePhase('none');
        setCharProgress(0);
      }
      return;
    }

    if (stage !== 'type-draft') {
      setIsCloneHighlight(false);
      setClonePhase('none');
      if (stage === 'hidden') {
        setCharProgress(0);
      } else {
        setCharProgress(totalCharsRef.current + 100);
      }
      return;
    }

    rebuildLineOrder();
    const totalChars = Math.max(1, totalCharsRef.current);
    const arrivalLeadMs = Math.round(160 * speedMultiplier);
    const totalWindowMs =
      Math.max(980, Math.min(2200, 480 + totalChars * 13)) * 0.85 * speedMultiplier;
    const step = totalChars > 105 ? Math.ceil(totalChars / 78) : 1;
    const ticksNeeded = Math.ceil(totalChars / step);
    const intervalMs = Math.max(10, Math.floor(totalWindowMs / Math.max(1, ticksNeeded)));

    let intervalId: number | null = null;
    let cloneTimerId: number | null = null;

    const startTyping = () => {
      setIsCloneHighlight(false);
      setClonePhase('none');
      setCharProgress(0);
      intervalId = window.setInterval(() => {
        setCharProgress((prev) => {
          if (prev >= totalChars) {
            if (intervalId !== null) window.clearInterval(intervalId);
            return totalChars;
          }
          const next = Math.min(totalChars, prev + step);
          cursorAudio.playTypeTick(next);
          return next;
        });
      }, intervalMs);
    };

    if (isCloneItem) {
      setIsCloneHighlight(true);
      setClonePhase('selected');
      setCharProgress(-1);
      cloneTimerId = window.setTimeout(startTyping, Math.round(460 * speedMultiplier));
    } else {
      setIsCloneHighlight(false);
      setClonePhase('none');
      setCharProgress(0);
      cloneTimerId = window.setTimeout(startTyping, arrivalLeadMs);
    }

    return () => {
      if (cloneTimerId !== null) window.clearTimeout(cloneTimerId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [stage, cursorsEnabled, isCloneItem, speedMultiplier, rebuildLineOrder]);

  const scatter = useMemo(() => {
    let hash = slotIndex;
    for (let i = 0; i < reactId.length; i += 1) {
      hash = (hash * 31 + reactId.charCodeAt(i)) >>> 0;
    }
    return ORTHOGONAL_OFFSETS[hash % ORTHOGONAL_OFFSETS.length];
  }, [reactId, slotIndex]);

  useEffect(() => {
    const el = blockRef.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !cursorsEnabled) {
      setStage('done');
      return;
    }

    registerBlock(reactId, el, setStage, { cloneGroup, isCloneItem });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          updateBlockInView(reactId, entry.isIntersecting);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      unregisterBlock(reactId);
    };
  }, [reactId, cursorsEnabled, cloneGroup, isCloneItem, registerBlock, unregisterBlock, updateBlockInView]);

  const isHidden = cursorsEnabled && stage === 'hidden';
  const isLayoutDrag = cursorsEnabled && stage === 'layout-drag';
  const isTypeDraft = cursorsEnabled && stage === 'type-draft';
  const isResizeScale = cursorsEnabled && stage === 'resize-scale';
  const isStyleColor = cursorsEnabled && stage === 'style-color';
  const isPlaceDrop = cursorsEnabled && stage === 'place-drop';

  const isCloneAtSource = isCloneItem && isLayoutDrag && cloneDragStep === 'at-source';
  const isCloneDragging = isCloneItem && isLayoutDrag && cloneDragStep === 'dragging';

  const showSelectionBox =
    isLayoutDrag || isTypeDraft || isResizeScale || isStyleColor || isPlaceDrop;

  const targetScale = isCloneItem
    ? isHidden
      ? 0.96
      : isCloneAtSource
        ? 0.985
        : 1
    : isHidden || isLayoutDrag || isTypeDraft
      ? 0.94
      : 1;
  const targetX = isCloneAtSource ? cloneDragOrigin.x : 0;
  const targetY = isCloneAtSource
    ? cloneDragOrigin.y
    : isCloneItem
      ? isTypeDraft
        ? -2
        : 0
      : isHidden || isLayoutDrag || isTypeDraft
        ? isNarrow
          ? scatter.y * 0.65
          : scatter.y
        : isResizeScale || isStyleColor
          ? -4
          : 0;

  return (
    <DesignBlockStageContext.Provider
      value={{
        stage: cursorsEnabled ? stage : 'done',
        cursorsEnabled,
        isCloneHighlight,
        clonePhase,
        charProgress,
        registerTypedLine,
        unregisterTypedLine,
        getLineSlice,
      }}
    >
      <div
        ref={blockRef}
        data-clone-item={isCloneItem ? 'true' : undefined}
        data-clone-template={cloneGroup && !isCloneItem ? cloneGroup : undefined}
        data-clone-done={cloneGroup && stage === 'done' ? cloneGroup : undefined}
        className={`relative ${isCloneItem && isLayoutDrag ? 'z-20' : ''} ${className}`}
      >
        {(isResizeScale || isPlaceDrop) && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute top-0 -left-5 -right-5 h-px bg-accent-light/40" />
            <div className="absolute -top-5 -bottom-5 left-0 w-px bg-[#38BDF8]/40" />
            {isPlaceDrop && (
              <>
                <div className="absolute bottom-0 -left-5 -right-5 h-px bg-[#F59E0B]/45" />
                <div className="absolute -top-5 -bottom-5 right-0 w-px bg-[#F59E0B]/45" />
              </>
            )}
          </div>
        )}

        <motion.div
          ref={frameRef}
          data-block-frame="true"
          initial={false}
          animate={{
            opacity: isHidden ? 0 : isCloneAtSource ? 0.96 : 1,
            scale: targetScale,
            x: targetX,
            y: targetY,
            rotate: 0,
          }}
          transition={
            isCloneAtSource
              ? {
                  x: { duration: 0 },
                  y: { duration: 0 },
                  opacity: { duration: 0.14 * speedMultiplier },
                  scale: { duration: 0.14 * speedMultiplier },
                }
              : isCloneDragging
                ? {
                    x: { duration: 0.58 * speedMultiplier, ease: [0.22, 1, 0.36, 1] },
                    y: { duration: 0.58 * speedMultiplier, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.2 * speedMultiplier },
                    scale: { duration: 0.48 * speedMultiplier, ease: [0.22, 1, 0.36, 1] },
                  }
                : {
                    duration:
                      (isResizeScale ? 0.62 : isPlaceDrop ? 0.56 : 0.42) * speedMultiplier,
                    delay: (isResizeScale ? 0.14 : isPlaceDrop ? 0.1 : 0) * speedMultiplier,
                    ease: isResizeScale ? [0.22, 1, 0.36, 1] : [0.16, 1, 0.3, 1],
                  }
          }
          style={{ transformOrigin: 'top left' }}
          className="relative h-full"
        >
          {showSelectionBox && (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-20 rounded-xl border transition-colors duration-300 ${
                isResizeScale
                  ? 'border-accent-light/90 bg-transparent'
                  : isStyleColor
                    ? 'border-[#A855F7]/85 bg-transparent'
                    : isPlaceDrop
                      ? 'border-[#F59E0B]/95 bg-transparent shadow-[0_12px_30px_rgba(245,158,11,0.12)]'
                      : isCloneItem && isLayoutDrag
                        ? 'border-[#38BDF8] bg-[#38BDF8]/10 shadow-[0_14px_34px_rgba(56,189,248,0.22)]'
                        : isCloneItem && isTypeDraft
                          ? 'border-[#38BDF8]/90 bg-transparent'
                          : 'border-[#38BDF8]/85 bg-[#08101E]/40'
              }`}
            >
              <span className="absolute -top-1 -left-1 h-2 w-2 border border-current bg-white" />
              <span className="absolute -top-1 -right-1 h-2 w-2 border border-current bg-white" />
              <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-current bg-white" />
              <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-current bg-white" />

              {isCloneItem && isLayoutDrag && (
                <span className="absolute -top-5 left-2 rounded-[3px] bg-[#38BDF8] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#050507] shadow-[0_2px_8px_rgba(56,189,248,0.45)]">
                  COPY
                </span>
              )}

              {isResizeScale && (
                <ResizeDimensionBadge
                  targetRef={frameRef}
                  active={isResizeScale}
                  fromScaleX={0.92}
                  toScaleX={1}
                  fromScaleY={0.92}
                  toScaleY={1}
                  durationMs={Math.round(620 * speedMultiplier)}
                  delayMs={Math.round(140 * speedMultiplier)}
                />
              )}

              {isLayoutDrag && !isCloneItem && (
                <div className="flex h-full w-full flex-col justify-between overflow-hidden p-4 opacity-75">
                  {shape === 'card' && (
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div className="relative aspect-video w-full overflow-hidden border border-[#38BDF8]/55 bg-[#0D1A2D]/55">
                        <svg
                          viewBox="0 0 100 56"
                          preserveAspectRatio="none"
                          className="h-full w-full stroke-[#38BDF8]/30"
                          fill="none"
                        >
                          <line x1="0" y1="0" x2="100" y2="56" strokeWidth="0.6" />
                          <line x1="100" y1="0" x2="0" y2="56" strokeWidth="0.6" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3.5 w-2/3 border border-[#38BDF8]/50 bg-[#38BDF8]/10" />
                        <div className="h-2.5 w-1/2 border border-[#38BDF8]/35" />
                      </div>
                    </div>
                  )}
                  {shape === 'image' && (
                    <div className="relative h-full w-full overflow-hidden border border-[#38BDF8]/55 bg-[#0D1A2D]/45">
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="h-full w-full stroke-[#38BDF8]/30"
                        fill="none"
                      >
                        <line x1="0" y1="0" x2="100" y2="100" strokeWidth="0.5" />
                        <line x1="100" y1="0" x2="0" y2="100" strokeWidth="0.5" />
                      </svg>
                    </div>
                  )}
                  {shape === 'row' && (
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((r) => (
                        <div key={r} className="h-5 w-full border-b border-[#38BDF8]/40" />
                      ))}
                    </div>
                  )}
                  {(shape === 'panel' || shape === 'metrics' || shape === 'navbar') && (
                    <div className="space-y-2.5">
                      <div className="h-3 w-1/3 border border-[#38BDF8]/45 bg-[#38BDF8]/12" />
                      <div className="h-6 w-3/4 border border-[#38BDF8]/40" />
                      <div className="h-3 w-1/2 border border-[#38BDF8]/30" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div
            className={`relative h-full transition-[opacity,filter] duration-350 ${
              isHidden || (isLayoutDrag && !isCloneItem) ? 'opacity-0' : 'opacity-100'
            }`}
            style={{
              filter:
                !isCloneItem && (isTypeDraft || isResizeScale)
                  ? 'grayscale(1) contrast(0.92)'
                  : 'grayscale(0) contrast(1)',
            }}
          >
            {children}

            {isStyleColor && (
              <motion.div
                aria-hidden="true"
                initial={{ left: '0%', opacity: 0.9 }}
                animate={{ left: '100%', opacity: 0 }}
                transition={{ duration: 0.62 * speedMultiplier, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-y-0 z-20 w-10 bg-gradient-to-r from-[#A855F7]/30 via-accent/35 to-transparent blur-[2px]"
              />
            )}
          </div>
        </motion.div>
      </div>
    </DesignBlockStageContext.Provider>
  );
};
