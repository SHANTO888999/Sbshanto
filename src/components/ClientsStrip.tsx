import React from 'react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { DesignBlock, TypedText } from './DesignCursorSystem';

export const ClientsStrip: React.FC = () => {
  const { techPartners } = usePortfolioContent();
  return (
    <section
      aria-label="Core platforms and engines"
      className="border-b border-white/10 bg-[#0A0A0D] py-10"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <DesignBlock label="Core Technologies">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <p className="shrink-0 text-xs font-medium text-zinc-400">
              <TypedText text="Built with modern web, app & game engines" />
            </p>

            <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-3 lg:flex lg:w-auto lg:flex-wrap lg:items-center lg:gap-10">
              {techPartners.map((tech) => (
                <span
                  key={tech}
                  className="font-display text-lg font-semibold tracking-wider text-zinc-500 transition-colors duration-150 hover:text-white"
                >
                  <TypedText text={tech} />
                </span>
              ))}
            </div>
          </div>
        </DesignBlock>
      </div>
    </section>
  );
};
