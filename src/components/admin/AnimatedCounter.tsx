import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  durationMs?: number;
}

/**
 * Smoothly animates integer transitions via requestAnimationFrame and flashes a subtle highlight pulse
 * whenever a real-time Firestore counter ticks upward without requiring page refresh.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  className = '',
  durationMs = 540,
}) => {
  const safeTarget = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const [displayed, setDisplayed] = useState(safeTarget);
  const [pulseUp, setPulseUp] = useState(false);
  const prevTargetRef = useRef(safeTarget);
  const currentRenderedRef = useRef(safeTarget);

  useEffect(() => {
    const startVal = currentRenderedRef.current;
    const endVal = safeTarget;

    if (endVal > prevTargetRef.current) {
      setPulseUp(true);
      const clearPulse = window.setTimeout(() => setPulseUp(false), 900);
      prevTargetRef.current = endVal;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        currentRenderedRef.current = endVal;
        setDisplayed(endVal);
        return () => window.clearTimeout(clearPulse);
      }
      const startTime = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = Math.round(startVal + (endVal - startVal) * eased);
        currentRenderedRef.current = next;
        setDisplayed(next);
        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(clearPulse);
      };
    }

    prevTargetRef.current = endVal;
    if (startVal === endVal) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      currentRenderedRef.current = endVal;
      setDisplayed(endVal);
      return;
    }

    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startVal + (endVal - startVal) * eased);
      currentRenderedRef.current = next;
      setDisplayed(next);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [safeTarget, durationMs]);

  return (
    <span
      className={`inline-block tabular-nums transition-all duration-300 ${
        pulseUp ? 'scale-105 text-emerald-300' : ''
      } ${className}`}
    >
      {displayed.toLocaleString()}
    </span>
  );
};
