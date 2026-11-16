import React, { useState } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import type {
  HeroMetricItem,
  PortfolioContentBundle,
  ServiceItem,
  SiteProfile,
  TechStackItem,
  WireframeRealScene,
} from '../../data/contentSchema';
import { DEFAULT_PORTFOLIO_CONTENT } from '../../data/portfolioData';
import { LimitedInput, LimitedTextarea, SafeUrlInput } from './FieldControls';

interface AdminProfileEditorProps {
  draft: PortfolioContentBundle;
  saving: boolean;
  onChange: (next: PortfolioContentBundle) => void;
  onSave: () => Promise<void>;
}

type ProfileSubTab = 'identity' | 'contact' | 'metrics' | 'process';

export const AdminProfileEditor: React.FC<AdminProfileEditorProps> = ({
  draft,
  saving,
  onChange,
  onSave,
}) => {
  const [subTab, setSubTab] = useState<ProfileSubTab>('identity');
  const [portraitLoadFailed, setPortraitLoadFailed] = useState(false);

  const p = draft.profile;

  const updateProfile = <K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) => {
    if (key === 'portraitUrl') setPortraitLoadFailed(false);
    onChange({
      ...draft,
      profile: {
        ...draft.profile,
        [key]: value,
      },
    });
  };

  const updateHeroMetric = (idx: number, patch: Partial<HeroMetricItem>) => {
    const next = draft.heroMetrics.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...draft, heroMetrics: next });
  };

  const updateTechStack = (idx: number, patch: Partial<TechStackItem>) => {
    const next = draft.techStack.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    onChange({ ...draft, techStack: next });
  };

  const updateService = (idx: number, patch: Partial<ServiceItem>) => {
    const next = draft.services.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...draft, services: next });
  };

  const updateScene = (idx: number, patch: Partial<WireframeRealScene>) => {
    const next = draft.wireframeScenes.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...draft, wireframeScenes: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            PROFILE &amp; SITE COPY
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Edit personal identity, contact links, hero counters, services, and stack. Every field
            has safe layout limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onChange({
                ...draft,
                profile: DEFAULT_PORTFOLIO_CONTENT.profile,
                heroMetrics: DEFAULT_PORTFOLIO_CONTENT.heroMetrics,
                techStack: DEFAULT_PORTFOLIO_CONTENT.techStack,
                services: DEFAULT_PORTFOLIO_CONTENT.services,
                wireframeScenes: DEFAULT_PORTFOLIO_CONTENT.wireframeScenes,
                techPartners: DEFAULT_PORTFOLIO_CONTENT.techPartners,
              })
            }
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Load Safe Defaults
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {saving ? 'Saving Changes...' : 'Save Profile & Settings'}
          </button>
        </div>
      </div>

      {/* Sub-navigation segmented tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-[#08090D] p-1">
        {(
          [
            { id: 'identity', label: 'Hero & Portrait' },
            { id: 'contact', label: 'Contact, Quote & CTA' },
            { id: 'metrics', label: 'Metrics & Partners' },
            { id: 'process', label: 'Services, Stack & Scenes' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.id
                ? 'bg-[#DC2626] text-white'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'identity' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="prof-wordmark"
                label="Navbar Brand Wordmark"
                value={p.wordmark}
                maxLength={16}
                required
                onChange={(v) => updateProfile('wordmark', v)}
                hint="Shown top-left in navbar (trailing dot turns red)."
              />
              <LimitedInput
                id="prof-greeting"
                label="Hero Greeting Line"
                value={p.greeting}
                maxLength={32}
                required
                onChange={(v) => updateProfile('greeting', v)}
              />
              <LimitedInput
                id="prof-display-name"
                label="Hero Display Name"
                value={p.displayName}
                maxLength={18}
                required
                onChange={(v) => updateProfile('displayName', v)}
              />
              <LimitedInput
                id="prof-backdrop"
                label="Hero Backdrop Watermark"
                value={p.backdropName}
                maxLength={10}
                required
                onChange={(v) => updateProfile('backdropName', v.toUpperCase())}
                hint="Keep <= 10 uppercase chars so it stays framed behind portrait."
              />
            </div>

            <LimitedInput
              id="prof-role"
              label="Primary Discipline Role Line"
              value={p.role}
              maxLength={64}
              required
              onChange={(v) => updateProfile('role', v)}
            />

            <LimitedTextarea
              id="prof-bio"
              label="Hero Bio Summary"
              value={p.bio}
              maxLength={260}
              rows={3}
              required
              onChange={(v) => updateProfile('bio', v)}
            />

            <SafeUrlInput
              id="prof-portrait"
              label="Portrait Photo Path / URL"
              value={p.portraitUrl}
              maxLength={500}
              required
              onChange={(v) => updateProfile('portraitUrl', v)}
              hint="Default cutout: /assets/shanto-cutout.png (or any public https:// transparent PNG)."
            />
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Live Hero Safety Preview
              </p>
              <div className="mt-4 flex items-center gap-4 border-b border-white/10 pb-4">
                <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#12131A]">
                  {portraitLoadFailed ? (
                    <span className="font-display text-xl font-bold text-zinc-500">
                      {p.displayName.slice(0, 2)}
                    </span>
                  ) : (
                    <img
                      src={p.portraitUrl || '/assets/shanto-cutout.png'}
                      alt={p.displayName}
                      onError={() => setPortraitLoadFailed(true)}
                      className="h-full w-full object-cover object-top"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">{p.greeting || "Hello, I'm"}</p>
                  <p className="truncate font-display text-3xl font-bold tracking-tight text-white">
                    {p.displayName || 'SHANTO.'}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-[#EF4444]">
                    {p.role || 'WEB DEVELOPER'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-300">{p.bio}</p>
              {portraitLoadFailed && (
                <p className="mt-3 text-xs text-amber-400">
                  Portrait image URL could not load cleanly—fallback initials will protect the
                  viewer layout.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'contact' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <LimitedInput
              id="prof-email"
              label="Public Studio Contact Email"
              type="email"
              value={p.email}
              maxLength={80}
              required
              onChange={(v) => updateProfile('email', v)}
              hint="Displayed on Contact footer and mailto replies."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="prof-gh-handle"
                label="GitHub Handle Label"
                value={p.githubHandle}
                maxLength={40}
                required
                onChange={(v) => updateProfile('githubHandle', v)}
              />
              <LimitedInput
                id="prof-avail"
                label="Availability Label"
                value={p.availability}
                maxLength={40}
                required
                onChange={(v) => updateProfile('availability', v)}
              />
            </div>
            <SafeUrlInput
              id="prof-gh-url"
              label="GitHub Profile URL"
              value={p.githubUrl}
              maxLength={300}
              required
              onChange={(v) => updateProfile('githubUrl', v)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="prof-disc"
                label="Footer Discipline Summary"
                value={p.disciplineSummary}
                maxLength={40}
                required
                onChange={(v) => updateProfile('disciplineSummary', v)}
              />
              <LimitedInput
                id="prof-turnaround"
                label="Prototype Turnaround Stat"
                value={p.prototypeTurnaround}
                maxLength={24}
                required
                onChange={(v) => updateProfile('prototypeTurnaround', v)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <LimitedTextarea
              id="prof-quote"
              label="Featured Quote"
              value={p.quoteText}
              maxLength={180}
              rows={3}
              required
              onChange={(v) => updateProfile('quoteText', v)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="prof-quote-author"
                label="Quote Author"
                value={p.quoteAuthor}
                maxLength={32}
                required
                onChange={(v) => updateProfile('quoteAuthor', v)}
              />
              <LimitedInput
                id="prof-quote-role"
                label="Quote Role"
                value={p.quoteRole}
                maxLength={60}
                required
                onChange={(v) => updateProfile('quoteRole', v)}
              />
            </div>
            <LimitedTextarea
              id="prof-manifesto"
              label="Storytelling Lead Statement"
              value={p.manifestoLead}
              maxLength={200}
              rows={2}
              required
              onChange={(v) => updateProfile('manifestoLead', v)}
            />
            <LimitedTextarea
              id="prof-manifesto-avail"
              label="Contact Closing Availability Note"
              value={p.manifestoAvailability}
              maxLength={160}
              rows={2}
              required
              onChange={(v) => updateProfile('manifestoAvailability', v)}
            />
          </div>
        </div>
      )}

      {subTab === 'metrics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-[#090A0F] p-5 md:grid-cols-4">
            <LimitedInput
              id="prof-craft-val"
              label="Craft Metric Number"
              value={p.craftMetricValue}
              maxLength={8}
              required
              onChange={(v) => updateProfile('craftMetricValue', v)}
            />
            <LimitedInput
              id="prof-craft-suf"
              label="Suffix (+ / %)"
              value={p.craftMetricSuffix}
              maxLength={4}
              onChange={(v) => updateProfile('craftMetricSuffix', v)}
            />
            <div className="md:col-span-2">
              <LimitedInput
                id="prof-craft-label"
                label="Craft Metric Heading"
                value={p.craftMetricLabel}
                maxLength={48}
                required
                onChange={(v) => updateProfile('craftMetricLabel', v)}
              />
            </div>
            <div className="md:col-span-4">
              <LimitedTextarea
                id="prof-craft-sum"
                label="Craft Statement Paragraph"
                value={p.craftSummary}
                maxLength={220}
                rows={2}
                required
                onChange={(v) => updateProfile('craftSummary', v)}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Hero KPI Strip ({draft.heroMetrics.length}/4)
              </h3>
              {draft.heroMetrics.length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      heroMetrics: [
                        ...draft.heroMetrics,
                        { value: '10+', label: 'New Metric Label' },
                      ],
                    })
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add KPI
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {draft.heroMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#090A0F] p-4"
                >
                  <div className="w-24 shrink-0">
                    <LimitedInput
                      id={`hm-val-${idx}`}
                      label="Value"
                      value={metric.value}
                      maxLength={10}
                      required
                      onChange={(v) => updateHeroMetric(idx, { value: v })}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <LimitedInput
                      id={`hm-lbl-${idx}`}
                      label="Label"
                      value={metric.label}
                      maxLength={52}
                      required
                      onChange={(v) => updateHeroMetric(idx, { label: v })}
                    />
                  </div>
                  {draft.heroMetrics.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          heroMetrics: draft.heroMetrics.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label={`Remove metric ${idx + 1}`}
                      className="mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:border-[#DC2626]/40 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Core Technologies Marquee Strip ({draft.techPartners.length}/8)
              </h3>
              {draft.techPartners.length < 8 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      techPartners: [...draft.techPartners, 'FIREBASE'],
                    })
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Tech
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {draft.techPartners.map((partner, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <LimitedInput
                      id={`partner-${idx}`}
                      label={`Tech ${idx + 1}`}
                      value={partner}
                      maxLength={24}
                      required
                      onChange={(v) => {
                        const next = draft.techPartners.map((item, i) =>
                          i === idx ? v.toUpperCase() : item
                        );
                        onChange({ ...draft, techPartners: next });
                      }}
                    />
                  </div>
                  {draft.techPartners.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          techPartners: draft.techPartners.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label={`Remove tech partner ${idx + 1}`}
                      className="inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'process' && (
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Studio Services ({draft.services.length}/6)
              </h3>
              {draft.services.length < 6 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      services: [
                        ...draft.services,
                        {
                          index: String(draft.services.length + 1).padStart(2, '0'),
                          title: 'Custom Solution',
                          detail: 'End-to-end engineering from wireframe to shipped product.',
                        },
                      ],
                    })
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Service
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {draft.services.map((srv, idx) => (
                <div
                  key={idx}
                  className="space-y-3 rounded-lg border border-white/10 bg-[#090A0F] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-20 shrink-0">
                      <LimitedInput
                        id={`srv-idx-${idx}`}
                        label="No."
                        value={srv.index}
                        maxLength={4}
                        required
                        onChange={(v) => updateService(idx, { index: v })}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <LimitedInput
                        id={`srv-title-${idx}`}
                        label="Service Title"
                        value={srv.title}
                        maxLength={48}
                        required
                        onChange={(v) => updateService(idx, { title: v })}
                      />
                    </div>
                    {draft.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...draft,
                            services: draft.services.filter((_, i) => i !== idx),
                          })
                        }
                        aria-label={`Remove service ${idx + 1}`}
                        className="mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <LimitedTextarea
                    id={`srv-detail-${idx}`}
                    label="Service Description"
                    value={srv.detail}
                    maxLength={140}
                    rows={2}
                    required
                    onChange={(v) => updateService(idx, { detail: v })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Primary Tech Stack Rows ({draft.techStack.length}/8)
              </h3>
              {draft.techStack.length < 8 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      techStack: [
                        ...draft.techStack,
                        { name: 'Firebase & Cloud', role: 'Realtime Database & Auth' },
                      ],
                    })
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Stack Row
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {draft.techStack.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#090A0F] p-4"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <LimitedInput
                      id={`ts-name-${idx}`}
                      label="Technology"
                      value={item.name}
                      maxLength={40}
                      required
                      onChange={(v) => updateTechStack(idx, { name: v })}
                    />
                    <LimitedInput
                      id={`ts-role-${idx}`}
                      label="Engineering Role"
                      value={item.role}
                      maxLength={56}
                      required
                      onChange={(v) => updateTechStack(idx, { role: v })}
                    />
                  </div>
                  {draft.techStack.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          techStack: draft.techStack.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label={`Remove stack item ${idx + 1}`}
                      className="mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">
              Raw-to-Real Wireframe Scenes ({draft.wireframeScenes.length}/6)
            </h3>
            <div className="space-y-4">
              {draft.wireframeScenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className="space-y-3 rounded-lg border border-white/10 bg-[#090A0F] p-4"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <LimitedInput
                      id={`sc-lbl-${idx}`}
                      label="Scene Title"
                      value={scene.label}
                      maxLength={64}
                      required
                      onChange={(v) => updateScene(idx, { label: v })}
                    />
                    <LimitedInput
                      id={`sc-spec-${idx}`}
                      label="Technical Specs"
                      value={scene.specs}
                      maxLength={72}
                      required
                      onChange={(v) => updateScene(idx, { specs: v })}
                    />
                    <div>
                      <label
                        htmlFor={`sc-theme-${idx}`}
                        className="block text-xs font-medium text-zinc-200"
                      >
                        Canvas Render Scene
                      </label>
                      <select
                        id={`sc-theme-${idx}`}
                        value={scene.theme}
                        onChange={(e) =>
                          updateScene(idx, {
                            theme: e.target.value as WireframeRealScene['theme'],
                          })
                        }
                        className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 text-sm text-white focus:border-[#DC2626] focus:outline-none"
                      >
                        <option value="web-build">Website Wireframe vs Live</option>
                        <option value="app-ui">App Wireframe vs Live</option>
                        <option value="game-engine">Game Greybox vs Playable</option>
                      </select>
                    </div>
                  </div>
                  <LimitedTextarea
                    id={`sc-notes-${idx}`}
                    label="Process Notes"
                    value={scene.notes}
                    maxLength={200}
                    rows={2}
                    required
                    onChange={(v) => updateScene(idx, { notes: v })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
