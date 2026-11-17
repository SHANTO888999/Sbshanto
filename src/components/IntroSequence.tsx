import React from 'react';
import {
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { useDesignCanvas } from './DesignCursorSystem';

export const IntroSequence: React.FC = () => {
  const { viewerControls } = usePortfolioContent();
  const {
    heroStep,
    cursorsEnabled,
    toggleCursors,
    soundEnabled,
    toggleSound,
    skipHeroBuild,
    isAutoScrolling,
    toggleAutoScroll,
    triggerReplay,
    buildProgress,
  } = useDesignCanvas();

  if (!viewerControls.showBottomHud) return null;

  const isIntroBuilding = cursorsEnabled && heroStep < 6;
  const totalBlocks = Math.max(1, buildProgress.total);
  const completedBlocks = Math.min(totalBlocks, buildProgress.completed);
  const allBlocksDone =
    !isIntroBuilding && buildProgress.total > 0 && completedBlocks >= totalBlocks;

  const progressRatio = isIntroBuilding
    ? Math.max(0.05, (heroStep / 6) * 0.25)
    : 0.25 + (completedBlocks / totalBlocks) * 0.75;

  const progressPct = Math.round(progressRatio * 100);

  const showProgress = cursorsEnabled && viewerControls.showHudProgress;
  const showCursorsBtn = viewerControls.showHudCursors;
  const showAutoScrollBtn = cursorsEnabled && viewerControls.showHudAutoScroll;
  const showReplayBtn =
    cursorsEnabled &&
    viewerControls.showHudReplay &&
    !isIntroBuilding &&
    (allBlocksDone || !isAutoScrolling || !viewerControls.showHudAutoScroll);
  const showSoundBtn = cursorsEnabled && viewerControls.showHudSound;

  const hasActions = showCursorsBtn || showAutoScrollBtn || showReplayBtn || showSoundBtn;

  if (!showProgress && !hasActions) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 sm:bottom-5"
      data-autoscroll-control
    >
      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0B0F]/92 px-2.5 py-2 text-xs shadow-[0_14px_40px_rgba(0,0,0,0.75)] backdrop-blur-md sm:gap-2.5 sm:px-3">
        {showProgress && (
          <>
            {/* Stacked multi-cursor palette indicator (non-pulsing, authentic to role colors) */}
            <div className="hidden items-center -space-x-1 sm:flex" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-[#38BDF8]" />
              <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-white" />
              <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-accent-light" />
              <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-[#F59E0B]" />
            </div>

            {/* Real progress label + colorful gradient track */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="font-mono text-[11px] font-medium text-zinc-200 tabular-nums whitespace-nowrap">
                {isIntroBuilding
                  ? 'Building...'
                  : allBlocksDone
                    ? `${totalBlocks} / ${totalBlocks} built`
                    : `${completedBlocks} / ${totalBlocks} built`}
              </span>

              <div
                className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10 sm:w-28"
                role="progressbar"
                aria-label="Page build progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[var(--accent-light)] to-[#F59E0B] transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </>
        )}

        {showProgress && hasActions && (
          <div className="h-4 w-px bg-white/10" aria-hidden="true" />
        )}

        {hasActions && (
          <div className="flex items-center gap-1.5">
            {showCursorsBtn && (
              <button
                type="button"
                onClick={toggleCursors}
                aria-label={
                  cursorsEnabled ? 'Turn off live design cursors' : 'Turn on live design cursors'
                }
                aria-pressed={cursorsEnabled}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  cursorsEnabled
                    ? 'border-[#38BDF8]/55 bg-[#38BDF8]/15 text-blue-200 hover:bg-[#38BDF8]/25'
                    : 'border-white/15 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white'
                }`}
              >
                <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className={cursorsEnabled ? 'hidden sm:inline' : 'inline'}>
                  Cursors {cursorsEnabled ? 'On' : 'Off'}
                </span>
              </button>
            )}

            {showAutoScrollBtn &&
              (isIntroBuilding ? (
                <button
                  type="button"
                  onClick={skipHeroBuild}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white whitespace-nowrap"
                >
                  <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Skip</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleAutoScroll}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    isAutoScrolling
                      ? 'border-accent/65 bg-accent/20 text-white hover:bg-accent/35'
                      : 'border-white/15 bg-white/5 text-zinc-200 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {isAutoScrolling ? (
                    <>
                      <Pause className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                      <span>Play</span>
                    </>
                  )}
                </button>
              ))}

            {showReplayBtn && (
              <button
                type="button"
                onClick={triggerReplay}
                aria-label="Replay cursor construction"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Replay</span>
              </button>
            )}

            {showSoundBtn && (
              <button
                type="button"
                onClick={toggleSound}
                aria-label={soundEnabled ? 'Mute cursor sound effects' : 'Enable cursor sound effects'}
                aria-pressed={soundEnabled}
                className={`inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                  soundEnabled
                    ? 'border-white/20 bg-white/5 text-zinc-200 hover:border-white/35 hover:text-white'
                    : 'border-white/10 bg-transparent text-zinc-500 hover:border-white/25 hover:text-zinc-300'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
