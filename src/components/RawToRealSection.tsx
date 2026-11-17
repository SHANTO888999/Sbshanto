import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { computeAccentPalette } from '../utils/themeAccent';
import { DesignBlock, TypedText } from './DesignCursorSystem';

interface RawToRealSectionProps {
  selectedSceneId?: string;
  onSelectedSceneChange?: (id: string) => void;
}

export const RawToRealSection: React.FC<RawToRealSectionProps> = ({
  selectedSceneId: controlledSelectedId,
  onSelectedSceneChange,
}) => {
  const { wireframeScenes, viewerControls } = usePortfolioContent();
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    () => wireframeScenes[0]?.id ?? ''
  );
  const selectedId = controlledSelectedId ?? internalSelectedId;
  const setSelectedId = (next: string) => {
    setInternalSelectedId(next);
    onSelectedSceneChange?.(next);
  };
  const selectedScene =
    wireframeScenes.find((s) => s.id === selectedId) ?? wireframeScenes[0];
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wireframeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wireCanvas = wireframeCanvasRef.current;
    const liveCanvas = liveCanvasRef.current;
    if (!wireCanvas || !liveCanvas) return;

    const wCtx = wireCanvas.getContext('2d');
    const lCtx = liveCanvas.getContext('2d');
    if (!wCtx || !lCtx) return;

    const width = 960;
    const height = 540;
    wireCanvas.width = width;
    wireCanvas.height = height;
    liveCanvas.width = width;
    liveCanvas.height = height;

    let animId = 0;
    let tick = 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const accent = computeAccentPalette(viewerControls.accentColor);
    const accentGlowRgba = (alpha: number) => `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`;

    const renderFrames = (t: number) => {
      // 1. LEFT LAYER: FIGMA WIREFRAME / GREYBOX BLUEPRINT
      wCtx.clearRect(0, 0, width, height);
      wCtx.fillStyle = '#0B0D12';
      wCtx.fillRect(0, 0, width, height);

      // Blueprint Grid Lines
      wCtx.strokeStyle = 'rgba(59, 130, 246, 0.14)';
      wCtx.lineWidth = 1;
      for (let x = 0; x < width; x += 48) {
        wCtx.beginPath();
        wCtx.moveTo(x, 0);
        wCtx.lineTo(x, height);
        wCtx.stroke();
      }
      for (let y = 0; y < height; y += 48) {
        wCtx.beginPath();
        wCtx.moveTo(0, y);
        wCtx.lineTo(width, y);
        wCtx.stroke();
      }

      if (selectedScene.theme === 'web-build') {
        // Wireframe Website Boxes & Corner Handles
        const rects = [
          [72, 62, 816, 48],
          [72, 138, 420, 260],
          [520, 138, 368, 260],
          [72, 426, 256, 62],
          [352, 426, 256, 62],
          [632, 426, 256, 62],
        ];
        wCtx.strokeStyle = '#3B82F6';
        wCtx.lineWidth = 1.5;
        rects.forEach(([rx, ry, rw, rh]) => {
          wCtx.strokeRect(rx, ry, rw, rh);
          wCtx.fillStyle = 'rgba(59, 130, 246, 0.06)';
          wCtx.fillRect(rx, ry, rw, rh);
          // Corner handles
          wCtx.fillStyle = '#FFFFFF';
          wCtx.fillRect(rx - 3, ry - 3, 6, 6);
          wCtx.fillRect(rx + rw - 3, ry - 3, 6, 6);
          wCtx.fillRect(rx - 3, ry + rh - 3, 6, 6);
          wCtx.fillRect(rx + rw - 3, ry + rh - 3, 6, 6);
        });
      } else if (selectedScene.theme === 'app-ui') {
        // Application Component Tree Wireframe
        wCtx.strokeStyle = '#3B82F6';
        wCtx.lineWidth = 1.5;
        wCtx.strokeRect(64, 56, 180, 428);
        wCtx.strokeRect(272, 56, 624, 96);
        wCtx.strokeRect(272, 176, 300, 308);
        wCtx.strokeRect(596, 176, 300, 308);

        wCtx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        wCtx.fillRect(272, 56, 624, 96);
      } else {
        // Greybox Collision Mesh & Hitboxes
        wCtx.strokeStyle = '#38BDF8';
        wCtx.lineWidth = 1.5;
        for (let i = -5; i <= 5; i++) {
          wCtx.beginPath();
          wCtx.moveTo(width / 2 + i * 65, 160);
          wCtx.lineTo(width / 2 + i * 145, height);
          wCtx.stroke();
        }
        // Hitbox wireframes
        wCtx.strokeStyle = '#22C55E';
        wCtx.strokeRect(420, 250, 120, 150);
        wCtx.strokeStyle = '#F59E0B';
        wCtx.strokeRect(220, 290, 86, 110);
        wCtx.strokeRect(650, 280, 94, 120);
      }

      // Animated Wireframe Cursor inside Left Frame
      const wx = 380 + Math.sin(t * 0.03) * 110;
      const wy = 230 + Math.cos(t * 0.035) * 70;
      wCtx.fillStyle = '#FFFFFF';
      wCtx.beginPath();
      wCtx.moveTo(wx, wy);
      wCtx.lineTo(wx + 14, wy + 7);
      wCtx.lineTo(wx + 7, wy + 10);
      wCtx.lineTo(wx + 5, wy + 18);
      wCtx.closePath();
      wCtx.fill();

      // 2. RIGHT LAYER: LIVE COMPILED PRODUCT / PLAYABLE BUILD
      lCtx.clearRect(0, 0, width, height);
      lCtx.fillStyle = '#08080B';
      lCtx.fillRect(0, 0, width, height);

      if (selectedScene.theme === 'web-build') {
        // Rendered Brand Accent & Obsidian Website UI
        lCtx.fillStyle = '#111116';
        lCtx.fillRect(72, 62, 816, 48);
        lCtx.fillStyle = accent.primary;
        lCtx.fillRect(804, 72, 68, 28);
        lCtx.fillStyle = '#FFFFFF';
        lCtx.fillRect(92, 78, 92, 14);

        // Hero Copy + Live Portrait Stage
        lCtx.fillStyle = '#FFFFFF';
        lCtx.fillRect(72, 164, 290, 34);
        lCtx.fillStyle = accent.primary;
        lCtx.fillRect(72, 212, 210, 22);
        lCtx.fillStyle = '#71717A';
        lCtx.fillRect(72, 254, 340, 12);
        lCtx.fillRect(72, 276, 290, 12);
        lCtx.fillStyle = accent.primary;
        lCtx.fillRect(72, 318, 138, 38);

        const glow = lCtx.createRadialGradient(700, 260, 10, 700, 260, 200);
        glow.addColorStop(0, accentGlowRgba(0.48));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        lCtx.fillStyle = glow;
        lCtx.fillRect(520, 138, 368, 260);
        lCtx.strokeStyle = 'rgba(255,255,255,0.18)';
        lCtx.strokeRect(520, 138, 368, 260);

        // Feature cards bottom
        [72, 352, 632].forEach((bx) => {
          lCtx.fillStyle = '#121218';
          lCtx.fillRect(bx, 426, 256, 62);
          lCtx.fillStyle = accent.primary;
          lCtx.fillRect(bx + 16, 444, 48, 8);
          lCtx.fillStyle = '#E4E4E7';
          lCtx.fillRect(bx + 16, 462, 140, 8);
        });
      } else if (selectedScene.theme === 'app-ui') {
        // Rendered Live Dark Application Dashboard
        lCtx.fillStyle = '#111116';
        lCtx.fillRect(64, 56, 180, 428);
        for (let i = 0; i < 6; i++) {
          lCtx.fillStyle = i === 0 ? accent.primary : '#27272A';
          lCtx.fillRect(84, 88 + i * 44, 140, 24);
        }

        lCtx.fillStyle = '#14141B';
        lCtx.fillRect(272, 56, 624, 96);
        lCtx.fillStyle = '#FFFFFF';
        lCtx.fillRect(298, 82, 190, 20);
        lCtx.fillStyle = '#22C55E';
        lCtx.fillRect(298, 114, 90, 10);

        // Animated Live Chart Bars
        lCtx.fillStyle = '#121218';
        lCtx.fillRect(272, 176, 300, 308);
        for (let b = 0; b < 7; b++) {
          const bh = 60 + Math.abs(Math.sin(t * 0.04 + b)) * 140;
          lCtx.fillStyle = b === 5 ? accent.primary : '#3F3F46';
          lCtx.fillRect(300 + b * 36, 446 - bh, 22, bh);
        }

        // Right Active Tasks Panel
        lCtx.fillStyle = '#121218';
        lCtx.fillRect(596, 176, 300, 308);
        for (let r = 0; r < 4; r++) {
          lCtx.fillStyle = '#1B1B24';
          lCtx.fillRect(618, 204 + r * 64, 256, 48);
          lCtx.fillStyle = accent.primary;
          lCtx.fillRect(632, 222 + r * 64, 14, 14);
          lCtx.fillStyle = '#E4E4E7';
          lCtx.fillRect(660, 224 + r * 64, 160, 10);
        }
      } else {
        // Rendered Playable Shaded Game World
        const bg = lCtx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, 460);
        bg.addColorStop(0, accentGlowRgba(0.32));
        bg.addColorStop(0.55, '#0F0B12');
        bg.addColorStop(1, '#060609');
        lCtx.fillStyle = bg;
        lCtx.fillRect(0, 0, width, height);

        // Perspective Lit Arena Floor
        lCtx.strokeStyle = accentGlowRgba(0.38);
        lCtx.lineWidth = 1.5;
        for (let i = -5; i <= 5; i++) {
          lCtx.beginPath();
          lCtx.moveTo(width / 2 + i * 65, 160);
          lCtx.lineTo(width / 2 + i * 145, height);
          lCtx.stroke();
        }

        // Glowing Player Character & Energy Slash
        const glow = lCtx.createRadialGradient(480, 325, 8, 480, 325, 120);
        glow.addColorStop(0, accentGlowRgba(0.85));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        lCtx.fillStyle = glow;
        lCtx.fillRect(340, 190, 280, 260);

        lCtx.fillStyle = '#FFFFFF';
        lCtx.fillRect(464, 276, 32, 86);
        lCtx.strokeStyle = accent.light;
        lCtx.lineWidth = 4;
        lCtx.beginPath();
        lCtx.arc(480, 318, 64, -0.7 + Math.sin(t * 0.08) * 0.4, 0.9 + Math.sin(t * 0.08) * 0.4);
        lCtx.stroke();

        // Floating Particles
        for (let p = 0; p < 36; p++) {
          const px = (Math.sin(p * 11.2 + t * 0.018) * 0.46 + 0.5) * width;
          const py = ((height - ((p * 37 + t * 2.2) % height)) + height) % height;
          lCtx.fillStyle = p % 2 === 0 ? 'rgba(251, 146, 60, 0.8)' : accentGlowRgba(0.82);
          lCtx.fillRect(px, py, 3, 3);
        }
      }
    };

    renderFrames(tick);

    if (!prefersReduced) {
      const loop = () => {
        tick += 1;
        renderFrames(tick);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [selectedScene, viewerControls.accentColor]);

  const updatePositionFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.max(4, Math.min(96, rawPct)));
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => updatePositionFromClientX(e.clientX);
    const onUp = () => setIsDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging]);

  return (
    <section id="process" className="border-b border-white/10 bg-[#0A0A0D] py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Explanation & Mode Controls */}
          <DesignBlock shape="panel" slotIndex={0} label="Section / Wireframe To Product" className="lg:col-span-5">
            <p className="text-xs font-medium text-zinc-400">
              <TypedText text="Interactive Build Process" />
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl [text-wrap:balance]">
              <TypedText
                text="FROM WIREFRAME."
                accentText="TO LIVE PRODUCT."
                accentBreak
                accentClassName="text-accent"
              />
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-zinc-300 sm:text-base">
              <TypedText
                text="Drag the accent handle across the viewport to inspect how raw layout wireframes and greybox game prototypes transform into finished, high-performance builds."
              />
            </p>

            {/* Scene Selector */}
            <div className="mt-6 space-y-2">
              {wireframeScenes.map((scene) => {
                const active = selectedScene.id === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setSelectedId(scene.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      active
                        ? 'border-accent bg-accent/12 text-white'
                        : 'border-white/10 bg-[#111115] text-zinc-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <div className="text-sm font-semibold">
                      <TypedText text={scene.label} />
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-zinc-400">
                      <TypedText text={scene.specs} />
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-5 text-xs leading-relaxed text-zinc-400">
              <TypedText text={selectedScene.notes} />
            </p>
          </DesignBlock>

          {/* Right Column: Interactive Split Comparison Viewport */}
          <DesignBlock shape="image" slotIndex={1} label="Split Inspector Viewport" delay={180} className="lg:col-span-7">
            <div
              ref={containerRef}
              data-cursor="eye"
              onPointerDown={(e) => {
                setIsDragging(true);
                updatePositionFromClientX(e.clientX);
              }}
              className="relative aspect-video w-full cursor-ew-resize select-none overflow-hidden rounded-2xl border border-white/15 bg-[#08080A] touch-none"
            >
              {/* Base Layer: Compiled Product */}
              <canvas
                ref={liveCanvasRef}
                className="block h-full w-full object-cover"
                aria-label="Compiled live product view"
              />

              {/* Clipped Top Layer: Blueprint Wireframe */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
              >
                <canvas
                  ref={wireframeCanvasRef}
                  className="block h-full w-full object-cover"
                  aria-label="Wireframe blueprint view"
                />
              </div>

              <span className="pointer-events-none absolute top-4 left-4 rounded bg-[#3B82F6]/90 px-2.5 py-1 font-mono text-[11px] font-medium text-white">
                WIREFRAME / GREYBOX
              </span>
              <span className="pointer-events-none absolute top-4 right-4 rounded bg-accent/90 px-2.5 py-1 font-mono text-[11px] font-medium text-white">
                SHIPPED BUILD
              </span>

              {/* Draggable Accent Divider */}
              <div
                role="slider"
                tabIndex={0}
                aria-label="Wireframe to live build split position"
                aria-valuemin={4}
                aria-valuemax={96}
                aria-valuenow={Math.round(splitPercent)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') setSplitPercent((p) => Math.max(4, p - 4));
                  if (e.key === 'ArrowRight') setSplitPercent((p) => Math.min(96, p + 4));
                }}
                style={{ left: `${splitPercent}%` }}
                className="absolute inset-y-0 -translate-x-1/2 flex items-center justify-center focus-visible:outline-none"
              >
                <div
                  className="h-full w-0.5 bg-accent-light"
                  style={{ boxShadow: '0 0 12px rgba(var(--accent-rgb), 0.8)' }}
                />
                <div className="absolute flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-accent text-white shadow-lg">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[
                  { label: 'Wireframe 100%', value: 94 },
                  { label: '50 / 50 Split', value: 50 },
                  { label: 'Live Build 100%', value: 6 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSplitPercent(preset.value)}
                    className="rounded-md border border-white/10 bg-[#111115] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                Split: {Math.round(splitPercent)}%
              </span>
            </div>
          </DesignBlock>
        </div>
      </div>
    </section>
  );
};
