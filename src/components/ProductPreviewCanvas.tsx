import React, { useEffect, useRef, useState } from 'react';
import { isVideoMediaSource } from '../data/contentSchema';
import { ProjectItem } from '../data/portfolioData';

interface ProductPreviewCanvasProps {
  theme: ProjectItem['previewTheme'];
  coverImageUrl?: string;
  coverMediaType?: 'image' | 'video';
  title?: string;
  isAnimating?: boolean;
  controlPlayback?: boolean;
  className?: string;
}

export const ProductPreviewCanvas: React.FC<ProductPreviewCanvasProps> = ({
  theme,
  coverImageUrl,
  coverMediaType,
  title = 'Project preview',
  isAnimating = false,
  controlPlayback = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [coverImageUrl, coverMediaType]);

  const showCustomCover = Boolean(coverImageUrl && !imageFailed);
  const isVideo = showCustomCover && isVideoMediaSource(coverImageUrl, coverMediaType);

  useEffect(() => {
    if (!isVideo || !controlPlayback) return;
    const vid = videoRef.current;
    if (!vid) return;
    if (isAnimating) {
      void vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isVideo, controlPlayback, isAnimating]);

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

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      if (theme === 'app-workspace') {
        // Dark SaaS App Interface Preview with Live Cursor & Cards
        ctx.fillStyle = '#09090D';
        ctx.fillRect(0, 0, width, height);

        // Sidebar
        ctx.fillStyle = '#111116';
        ctx.fillRect(0, 0, 130, height);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(0, 0, 130, height);

        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i === 1 ? '#DC2626' : '#27272A';
          ctx.fillRect(20, 48 + i * 32, 86, 12);
        }

        // Main Workspace Board Cards
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
            ctx.fillStyle = r === 0 ? '#DC2626' : '#3F3F46';
            ctx.fillRect(cx + 20, 86 + r * 72 + shift, 44, 6);
            ctx.fillStyle = '#71717A';
            ctx.fillRect(cx + 20, 102 + r * 72 + shift, 88, 5);
          }
        });

        // Mini live cursor inside app preview
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
        // 2.5D Action Roguelite Game Scene
        const bg = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, 360);
        bg.addColorStop(0, '#3B0A10');
        bg.addColorStop(0.6, '#12080D');
        bg.addColorStop(1, '#07070A');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Isometric arena floor grid
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.25)';
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

        // Player character & slash arc
        const px = width / 2 + Math.sin(t * 0.05) * 40;
        const py = 215;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - 10, py - 24, 20, 34);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + 12, py - 8, 36, -0.8 + Math.sin(t * 0.1) * 0.4, 0.8 + Math.sin(t * 0.1) * 0.4);
        ctx.stroke();

        // Game HUD health & energy bar
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(24, 22, 160, 18);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(27, 25, 118, 12);
      } else if (theme === 'web-commerce') {
        // Modern Dark Editorial Website Preview
        ctx.fillStyle = '#08080C';
        ctx.fillRect(0, 0, width, height);

        // Browser bar
        ctx.fillStyle = '#121218';
        ctx.fillRect(28, 22, width - 56, height - 44);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(28, 22, width - 56, height - 44);

        // Split Hero inside browser preview
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(58, 92, 175, 22);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(58, 124, 130, 16);
        ctx.fillStyle = '#52525B';
        ctx.fillRect(58, 158, 195, 8);
        ctx.fillRect(58, 174, 165, 8);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(58, 206, 95, 26);

        // Right product stage
        const glow = ctx.createRadialGradient(445, 185, 10, 445, 185, 120);
        glow.addColorStop(0, 'rgba(220, 38, 38, 0.45)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(300, 65, 280, 240);

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(365, 95 + Math.sin(t * 0.04) * 5, 165, 180);
      } else if (theme === 'app-realtime') {
        // Mobile & Web App Screens Side-by-Side
        ctx.fillStyle = '#090A0F';
        ctx.fillRect(0, 0, width, height);

        // Desktop frame
        ctx.fillStyle = '#12131A';
        ctx.fillRect(54, 48, 360, 264);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(54, 48, 360, 264);

        // Chat bubbles animating
        for (let i = 0; i < 4; i++) {
          const isMe = i % 2 === 1;
          ctx.fillStyle = isMe ? '#DC2626' : '#27272A';
          ctx.fillRect(isMe ? 210 : 80, 82 + i * 50, 175, 32);
        }

        // Overlapping Mobile Phone Frame
        ctx.fillStyle = '#0D0E13';
        ctx.fillRect(438, 38, 146, 284);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(438, 38, 146, 284);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(456, 74, 110, 48);
        ctx.fillStyle = '#27272A';
        ctx.fillRect(456, 136, 110, 38);
        ctx.fillRect(456, 186, 110, 38);
      } else if (theme === 'game-drift') {
        // Top-Down Neon Drift Racing Track
        ctx.fillStyle = '#06070B';
        ctx.fillRect(0, 0, width, height);

        // Oval racing circuit
        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 58;
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, 210, 105, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(220, 38, 38, 0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, 210, 105, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Drift Car
        const angle = t * 0.04;
        const cx = width / 2 + Math.cos(angle) * 210;
        const cy = height / 2 + Math.sin(angle) * 105;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2 + 0.28);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-10, -18, 20, 36);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-7, -10, 14, 12);
        ctx.restore();
      } else {
        // UI/UX Design System Tokens & Components Grid
        ctx.fillStyle = '#09090D';
        ctx.fillRect(0, 0, width, height);

        // Blue Figma canvas selection guides
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(42, 42, 250, 125);
        ctx.strokeRect(320, 42, 275, 275);
        ctx.strokeRect(42, 190, 250, 127);

        // Component buttons & swatches
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(62, 74, 110, 34);
        ctx.fillStyle = '#27272A';
        ctx.fillRect(184, 74, 88, 34);

        const swatches = ['#08080A', '#18181B', '#DC2626', '#38BDF8', '#F4F4F5'];
        swatches.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(62 + i * 44, 224, 34, 34);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.strokeRect(62 + i * 44, 224, 34, 34);
        });

        // Typography scale preview
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
  }, [theme, isAnimating, showCustomCover]);

  return (
    <div className={`relative aspect-video overflow-hidden bg-[#0B0B0F] ${className}`}>
      {showCustomCover ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={coverImageUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-label={title}
            onError={() => setImageFailed(true)}
            className="block h-full w-full object-cover"
          />
        ) : (
          <img
            src={coverImageUrl}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
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
