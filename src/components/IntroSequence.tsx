import React from 'react';
import { Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useDesignCanvas } from './DesignCursorSystem';

export const IntroSequence: React.FC = () => {
  const {
    heroStep,
    cursorsEnabled,
    soundEnabled,
    toggleSound,
    skipHeroBuild,
    isAutoScrolling,
    toggleAutoScroll,
    triggerReplay,
    buildProgress,
  } = useDesignCanvas();

  if (!cursorsEnabled) return null;

  const isIntroBuilding = heroStep < 6;
  const totalBlocks = Math.max(1, buildProgress.total);
  const completedBlocks = Math.min(totalBlocks, buildProgress.completed);
  const allBlocksDone = !isIntroBuilding && buildProgress.total > 0 && completedBlocks >= totalBlocks;

  // Compute smooth percentage across Hero intro (0..25%) and Page section blocks (25..100%)
  const progressRatio = isIntroBuilding
    ? Math.max(0.05, (heroStep / 6) * 0.25)
    : 0.25 + (completedBlocks / totalBlocks) * 0.75;

  const progressPct = Math.round(progressRatio * 100);

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 sm:bottom-5"
      data-autoscroll-control
    >
      <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-[#0A0B0F]/92 px-3 py-2 text-xs shadow-[0_14px_40px_rgba(0,0,0,0.75)] backdrop-blur-md">
        {/* Stacked multi-cursor palette indicator (non-pulsing, authentic to role colors) */}
        <div className="hidden items-center -space-x-1 sm:flex" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-[#38BDF8]" />
          <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-white" />
          <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-[#EF4444]" />
          <span className="h-2.5 w-2.5 rounded-full border border-[#0A0B0F] bg-[#F59E0B]" />
        </div>

        {/* Real progress label + track */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-medium text-zinc-200 tabular-nums whitespace-nowrap">
            {isIntroBuilding
              ? 'Building page...'
              : allBlocksDone
                ? `${totalBlocks} / ${totalBlocks} built`
                : `${completedBlocks} / ${totalBlocks} built`}
          </span>

          <div
            className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:w-28"
            role="progressbar"
            aria-label="Page build progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#EF4444] to-[#F59E0B] transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="h-4 w-px bg-white/10" aria-hidden="true" />

        {/* Real interactive actions */}
        <div className="flex items-center gap-1.5">
          {isIntroBuilding ? (
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
                  ? 'border-[#DC2626]/65 bg-[#DC2626]/20 text-white hover:bg-[#DC2626]/35'
                  : 'border-white/15 bg-white/5 text-zinc-200 hover:border-white/30 hover:text-white'
              }`}
            >
              {isAutoScrolling ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>
          )}

          {(!isIntroBuilding && (allBlocksDone || !isAutoScrolling)) && (
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
        </div>
      </div>
    </div>
  );
};
