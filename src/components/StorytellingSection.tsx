import React from 'react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { DesignBlock, TypedText, useCursorBuildPhase } from './DesignCursorSystem';

const BrandQuoteCard: React.FC<{
  quoteText: string;
  quoteAuthor: string;
  quoteRole: string;
}> = ({ quoteText, quoteAuthor, quoteRole }) => {
  const { isMonochrome } = useCursorBuildPhase();

  return (
    <div
      data-cursor-color-target="true"
      className={`flex h-full flex-col justify-between rounded-2xl border p-8 text-white transition-[border-color,background-image] duration-500 ${
        isMonochrome ? 'border-white/15 bg-[#0D0E14]' : 'border-accent/45 bg-[#0D0E14]'
      }`}
      style={{
        backgroundImage: isMonochrome
          ? 'none'
          : 'linear-gradient(155deg, rgba(var(--accent-rgb), 0.34) 0%, rgba(var(--accent-rgb), 0.14) 55%, rgba(13, 14, 20, 0.96) 100%)',
      }}
    >
      <div
        className={`font-display text-5xl font-bold leading-none transition-colors duration-400 ${
          isMonochrome ? 'text-zinc-600' : 'text-accent-light/70'
        }`}
        aria-hidden="true"
      >
        &ldquo;
      </div>
      <blockquote className="my-6 break-words text-xl font-medium leading-snug tracking-tight sm:text-2xl">
        <TypedText text={quoteText} />
      </blockquote>
      <div className="border-t border-white/15 pt-4">
        <p className="text-base font-semibold italic">
          <TypedText text={quoteAuthor} />
        </p>
        <p className="text-xs text-zinc-300">
          <TypedText text={quoteRole} />
        </p>
      </div>
    </div>
  );
};

export const StorytellingSection: React.FC = () => {
  const { profile, techStack, services } = usePortfolioContent();
  return (
    <section id="stack" className="border-b border-white/10 bg-[#08080A] py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <DesignBlock label="Section / Philosophy & Stack" className="max-w-3xl">
          <p className="text-xs font-medium text-zinc-400">
            <TypedText text="Philosophy & Engineering Stack" />
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl [text-wrap:balance]">
            <TypedText
              text="NOT JUST CODE."
              accentText="COMPLETE EXPERIENCES."
              accentBreak
              accentClassName="text-accent"
              resizeScale
            />
          </h2>
        </DesignBlock>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Column 1: Core Tech Stack */}
          <div className="space-y-8 lg:col-span-4">
            <DesignBlock shape="panel" slotIndex={0} label="Engineering Overview">
              <h3 className="text-sm font-semibold text-white">
                <TypedText text="Engineering & Design" />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                <TypedText text="Combining visual UI craft with clean architecture—whether building responsive websites, scalable web & mobile applications, or interactive 2D/3D games." />
              </p>
            </DesignBlock>

            <DesignBlock shape="row" slotIndex={1} label="Core Stack" className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white">
                <TypedText text="Core Stack" />
              </h3>
              <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                {techStack.map((tool, idx) => (
                  <li key={`${tool.name}-${idx}`} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="text-sm font-medium text-white">
                      <TypedText text={tool.name} />
                    </span>
                    <span className="text-right text-xs text-zinc-400">
                      <TypedText text={tool.role} />
                    </span>
                  </li>
                ))}
              </ul>
            </DesignBlock>
          </div>

          {/* Column 2: What I Build (each service builds & types line-by-line) */}
          <div className="lg:col-span-4">
            <DesignBlock shape="panel" slotIndex={2}>
              <h3 className="text-sm font-semibold text-white">
                <TypedText text="What I Build" />
              </h3>
            </DesignBlock>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {services.map((service, idx) => {
                const firstService = services[0] ?? service;
                return (
                  <DesignBlock
                    key={`${service.index}-${idx}`}
                    shape="row"
                    slotIndex={idx + 3}
                    cloneGroup="services"
                    isCloneItem={idx > 0}
                    className="py-4"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs font-semibold text-accent-light tabular-nums">
                        <TypedText
                          text={`${service.index}.`}
                          cloneFrom={idx > 0 ? `${firstService.index}.` : undefined}
                        />
                      </span>
                      <h4 className="text-sm font-semibold text-white">
                        <TypedText
                          text={service.title}
                          cloneFrom={idx > 0 ? firstService.title : undefined}
                        />
                      </h4>
                    </div>
                    <p className="mt-1.5 pl-7 text-xs leading-relaxed text-zinc-400">
                      <TypedText
                        text={service.detail}
                        cloneFrom={idx > 0 ? firstService.detail : undefined}
                      />
                    </p>
                  </DesignBlock>
                );
              })}
            </div>
          </div>

          {/* Column 3: Signature Brand Quote Card */}
          <DesignBlock shape="panel" slotIndex={7} label="Quote Frame" className="lg:col-span-4">
            <BrandQuoteCard
              quoteText={profile.quoteText}
              quoteAuthor={profile.quoteAuthor}
              quoteRole={profile.quoteRole}
            />
          </DesignBlock>
        </div>
      </div>
    </section>
  );
};
