import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Code2, Pause, Play, X } from 'lucide-react';
import { ProjectItem } from '../data/portfolioData';
import { ProductPreviewCanvas } from './ProductPreviewCanvas';

interface ProjectModalProps {
  project: ProjectItem | null;
  onClose: () => void;
  onBack?: () => void;
  showArchitecture?: boolean;
  onShowArchitectureChange?: (show: boolean) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  onClose,
  onBack,
  showArchitecture: controlledShowArchitecture,
  onShowArchitectureChange,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [internalShowArchitecture, setInternalShowArchitecture] = useState(false);

  const showArchitecture = controlledShowArchitecture ?? internalShowArchitecture;
  const setShowArchitecture = (next: boolean) => {
    setInternalShowArchitecture(next);
    onShowArchitectureChange?.(next);
  };

  useEffect(() => {
    if (!project) return;
    setIsAnimating(true);
    setInternalShowArchitecture(false);

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0D0D11] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else if (showArchitecture) {
                  setShowArchitecture(false);
                } else {
                  onClose();
                }
              }}
              aria-label="Go back"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-[#121319] px-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-accent/60 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-bold text-white sm:text-2xl">
                {project.index}. {project.title}
              </h3>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                {project.category} · {project.platform} · {project.year}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project inspector"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="relative bg-black" data-cursor="eye">
          <ProductPreviewCanvas
            theme={project.previewTheme}
            coverImageUrl={project.coverImageUrl}
            coverMediaType={project.coverMediaType}
            title={project.title}
            isAnimating={isAnimating}
            controlPlayback
          />

          <div className="flex items-center justify-between border-t border-white/10 bg-[#08080A] px-5 py-3">
            <button
              type="button"
              onClick={() => setIsAnimating((p) => !p)}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              {isAnimating ? (
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  Pause Simulation
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  Run Simulation
                </>
              )}
            </button>

            <span className="font-mono text-xs text-zinc-400 tabular-nums">
              Viewport · {project.dimensions}
            </span>
          </div>
        </div>

        {/* Details & Tech Architecture */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">
                {showArchitecture ? 'Engineering & Architecture' : 'Project Overview'}
              </h4>
              <button
                type="button"
                onClick={() => setShowArchitecture(!showArchitecture)}
                className="text-xs font-medium text-accent-light hover:underline"
              >
                {showArchitecture ? 'View Overview' : 'View Tech Notes'}
              </button>
            </div>
            <p className="mt-2 break-words text-sm leading-relaxed text-zinc-300">
              {showArchitecture ? project.architectureNotes : project.summary}
            </p>

            {(project.liveUrl || project.repoUrl) && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
                  >
                    Live Preview
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#111115] px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white"
                  >
                    <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Source Code
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-white/10 pt-4 text-xs md:col-span-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <div>
              <span className="text-zinc-500">Role</span>
              <p className="mt-0.5 break-words font-medium text-white">{project.role}</p>
            </div>
            <div>
              <span className="text-zinc-500">Tech Stack</span>
              <p className="mt-0.5 break-words font-medium text-zinc-200">
                {project.stack.slice(0, 6).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
