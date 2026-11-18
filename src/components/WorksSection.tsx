import React, { useState } from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { ProjectCategory, ProjectItem } from '../data/portfolioData';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { ProductPreviewCanvas } from './ProductPreviewCanvas';
import { DesignBlock, TypedText, useBlockStage } from './DesignCursorSystem';

interface WorksSectionProps {
  onSelectProject: (project: ProjectItem) => void;
  activeCategory?: ProjectCategory;
  onCategoryChange?: (category: ProjectCategory) => void;
}

const CATEGORIES: ProjectCategory[] = [
  'All',
  'Websites',
  'Apps',
  'Games',
  'UI/UX Design',
];

const ProjectCardContent: React.FC<{
  project: ProjectItem;
  firstProject: ProjectItem;
  isCloneCard: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect: () => void;
}> = ({
  project,
  firstProject,
  isCloneCard,
  isHovered,
  onHoverStart,
  onHoverEnd,
  onSelect,
}) => {
  const { stage, isCloneHighlight } = useBlockStage();
  const showingCloneTheme =
    isCloneCard && isCloneHighlight && (stage === 'layout-drag' || stage === 'type-draft');

  return (
    <article
      className="group relative flex flex-col"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <button
        type="button"
        data-magnetic="card"
        onClick={onSelect}
        className="w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111115] transition-transform duration-200 group-hover:-translate-y-1">
          <ProductPreviewCanvas
            theme={showingCloneTheme ? firstProject.previewTheme : project.previewTheme}
            coverImageUrl={showingCloneTheme ? firstProject.coverImageUrl : project.coverImageUrl}
            galleryUrls={showingCloneTheme ? firstProject.galleryUrls : project.galleryUrls}
            coverMediaType={showingCloneTheme ? firstProject.coverMediaType : project.coverMediaType}
            title={project.title}
            isAnimating={isHovered}
          />

          {showingCloneTheme && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[#38BDF8]/12 ring-2 ring-inset ring-[#38BDF8]/70"
            />
          )}

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15"
            aria-hidden="true"
          />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3">
            <span className="font-mono text-xs text-zinc-300 tabular-nums">
              <TypedText
                text={project.platform}
                cloneFrom={isCloneCard ? firstProject.platform : undefined}
              />
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white">
              <TypedText text="Inspect Build" />
              <ArrowUpRight className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Clean Numbered Title & Unboxed Metadata */}
        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-display text-2xl font-bold text-accent tabular-nums">
            <TypedText
              text={project.index}
              cloneFrom={isCloneCard ? firstProject.index : undefined}
            />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-white transition-colors group-hover:text-accent-light">
              <TypedText
                text={project.title}
                cloneFrom={isCloneCard ? firstProject.title : undefined}
              />
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <TypedText
                text={`${project.category} · ${project.client} · ${project.year}`}
                cloneFrom={
                  isCloneCard
                    ? `${firstProject.category} · ${firstProject.client} · ${firstProject.year}`
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </button>

      {project.liveUrl && (
        <div className="mt-2.5 pl-10">
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#101116] px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:border-accent hover:bg-accent/15 hover:text-white"
          >
            <span>Open Live Project</span>
            <ExternalLink className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
          </a>
        </div>
      )}
    </article>
  );
};

