import React from 'react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { DesignBlock, TypedText } from './DesignCursorSystem';

export const ExperienceSection: React.FC = () => {
  const { experience } = usePortfolioContent();
  return (
    <section id="experience" className="border-b border-white/10 bg-[#050507] py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Builder Journey Header */}
          <div className="lg:col-span-4">
            <DesignBlock shape="panel" slotIndex={0} label="Section / Experience Header">
              <p className="text-xs font-medium text-zinc-400">
                <TypedText text="Builder Journey" />
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                <TypedText
                  text="KEEP BUILDING."
                  accentText="KEEP SHIPPING."
                  accentBreak
                  accentClassName="text-accent"
                  resizeScale
                />
              </h2>
            </DesignBlock>
          </div>

          {/* Right Column: Individual Timeline Blocks */}
          <div className="divide-y divide-white/10 border-y border-white/10 lg:col-span-8">
            {experience.map((item, idx) => {
              const firstExp = experience[0] ?? item;
              return (
                <DesignBlock
                  key={item.id}
                  shape="row"
                  slotIndex={idx + 1}
                  cloneGroup="experience"
                  isCloneItem={idx > 0}
                  className="py-6"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-6">
                    <div className="sm:col-span-4">
                      <span className="font-mono text-xs font-medium text-accent-light tabular-nums">
                        <TypedText
                          text={item.period}
                          cloneFrom={idx > 0 ? firstExp.period : undefined}
                        />
                      </span>
                      <div className="mt-1 text-xs text-zinc-400">
                        <TypedText
                          text={item.org}
                          cloneFrom={idx > 0 ? firstExp.org : undefined}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-8">
                      <h3 className="text-base font-semibold text-white">
                        <TypedText
                          text={item.role}
                          cloneFrom={idx > 0 ? firstExp.role : undefined}
                        />
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                        <TypedText
                          text={item.description}
                          cloneFrom={idx > 0 ? firstExp.description : undefined}
                        />
                      </p>
                    </div>
                  </div>
                </DesignBlock>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

