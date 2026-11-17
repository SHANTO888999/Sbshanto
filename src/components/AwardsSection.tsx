import React, { useEffect, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { DesignBlock, TypedText, useBlockStage } from './DesignCursorSystem';

const CraftMetricCounter: React.FC = () => {
  const { profile } = usePortfolioContent();
  const { stage, cursorsEnabled } = useBlockStage();
  const isMonochrome = cursorsEnabled && (stage === 'type-draft' || stage === 'resize-scale');

  return (
    <div className="relative mt-8 flex items-end gap-4">
      <span className="relative font-display text-7xl font-bold leading-none text-white tabular-nums sm:text-8xl">
        <TypedText text={profile.craftMetricValue} />
        <span
          className={`transition-colors duration-600 ${
            isMonochrome ? 'text-zinc-400' : 'text-accent'
          }`}
        >
          <TypedText text={profile.craftMetricSuffix} />
        </span>
      </span>
      <div className="pb-2">
        <Trophy
          className={`h-7 w-7 transition-colors duration-500 ${
            isMonochrome ? 'text-zinc-500' : 'text-accent'
          }`}
          aria-hidden="true"
        />
        <p className="mt-1 text-xs font-medium text-zinc-400">
          <TypedText text={profile.craftMetricLabel} />
        </p>
      </div>
    </div>
  );
};

interface AwardsSectionProps {
  expandedId?: string;
  onExpandedChange?: (id: string) => void;
}

export const AwardsSection: React.FC<AwardsSectionProps> = ({
  expandedId: controlledExpandedId,
  onExpandedChange,
}) => {
  const { profile, milestones } = usePortfolioContent();
  const [internalExpandedId, setInternalExpandedId] = useState<string>(() => milestones[0]?.id ?? '');
  const expandedId = controlledExpandedId ?? internalExpandedId;
  const setExpandedId = (next: string) => {
    setInternalExpandedId(next);
    onExpandedChange?.(next);
  };

  useEffect(() => {
    if (
      controlledExpandedId === undefined &&
      milestones.length > 0 &&
      expandedId !== '' &&
      !milestones.some((m) => m.id === expandedId)
    ) {
      setInternalExpandedId(milestones[0].id);
    }
  }, [controlledExpandedId, milestones, expandedId]);

  return (
    <section
      id="milestones"
      className="border-b border-white/10 bg-[#08080A] py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Statement & 60+ built & typed line by line */}
          <DesignBlock shape="panel" slotIndex={0} label="Section / Craft & Impact" className="lg:col-span-5">
            <p className="text-xs font-medium text-zinc-400">
              <TypedText text="Shipped Builds & Honors" />
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl [text-wrap:balance]">
              <TypedText
                text="THE CRAFT."
                accentText="THE IMPACT."
                accentBreak
                accentClassName="text-accent"
              />
            </h2>

            <CraftMetricCounter />

            <p className="mt-6 max-w-md break-words text-sm leading-relaxed text-zinc-300">
              <TypedText text={profile.craftSummary} />
            </p>
          </DesignBlock>

          {/* Right Column: Each Milestone row builds & types sequentially line-by-line */}
          <div className="divide-y divide-white/10 border-y border-white/10 lg:col-span-7">
            {milestones.map((item, idx) => {
              const isOpen = expandedId === item.id;
              const firstMilestone = milestones[0] ?? item;

              return (
                <DesignBlock
                  key={item.id}
                  shape="row"
                  slotIndex={idx + 1}
                  cloneGroup="milestones"
                  isCloneItem={idx > 0}
                  className="py-4"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? '' : item.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold text-white sm:text-lg">
                        <TypedText
                          text={item.title}
                          cloneFrom={idx > 0 ? firstMilestone.title : undefined}
                        />
                      </h3>
                      <p className="mt-0.5 break-words text-xs text-zinc-400">
                        <TypedText
                          text={`${item.context} · ${item.project}`}
                          cloneFrom={
                            idx > 0 ? `${firstMilestone.context} · ${firstMilestone.project}` : undefined
                          }
                        />
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-mono text-sm font-medium text-accent-light tabular-nums">
                        <TypedText
                          text={item.year}
                          cloneFrom={idx > 0 ? firstMilestone.year : undefined}
                        />
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <p className="mt-3 break-words text-xs leading-relaxed text-zinc-300">
                      <TypedText
                        text={item.outcome}
                        cloneFrom={idx > 0 ? firstMilestone.outcome : undefined}
                      />
                    </p>
                  )}
                </DesignBlock>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
