import React from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
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
  } = useDesignCanvas();

  if (!cursorsEnabled) return null;

  const soundButton = (
    <button
      type="button"
      onClick={toggleSound}
      aria-label={soundEnabled ? 'Mute cursor sound effects' : 'Enable cursor sound effects'}
      aria-pressed={soundEnabled}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium backdrop-blur-md transition-colors ${
        soundEnabled
          ? 'border-white/20 bg-[#0B0B0E]/90 text-zinc-200 hover:border-white/35 hover:text-white'
          : 'border-white/10 bg-[#0B0B0E]/90 text-zinc-500 hover:border-white/25 hover:text-zinc-300'
      }`}
    >
      {soundEnabled ? (
        <Volume2 className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
      ) : (
        <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
    </button>
  );

  if (heroStep < 6) {
    return (
      <div
        className="fixed right-4 bottom-4 z-50 flex items-center gap-2 sm:right-5 sm:bottom-5"
        data-autoscroll-control
      >
        {soundButton}
        <button
          type="button"
          onClick={skipHeroBuild}
          className="rounded-md border border-white/15 bg-[#0B0B0E]/90 px-3.5 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
        >
          Skip Intro
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed right-4 bottom-4 z-50 flex items-center gap-2 sm:right-5 sm:bottom-5"
      data-autoscroll-control
    >
      {soundButton}
      <button
        type="button"
        onClick={toggleAutoScroll}
        className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium backdrop-blur-md transition-colors ${
          isAutoScrolling
            ? 'border-[#DC2626]/60 bg-[#140709]/90 text-white hover:bg-[#DC2626]/30'
            : 'border-white/15 bg-[#0B0B0E]/90 text-zinc-300 hover:border-white/30 hover:text-white'
        }`}
      >
        {isAutoScrolling ? (
          <>
            <Pause className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
            <span>Pause Auto-Scroll</span>
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Auto-Scroll Build</span>
          </>
        )}
      </button>
    </div>
  );
};
