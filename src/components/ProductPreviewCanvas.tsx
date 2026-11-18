import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ACCENT_COLOR,
  isVideoMediaSource,
  type PreviewTheme,
} from '../data/contentSchema';
import { computeAccentPalette } from '../utils/themeAccent';

interface ProductPreviewCanvasProps {
  theme: PreviewTheme;
  coverImageUrl?: string;
  galleryUrls?: string[];
  coverMediaType?: 'image' | 'video';
  title?: string;
  isAnimating?: boolean;
  controlPlayback?: boolean;
  activeSlideIndex?: number;
  onSlideChange?: (idx: number) => void;
  showSlideBadge?: boolean;
  accentColor?: string;
  className?: string;
}

export const ProductPreviewCanvas: React.FC<ProductPreviewCanvasProps> = ({
  theme,
  coverImageUrl,
  galleryUrls,
  coverMediaType,
  title = 'Project preview',
  isAnimating = false,
  controlPlayback = false,
  activeSlideIndex,
  onSlideChange,
  showSlideBadge = true,
  accentColor,
  className = '',
}) => {
  const effectiveAccentColor =
    accentColor ??
    (typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() ||
        DEFAULT_ACCENT_COLOR
      : DEFAULT_ACCENT_COLOR);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [internalSlideIdx, setInternalSlideIdx] = useState(0);

  const isExplicitVideo = Boolean(
    coverImageUrl && isVideoMediaSource(coverImageUrl, coverMediaType) && !failedUrls[coverImageUrl]
  );

  const imageSlides = useMemo(() => {
    if (isExplicitVideo) return [];
    const merged: string[] = [];
    const seen = new Set<string>();
    const candidates = [
      ...(Array.isArray(galleryUrls) ? galleryUrls : []),
      ...(coverImageUrl ? [coverImageUrl] : []),
    ];
    for (const url of candidates) {
      const clean = typeof url === 'string' ? url.trim() : '';
      if (!clean || seen.has(clean) || failedUrls[clean] || isVideoMediaSource(clean)) continue;
      seen.add(clean);
      merged.push(clean);
    }
    return merged.slice(0, 5);
  }, [coverImageUrl, galleryUrls, failedUrls, isExplicitVideo]);

  useEffect(() => {
    setFailedUrls({});
    setInternalSlideIdx(0);
  }, [coverImageUrl, galleryUrls, coverMediaType]);

  const currentIdx =
    imageSlides.length > 0
      ? (activeSlideIndex ?? internalSlideIdx) % imageSlides.length
      : 0;

  const shouldCycleSlides =
    !isExplicitVideo && imageSlides.length > 1 && (!controlPlayback || isAnimating);

  useEffect(() => {
    if (!shouldCycleSlides) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      const next = (currentIdx + 1) % imageSlides.length;
      if (onSlideChange) {
        onSlideChange(next);
      } else {
        setInternalSlideIdx(next);
      }
    }, 2400);

    return () => window.clearInterval(timer);
  }, [shouldCycleSlides, currentIdx, imageSlides.length, onSlideChange]);

  const showCustomCover = isExplicitVideo || imageSlides.length > 0;

  useEffect(() => {
    if (!isExplicitVideo || !controlPlayback) return;
    const vid = videoRef.current;
    if (!vid) return;
    if (isAnimating) {
      void vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isExplicitVideo, controlPlayback, isAnimating]);

  useEffect(() => {
    if (showCustomCover) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    let animId = 0;
    let tick = 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const accent = computeAccentPalette(effectiveAccentColor);
    const accentRgba = (alpha: number) => `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      if (theme === 'app-workspace') {
        ctx.fillStyle = '#09090D';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#111116';
        ctx.fillRect(0, 0, 130, height);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(0, 0, 130, height);

        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i === 1 ? accent.primary : '#27272A';
          ctx.fillRect(20, 48 + i * 32, 86, 12);
        }

        const cols = [155, 315, 475];
        cols.forEach((cx, ci) => {
          ctx.fillStyle = '#131319';
          ctx.fillRect(cx, 44, 140, 275);
          ctx.strokeStyle = 'rgba(255,255,255,0.09)';
          ctx.strokeRect(cx, 44, 140, 275);

          for (let r = 0; r < 3; r++) {
            const shift = ci === 1 && r === 0 ? Math.sin(t * 0.05) * 6 : 0;
            ctx.fillStyle = '#1C1C24';
            ctx.fillRect(cx + 12, 74 + r * 72 + shift, 116, 54);
            ctx.fillStyle = r === 0 ? accent.primary : '#3F3F46';
            ctx.fillRect(cx + 20, 86 + r * 72 + shift, 44, 6);
            ctx.fillStyle = '#71717A';
            ctx.fillRect(cx + 20, 102 + r * 72 + shift, 88, 5);
          }
        });

        const mx = 350 + Math.sin(t * 0.04) * 55;
        const my = 120 + Math.cos(t * 0.03) * 35;
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + 12, my + 6);
        ctx.lineTo(mx + 6, my + 8);
        ctx.lineTo(mx + 4, my + 14);
        ctx.closePath();
        ctx.fill();
      } else if (theme === 'game-rift') {
        const bg = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, 360);
        bg.addColorStop(0, accentRgba(0.28));
        bg.addColorStop(0.6, '#12080D');
        bg.addColorStop(1, '#07070A');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = accentRgba(0.25);
        ctx.lineWidth = 1;
        for (let i = -6; i <= 6; i++) {
          ctx.beginPath();
          ctx.moveTo(width / 2 + i * 48, 120);
          ctx.lineTo(width / 2 + i * 96, height);
          ctx.stroke();
        }
        for (let j = 0; j < 6; j++) {
          const y = 140 + j * 42;
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(width - 40, y);
          ctx.stroke();
        }

        const px = width / 2 + Math.sin(t * 0.05) * 40;
        const py = 215;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - 10, py - 24, 20, 34);
        ctx.strokeStyle = accent.light;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + 12, py - 8, 36, -0.8 + Math.sin(t * 0.1) * 0.4, 0.8 + Math.sin(t * 0.1) * 0.4);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(24, 22, 160, 18);
        ctx.fillStyle = accent.primary;
        ctx.fillRect(27, 25, 118, 12);
      } else if (theme === 'web-commerce') {
        ctx.fillStyle = '#08080C';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#121218';
        ctx.fillRect(28, 22, width - 56, height - 44);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(28, 22, width - 56, height - 44);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(58, 92, 175, 22);
        ctx.fillStyle = accent.primary;
        ctx.fillRect(58, 124, 130, 16);
        ctx.fillStyle = '#52525B';
        ctx.fillRect(58, 158, 195, 8);
        ctx.fillRect(58, 174, 165, 8);
        ctx.fillStyle = accent.primary;
        ctx.fillRect(58, 206, 95, 26);

        const glow = ctx.createRadialGradient(445, 185, 10, 445, 185, 120);
        glow.addColorStop(0, accentRgba(0.45));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(300, 65, 280, 240);

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(365, 95 + Math.sin(t * 0.04) * 5, 165, 180);
      } else if (theme === 'app-realtime') {
        ctx.fillStyle = '#090A0F';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#12131A';
        ctx.fillRect(54, 48, 360, 264);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(54, 48, 360, 264);

        for (let i = 0; i < 4; i++) {
          const isMe = i % 2 === 1;
          ctx.fillStyle = isMe ? accent.primary : '#27272A';
          ctx.fillRect(isMe ? 210 : 80, 82 + i * 50, 175, 32);
        }

        ctx.fillStyle = '#0D0E13';
        ctx.fillRect(438, 38, 146, 284);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(438, 38, 146, 284);
        ctx.fillStyle = accent.primary;
        ctx.fillRect(456, 74, 110, 48);
        ctx.fillStyle = '#27272A';
        ctx.fillRect(456, 136, 110, 38);
        ctx.fillRect(456, 186, 110, 38);
      } else if (theme === 'game-drift') {
        ctx.fillStyle = '#06070B';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 58;
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, 210, 105, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = accentRgba(0.65);
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, 210, 105, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const angle = t * 0.04;
        const cx = width / 2 + Math.cos(angle) * 210;
        const cy = height / 2 + Math.sin(angle) * 105;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2 + 0.28);
        ctx.fillStyle = accent.light;
        ctx.fillRect(-10, -18, 20, 36);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-7, -10, 14, 12);
        ctx.restore();
      } else {
        ctx.fillStyle = '#09090D';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(42, 42, 250, 125);
        ctx.strokeRect(320, 42, 275, 275);
        ctx.strokeRect(42, 190, 250, 127);

        ctx.fillStyle = accent.primary;
        ctx.fillRect(62, 74, 110, 34);
        ctx.fillStyle = '#27272A';
        ctx.fillRect(184, 74, 88, 34);

        const swatches = ['#08080A', '#18181B', accent.primary, '#38BDF8', '#F4F4F5'];
        swatches.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(62 + i * 44, 224, 34, 34);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.strokeRect(62 + i * 44, 224, 34, 34);
        });

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(348, 76, 190, 22);
        ctx.fillStyle = '#A1A1AA';
        ctx.fillRect(348, 116, 215, 10);
        ctx.fillRect(348, 136, 175, 10);
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(348, 178, 120, 28);
      }
    };

    draw(tick);

    if (isAnimating && !prefersReduced) {
      const loop = () => {
        tick += 1;
        draw(tick);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [theme, isAnimating, showCustomCover, effectiveAccentColor]);

  return (
    <div className={`relative aspect-video overflow-hidden bg-[#0B0B0F] ${className}`}>
      {showCustomCover ? (
        isExplicitVideo ? (
          <video
            ref={videoRef}
            src={coverImageUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-label={title}
            onError={() => {
              if (coverImageUrl) {
                setFailedUrls((prev) => ({ ...prev, [coverImageUrl]: true }));
              }
            }}
            className="block h-full w-full object-cover"
          />
        ) : imageSlides.length > 1 ? (
          <>
            {imageSlides.map((slideUrl, idx) => {
              const active = idx === currentIdx;
              const zoomShift = idx % 2 === 0 ? 'scale-[1.06]' : 'scale-[1.04]';
              return (
                <img
                  key={`${slideUrl.slice(0, 64)}-${idx}`}
                  src={slideUrl}
                  alt={`${title} frame ${idx + 1}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                  onError={() => setFailedUrls((prev) => ({ ...prev, [slideUrl]: true }))}
                  className={`absolute inset-0 block h-full w-full object-cover transition-all duration-1000 ease-out ${
                    active ? `opacity-100 ${zoomShift}` : 'pointer-events-none opacity-0 scale-100'
                  }`}
                />
              );
            })}
            {showSlideBadge && (
              <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] text-zinc-200 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-light" />
                <span className="tabular-nums">
                  {currentIdx + 1}/{imageSlides.length}
                </span>
              </div>
            )}
          </>
        ) : (
          <img
            src={imageSlides[0]}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => {
              const bad = imageSlides[0];
              if (bad) setFailedUrls((prev) => ({ ...prev, [bad]: true }));
            }}
            className={`block h-full w-full object-cover transition-transform duration-500 ${
              isAnimating ? 'scale-[1.03]' : 'scale-100'
            }`}
          />
        )
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full object-cover" aria-hidden="true" />
      )}
    </div>
  );
};