export const WorksSection: React.FC<WorksSectionProps> = ({
  onSelectProject,
  activeCategory: controlledCategory,
  onCategoryChange,
}) => {
  const { projects } = usePortfolioContent();
  const [internalCategory, setInternalCategory] = useState<ProjectCategory>('All');
  const activeCategory = controlledCategory ?? internalCategory;
  const setActiveCategory = (next: ProjectCategory) => {
    setInternalCategory(next);
    onCategoryChange?.(next);
  };
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredProjects =
    activeCategory === 'All'
      ? projects
      : projects.filter((item) => item.category === activeCategory);

  const featuredTimelineProjects = projects.slice(0, 24);

  return (
    <section id="works" className="border-b border-white/10 bg-[#050507] py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <DesignBlock label="Section / Selected Works">
          <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                <TypedText text="Websites · Applications · Interactive Games" />
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                <TypedText text="WORKS THAT " accentText="SHIP." accentClassName="text-accent" />
              </h2>
            </div>

            {/* Interactive Category Filter Tabs */}
            <div
              className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#111115] p-1"
              role="tablist"
              aria-label="Filter projects by discipline"
            >
              {CATEGORIES.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </DesignBlock>

        {/* Numbered Project Grid built sequentially by Viewport Queue Cursors */}
        {filteredProjects.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-[#0D0D11] p-10 text-center text-sm text-zinc-400">
            No builds published in {activeCategory} yet.
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, idx) => {
              const firstProject = filteredProjects[0] ?? project;

              return (
                <DesignBlock
                  key={`${activeCategory}-${project.id}`}
                  shape="card"
                  slotIndex={idx}
                  cloneGroup={`works-${activeCategory}`}
                  isCloneItem={idx > 0}
                  label={`Frame ${project.index} · ${project.dimensions}`}
                >
                  <ProjectCardContent
                    project={project}
                    firstProject={firstProject}
                    isCloneCard={idx > 0}
                    isHovered={hoveredId === project.id}
                    onHoverStart={() => setHoveredId(project.id)}
                    onHoverEnd={() => setHoveredId(null)}
                    onSelect={() => onSelectProject(project)}
                  />
                </DesignBlock>
              );
            })}
          </div>
        )}

        {/* Interactive Component Layer & Build Architecture Strip */}
        <DesignBlock label="Canvas Layer Tree" slotIndex={4}>
          <div className="mt-14 rounded-xl border border-white/10 bg-[#0D0D11] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="font-mono tabular-nums">
                <TypedText text="CANVAS · COMPONENT ARCHITECTURE" />
              </span>
              <span className="font-mono tabular-nums">
                <TypedText text="WEB · APP · GAME PIPELINE" />
              </span>
            </div>

            <div className="design-grid-bg relative mt-3 space-y-1.5 overflow-hidden rounded-lg border border-white/10 bg-[#050507] p-2.5">
              {/* UI Layer */}
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 font-mono text-[10px] text-zinc-500">UI/UX</span>
                <div className="flex flex-1 items-center gap-1.5">
                  <div className="h-5 w-[22%] truncate rounded-sm border border-[#3B82F6]/50 bg-[#3B82F6]/20 px-2 text-[10px] leading-5 text-blue-200">
                    <TypedText text="Figma Wireframe Grid" />
                  </div>
                  <div className="ml-[5%] h-5 w-[30%] truncate rounded-sm border border-[#3B82F6]/50 bg-[#3B82F6]/15 px-2 text-[10px] leading-5 text-blue-200">
                    <TypedText text="Design Tokens & Motion" />
                  </div>
                  <div className="ml-[5%] h-5 w-[24%] truncate rounded-sm border border-[#3B82F6]/50 bg-[#3B82F6]/20 px-2 text-[10px] leading-5 text-blue-200">
                    <TypedText text="Game HUD & Shaders" />
                  </div>
                </div>
              </div>

              {/* Build Clips */}
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 font-mono text-[10px] text-zinc-400">BUILDS</span>
                <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                  {featuredTimelineProjects.map((proj, idx) => (
                    <button
                      key={proj.id}
                      type="button"
                      data-cursor="plus"
                      onClick={() => onSelectProject(proj)}
                      title={`Inspect ${proj.title}`}
                      className={`h-7 min-w-[110px] flex-1 truncate rounded-sm border px-2 text-left text-[11px] font-medium transition-colors ${
                        idx % 2 === 0
                          ? 'border-accent/60 bg-accent/25 text-white hover:bg-accent/40'
                          : 'border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      {proj.index}. {proj.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DesignBlock>
      </div>
    </section>
  );
};
