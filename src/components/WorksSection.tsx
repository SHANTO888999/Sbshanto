import React, { useState } from 'react';
import { ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ProjectCategory, ProjectItem } from '../data/portfolioData';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { ProductPreviewCanvas } from './ProductPreviewCanvas';
import { DesignBlock, TypedText, useBlockStage, useCursorBuildPhase } from './DesignCursorSystem';

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
  const { stage, cursorsEnabled, isCloneHighlight } = useBlockStage();
  const { isMonochrome } = useCursorBuildPhase();
  const showingCloneTheme =
    isCloneCard && isCloneHighlight && (stage === 'layout-drag' || stage === 'type-draft');
  const mediaDropped =
    !cursorsEnabled ||
    stage === 'style-color' ||
    stage === 'place-drop' ||
    stage === 'done' ||
    showingCloneTheme;
  const placingMediaNow =
    cursorsEnabled && !showingCloneTheme && (stage === 'style-color' || stage === 'place-drop');

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
          <div className="relative aspect-video overflow-hidden bg-[#07080C]">
            {/* Wireframe media slot before cursor places the project photo/video */}
            {!mediaDropped && (
              <div
                aria-hidden="true"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-dashed border-[#38BDF8]/35 bg-[#090C14]"
              >
                <ImageIcon className="h-6 w-6 text-[#38BDF8]/55" />
                <span className="font-mono text-[10px] tracking-wider text-zinc-400">
                  MEDIA SLOT · DROPPING NEXT
                </span>
              </div>
            )}

            {/* Cursor visibly drops/places screenshot or video into the card media frame */}
            <motion.div
              data-media-drop-target="true"
              initial={false}
              animate={{
                opacity: mediaDropped ? 1 : 0,
                x: mediaDropped ? 0 : 28,
                y: mediaDropped ? 0 : -24,
                scale: mediaDropped ? 1 : 0.9,
              }}
              transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-full"
            >
              {placingMediaNow && (
                <div
                  data-media-drop-grab="true"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2 left-2 z-20 rounded bg-[#F59E0B] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#050507] shadow"
                >
                  PLACING MEDIA
                </div>
              )}

              <ProductPreviewCanvas
                theme={showingCloneTheme ? firstProject.previewTheme : project.previewTheme}
                coverImageUrl={showingCloneTheme ? firstProject.coverImageUrl : project.coverImageUrl}
                galleryUrls={showingCloneTheme ? firstProject.galleryUrls : project.galleryUrls}
                coverMediaType={showingCloneTheme ? firstProject.coverMediaType : project.coverMediaType}
                title={project.title}
                isAnimating={isHovered}
              />
            </motion.div>

            {showingCloneTheme && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[#38BDF8]/12 ring-2 ring-inset ring-[#38BDF8]/70"
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-[#0B0C11] px-4 py-2.5">
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
          <span
            data-cursor-color-target="true"
            className={`font-display text-2xl font-bold tabular-nums transition-colors duration-400 ${
              isMonochrome ? 'text-zinc-400' : 'text-accent'
            }`}
          >
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
    </article>
  );
};

const WorksFilterTabs: React.FC<{
  activeCategory: ProjectCategory;
  onSelect: (category: ProjectCategory) => void;
}> = ({ activeCategory, onSelect }) => {
  const { isMonochrome } = useCursorBuildPhase();

  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 transition-colors duration-300 ${
        isMonochrome ? 'border-white/15 bg-[#0D0E12]' : 'border-white/10 bg-[#111115]'
      }`}
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
            data-cursor-color-target="true"
            onClick={() => onSelect(category)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-300 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              isMonochrome
                ? isActive
                  ? 'border border-dashed border-white/35 bg-white/10 text-zinc-200'
                  : 'text-zinc-400'
                : isActive
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TypedText text={category} />
          </button>
        );
      })}
    </div>
  );
};

const CanvasLayerTree: React.FC<{
  featuredTimelineProjects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
}> = ({ featuredTimelineProjects, onSelectProject }) => {
  const { isMonochrome } = useCursorBuildPhase();

  return (
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
          <span className="w-12 shrink-0 font-mono text-[10px] text-zinc-500">
            <TypedText text="UI/UX" />
          </span>
          <div className="flex flex-1 items-center gap-1.5">
            <div
              data-cursor-color-target="true"
              className={`h-5 w-[22%] truncate rounded-sm border px-2 text-[10px] leading-5 transition-colors duration-400 ${
                isMonochrome
                  ? 'border-white/25 bg-white/5 text-zinc-300'
                  : 'border-[#3B82F6]/50 bg-[#3B82F6]/20 text-blue-200'
              }`}
            >
              <TypedText text="Figma Wireframe Grid" />
            </div>
            <div
              data-cursor-color-target="true"
              className={`ml-[5%] h-5 w-[30%] truncate rounded-sm border px-2 text-[10px] leading-5 transition-colors duration-400 ${
                isMonochrome
                  ? 'border-white/25 bg-white/5 text-zinc-300'
                  : 'border-[#3B82F6]/50 bg-[#3B82F6]/15 text-blue-200'
              }`}
            >
              <TypedText text="Design Tokens & Motion" />
            </div>
            <div
              data-cursor-color-target="true"
              className={`ml-[5%] h-5 w-[24%] truncate rounded-sm border px-2 text-[10px] leading-5 transition-colors duration-400 ${
                isMonochrome
                  ? 'border-white/25 bg-white/5 text-zinc-300'
                  : 'border-[#3B82F6]/50 bg-[#3B82F6]/20 text-blue-200'
              }`}
            >
              <TypedText text="Game HUD & Shaders" />
            </div>
          </div>
        </div>

        {/* Build Clips */}
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-mono text-[10px] text-zinc-400">
            <TypedText text="BUILDS" />
          </span>
          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {featuredTimelineProjects.map((proj, idx) => (
              <button
                key={proj.id}
                type="button"
                data-cursor="plus"
                data-cursor-color-target="true"
                onClick={() => onSelectProject(proj)}
                title={`Inspect ${proj.title}`}
                className={`h-7 min-w-[110px] flex-1 truncate rounded-sm border px-2 text-left text-[11px] font-medium transition-colors duration-300 ${
                  isMonochrome
                    ? 'border-dashed border-white/25 bg-white/5 text-zinc-300'
                    : idx % 2 === 0
                      ? 'border-accent/60 bg-accent/25 text-white hover:bg-accent/40'
                      : 'border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <TypedText text={`${proj.index}. ${proj.title}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
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
    <section id="works" className="border-b border-white/10 bg-[#08080A] py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <DesignBlock label="Section / Selected Works">
          <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                <TypedText text="Websites · Applications · Interactive Games" />
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                <TypedText text="WORKS THAT " accentText="SHIP." accentClassName="text-accent" resizeScale />
              </h2>
            </div>

            <WorksFilterTabs activeCategory={activeCategory} onSelect={setActiveCategory} />
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
          <CanvasLayerTree
            featuredTimelineProjects={featuredTimelineProjects}
            onSelectProject={onSelectProject}
          />
        </DesignBlock>
      </div>
    </section>
  );
};
