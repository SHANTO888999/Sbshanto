import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Mail, RotateCcw } from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { trackCvDownload } from '../firebaseViewer';
import { copyTextSafely } from '../utils/clipboard';
import { downloadPortfolioCv } from '../utils/cvPdfGenerator';
import { DesignBlock, TypedText, useDesignCanvas } from './DesignCursorSystem';

interface ContactSectionProps {
  onOpenInquiry: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenInquiry }) => {
  const [copied, setCopied] = useState(false);
  const portfolioContent = usePortfolioContent();
  const { profile, viewerControls } = portfolioContent;
  const { triggerReplay } = useDesignCanvas();
  const email = profile.email;

  const handleCopyEmail = async () => {
    const ok = await copyTextSafely(email);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleReplayFromTop = () => {
    triggerReplay();
  };

  return (
    <footer id="contact" className="bg-[#08080A] pt-20 pb-12 lg:pt-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Direct Outreach */}
          <DesignBlock shape="panel" slotIndex={0} label="Section / Contact" className="flex flex-col justify-between lg:col-span-6">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                <TypedText text="New Builds & Collaborations" />
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-6xl [text-wrap:balance]">
                <TypedText
                  text="LET'S BUILD"
                  accentText="TOGETHER."
                  accentBreak
                  accentClassName="text-accent"
                />
              </h2>

              <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-base">
                <TypedText text="Need a custom website, full-stack web or mobile application, or an interactive game built from scratch? Send your project idea and get a build plan within 24 hours." />
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onOpenInquiry}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Start a Project Brief
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-[#111115] px-4 py-3 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <span>Copied {email}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      <span>{email}</span>
                    </>
                  )}
                </button>

                {viewerControls.showCvDownloadOnViewer && (
                  <button
                    type="button"
                    onClick={() => {
                      downloadPortfolioCv(portfolioContent);
                      void trackCvDownload();
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-accent/45 bg-accent/10 px-4 py-3 text-xs font-semibold text-white transition-colors hover:border-accent hover:bg-accent/20 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-4 w-4 text-accent-light" aria-hidden="true" />
                    <span>Download CV (PDF)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Direct Channels */}
            <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
              <div>
                <div className="text-xs text-zinc-500">Email</div>
                <a
                  href={`mailto:${email}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-200 hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
                  <TypedText text="Direct Mail" />
                </a>
              </div>
              <div>
                <div className="text-xs text-zinc-500">GitHub</div>
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-200 hover:text-white"
                >
                  <TypedText text={profile.githubHandle} />
                  <ArrowUpRight className="h-3 w-3 text-zinc-400" aria-hidden="true" />
                </a>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Discipline</div>
                <p className="mt-1 text-xs font-medium text-zinc-200">
                  <TypedText text={profile.disciplineSummary} />
                </p>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Availability</div>
                <p className="mt-1 text-xs font-medium text-zinc-200">
                  <TypedText text={profile.availability} />
                </p>
              </div>
            </div>
          </DesignBlock>

          {/* Right Column: Make It Interactive Visual Stage */}
          <DesignBlock shape="panel" slotIndex={1} label="Closing Stage" delay={180} className="lg:col-span-6">
            <div className="design-grid-bg relative flex h-full min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0D0D11] p-8 sm:p-10">
              <div
                className="pointer-events-none absolute -right-12 -bottom-12 h-80 w-80 rounded-full bg-accent/30 blur-[100px]"
                aria-hidden="true"
              />

              <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono tabular-nums">
                  <TypedText text="CANVAS · SHANTO.DEV" />
                </span>
                <span className="font-mono tabular-nums">
                  <TypedText text="1440 × 900" />
                </span>
              </div>

              <div className="relative z-10 my-10">
                <h3 className="font-display text-5xl font-bold leading-[0.96] tracking-tight text-white sm:text-6xl">
                  <TypedText
                    text="MAKE IT"
                    accentText="PLAYABLE."
                    accentBreak
                    accentClassName="text-accent"
                  />
                </h3>
                <p className="mt-4 max-w-sm text-sm text-zinc-300">
                  <TypedText text="Scroll back up anytime to watch the design cursors reconstruct every frame from wireframe to production." />
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleReplayFromTop}
                  className="inline-flex items-center gap-2.5 rounded-md border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:border-accent hover:bg-accent whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Replay Cursor Build
                </button>
              </div>
            </div>
          </DesignBlock>
        </div>

        {/* Bottom Copyright Row */}
        <DesignBlock shape="row" slotIndex={2} label="Footer Bar">
          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
            <p>
              &copy; {new Date().getFullYear()} <TypedText text={`${profile.backdropName}. All rights reserved.`} />
            </p>
            <div className="flex items-center gap-6">
              <a href="#works" className="transition-colors hover:text-zinc-300">
                <TypedText text="Works" />
              </a>
              <a href="#milestones" className="transition-colors hover:text-zinc-300">
                <TypedText text="Milestones" />
              </a>
              <a href="#process" className="transition-colors hover:text-zinc-300">
                <TypedText text="Process" />
              </a>
              <a href="#top" className="transition-colors hover:text-zinc-300">
                <TypedText text="Back to Top" />
              </a>
            </div>
          </div>
        </DesignBlock>
      </div>
    </footer>
  );
};
