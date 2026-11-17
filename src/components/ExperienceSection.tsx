import React from 'react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { DesignBlock, TypedText } from './DesignCursorSystem';

export const ExperienceSection: React.FC = () => {
  const { profile, experience } = usePortfolioContent();
  return (
    <section id="experience" className="border-b border-white/10 bg-[#0A0A0D] py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Builder Journey Header + Individual Timeline Blocks */}
          <div className="lg:col-span-8">
            <DesignBlock shape="panel" slotIndex={0} label="Section / Experience Header">
              <p className="text-xs font-medium text-zinc-400">
                <TypedText text="Builder Journey" />
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                <TypedText
                  text="KEEP BUILDING."
                  accentText="KEEP SHIPPING."
                  accentBreak
                  accentClassName="text-[#DC2626]"
                />
              </h2>
            </DesignBlock>

            <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
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
                        <span className="font-mono text-xs font-medium text-[#EF4444] tabular-nums">
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

          {/* Right Column: Crimson Manifesto Card */}
          <DesignBlock shape="panel" slotIndex={5} label="Manifesto Card" className="lg:col-span-4">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-[#DC2626]/40 bg-[#140709] p-8">
              <div>
                <p className="text-xs font-medium text-red-300">
                  <TypedText text="Creator Ethos" />
                </p>
                <h3 className="mt-3 font-display text-4xl font-bold leading-none tracking-tight text-white">
                  <TypedText
                    text="START SMALL."
                    accentText="SHIP BIG."
                    accentBreak
                    accentClassName="text-[#EF4444]"
                  />
                </h3>
              </div>

              <div className="my-8 space-y-4 border-y border-white/10 py-6 text-sm text-zinc-300">
                <p className="break-words">
                  <TypedText text={profile.manifestoLead} />
                </p>
                <p className="break-words text-zinc-400">
                  <TypedText text={profile.manifestoAvailability} />
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <TypedText text="First Prototype" />
                <span className="font-mono text-white tabular-nums">
                  <TypedText text={profile.prototypeTurnaround} />
                </span>
              </div>
            </div>
          </DesignBlock>
        </div>
      </div>
    </section>
  );
};
