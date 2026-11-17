import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  CursorSpeed,
  CvSettingsConfig,
  HeroMetricItem,
  PortfolioContentBundle,
  ServiceItem,
  SiteProfile,
  TechStackItem,
  ViewerControlsConfig,
  WireframeRealScene,
} from '../../data/contentSchema';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CV_SETTINGS,
  DEFAULT_VIEWER_CONTROLS,
  isValidEmailAddress,
  sanitizeCvSourceUrl,
  sanitizeHexColor,
  sanitizePublicUrl,
} from '../../data/contentSchema';
import { DEFAULT_PORTFOLIO_CONTENT } from '../../data/portfolioData';
import { downloadPortfolioCv } from '../../utils/cvPdfGenerator';
import { handleFormEnterToNext } from '../../utils/formKeyboardNav';
import { processProjectPhotoFile } from '../../utils/mediaCompressor';
import { ACCENT_PRESETS, applyDocumentAccentTheme } from '../../utils/themeAccent';
import { ProductPreviewCanvas } from '../ProductPreviewCanvas';
import { LimitedInput, LimitedTextarea, SafeUrlInput } from './FieldControls';

export type ProfileSubTab = 'identity' | 'contact' | 'metrics' | 'process' | 'viewer' | 'cv';

interface ViewerToggleDef {
  key: keyof ViewerControlsConfig;
  title: string;
  description: string;
}

const VIEWER_BAR_AND_LINE_TOGGLES: ReadonlyArray<ViewerToggleDef> = [
  {
    key: 'showTopScrollBar',
    title: 'Top Red Scroll Progress Line',
    description: 'Crimson thin line across the top edge showing page scroll progress.',
  },
  {
    key: 'showBottomHud',
    title: 'Bottom Control Bar Container',
    description: 'Show or hide the entire floating control bar at the bottom of the viewer page.',
  },
  {
    key: 'showHudProgress',
    title: 'Build Progress & Color Line',
    description: 'Shows cursor color dots, "0 / 36 built" text, and colorful gradient line.',
  },
  {
    key: 'showMultiBackBar',
    title: 'Viewer Multi-Back Button',
    description: 'Floating Back button for stepping back across sections, filters, and modals.',
  },
];

const VIEWER_BUTTON_TOGGLES: ReadonlyArray<ViewerToggleDef> = [
  {
    key: 'showHudCursors',
    title: 'Live Cursors On/Off Button',
    description: 'Button inside bottom bar to let visitors turn live cursors on or off.',
  },
  {
    key: 'showHudAutoScroll',
    title: 'Auto-Scroll / Skip / Play-Pause Button',
    description: 'Shows the Skip button during intro and Play/Pause auto-scroll button below.',
  },
  {
    key: 'showHudReplay',
    title: 'Replay Build Button',
    description: 'Lets visitors replay the multi-cursor page construction animation from top.',
  },
  {
    key: 'showHudSound',
    title: 'Sound Mute / Unmute Button',
    description: 'Speaker button inside the bottom bar to mute or enable cursor sound FX.',
  },
];

const VIEWER_DEFAULT_BEHAVIOR_TOGGLES: ReadonlyArray<ViewerToggleDef> = [
  {
    key: 'enableCursorsByDefault',
    title: 'Cursors Active When Page Loads',
    description: 'Start the multi-cursor wireframe-to-real animation automatically on open.',
  },
  {
    key: 'enableAutoScrollByDefault',
    title: 'Auto-Scroll Active When Page Loads',
    description: 'Automatically glide down sections as cursors finish building (if cursors on).',
  },
  {
    key: 'enableSoundByDefault',
    title: 'Cursor Sound On By Default',
    description: 'Enable interactive click/type cursor audio when page opens.',
  },
];

interface AdminProfileEditorProps {
  draft: PortfolioContentBundle;
  saving: boolean;
  subTab?: ProfileSubTab;
  onChangeSubTab?: (tab: ProfileSubTab) => void;
  onBack?: () => void;
  onChange: (next: PortfolioContentBundle) => void;
  onSave: () => Promise<boolean>;
}

export const AdminProfileEditor: React.FC<AdminProfileEditorProps> = ({
  draft,
  saving,
  subTab: controlledSubTab,
  onChangeSubTab,
  onBack,
  onChange,
  onSave,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<ProfileSubTab>('identity');
  const subTab = controlledSubTab ?? internalSubTab;
  const setSubTab = (tab: ProfileSubTab) => {
    setInternalSubTab(tab);
    onChangeSubTab?.(tab);
  };
  const [portraitLoadFailed, setPortraitLoadFailed] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitNote, setPortraitNote] = useState<string | null>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvNote, setCvNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const portraitInputRef = useRef<HTMLInputElement | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);

  const p = draft.profile;
  const cv = draft.cvSettings ?? DEFAULT_CV_SETTINGS;

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

  const vc = draft.viewerControls ?? DEFAULT_VIEWER_CONTROLS;
  const updateViewerControl = <K extends keyof ViewerControlsConfig>(
    key: K,
    value: ViewerControlsConfig[K]
  ) => {
    if (key === 'accentColor' && typeof value === 'string') {
      applyDocumentAccentTheme(value);
    }
    onChange({
      ...draft,
      viewerControls: {
        ...vc,
        [key]: value,
      },
    });
  };

  const updateCvSettings = <K extends keyof CvSettingsConfig>(
    key: K,
    value: CvSettingsConfig[K]
  ) => {
    onChange({
      ...draft,
      cvSettings: {
        ...cv,
        [key]: value,
      },
    });
  };

  const handleCvPdfPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    setCvNote(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFormError('Please select a PDF (.pdf) file for your custom CV.');
      return;
    }
    if (file.size > 380 * 1024) {
      setFormError(
        'Selected PDF exceeds 380 KB for direct cloud storage. Compress the PDF under 380 KB or paste an external Google Drive / hosted PDF link instead.'
      );
      return;
    }

    setCvBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read PDF file.'));
        };
        reader.onerror = () => reject(new Error('Failed to read selected PDF file.'));
        reader.readAsDataURL(file);
      });
      const safe = sanitizeCvSourceUrl(dataUrl);
      if (!safe) {
        setFormError('PDF could not be encoded within safe cloud document limits. Use a smaller PDF or URL.');
        return;
      }
      onChange({
        ...draft,
        cvSettings: {
          ...cv,
          mode: 'custom',
          customUrl: safe,
        },
      });
      setCvNote(`Attached "${file.name}" (${Math.round(file.size / 1024)} KB)`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to attach PDF.');
    } finally {
      setCvBusy(false);
    }
  };

  const handlePortraitPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    setPortraitNote(null);
    setPortraitBusy(true);
    try {
      const result = await processProjectPhotoFile(file, {
        maxDataUrlLength: 250_000,
        hardCapLength: 315_000,
      });
      updateProfile('portraitUrl', result.dataUrl);
      setPortraitNote(`Portrait photo ready (${result.sizeKB} KB)`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to process selected portrait image.');
    } finally {
      setPortraitBusy(false);
    }
  };

  const validateBeforeSave = (): { tab: ProfileSubTab; message: string } | null => {
    const reqText = (val: string) => val.trim().length > 0;
    if (
      !reqText(p.wordmark) ||
      !reqText(p.greeting) ||
      !reqText(p.displayName) ||
      !reqText(p.backdropName) ||
      !reqText(p.role) ||
      !reqText(p.bio)
    ) {
      return { tab: 'identity', message: 'Fill in all required Hero & Identity fields before saving.' };
    }
    const rawPortrait = p.portraitUrl.trim();
    const isValidPortrait =
      (rawPortrait.startsWith('data:image/') && rawPortrait.length <= 320_000) ||
      Boolean(sanitizePublicUrl(rawPortrait, '', false));
    if (!isValidPortrait) {
      return {
        tab: 'identity',
        message: 'Portrait URL must be a valid https:// link, /assets/... path, or picked image.',
      };
    }

    if (!isValidEmailAddress(p.email)) {
      return { tab: 'contact', message: 'Enter a valid public studio contact email address.' };
    }
    if (!sanitizePublicUrl(p.githubUrl, '', false)) {
      return {
        tab: 'contact',
        message: 'GitHub Profile URL must start with https:// or http://.',
      };
    }
    if (
      !reqText(p.githubHandle) ||
      !reqText(p.availability) ||
      !reqText(p.disciplineSummary) ||
      !reqText(p.prototypeTurnaround) ||
      !reqText(p.quoteText) ||
      !reqText(p.quoteAuthor) ||
      !reqText(p.quoteRole) ||
      !reqText(p.manifestoLead) ||
      !reqText(p.manifestoAvailability)
    ) {
      return { tab: 'contact', message: 'Complete all Contact, Quote & CTA fields before saving.' };
    }

    if (
      !reqText(p.craftMetricValue) ||
      !reqText(p.craftMetricLabel) ||
      !reqText(p.craftSummary) ||
      draft.heroMetrics.some((m) => !reqText(m.value) || !reqText(m.label)) ||
      draft.techPartners.some((tp) => !reqText(tp))
    ) {
      return { tab: 'metrics', message: 'Every KPI metric and partner badge needs non-empty text.' };
    }

    if (
      draft.services.some((s) => !reqText(s.index) || !reqText(s.title) || !reqText(s.detail)) ||
      draft.techStack.some((t) => !reqText(t.name) || !reqText(t.role)) ||
      draft.wireframeScenes.some((sc) => !reqText(sc.label) || !reqText(sc.specs) || !reqText(sc.notes))
    ) {
      return {
        tab: 'process',
        message: 'All Services, Tech Stack rows, and Wireframe Scenes must be filled out.',
      };
    }

    if (cv.mode === 'custom' && !sanitizeCvSourceUrl(cv.customUrl)) {
      return {
        tab: 'cv',
        message: 'Custom CV mode needs a valid https:// PDF link or an uploaded PDF file.',
      };
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (portraitBusy) return;
    const issue = validateBeforeSave();
    if (issue) {
      setSubTab(issue.tab);
      setFormError(issue.message);
      return;
    }
    setFormError(null);
    await onSave();
  };

  const isUploadedPortrait = p.portraitUrl.startsWith('data:');

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleFormEnterToNext}
      className="space-y-6 pb-8"
    >
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
            onClick={() => {
              applyDocumentAccentTheme(DEFAULT_VIEWER_CONTROLS.accentColor);
              onChange({
                ...draft,
                profile: DEFAULT_PORTFOLIO_CONTENT.profile,
                viewerControls: DEFAULT_VIEWER_CONTROLS,
                cvSettings: DEFAULT_CV_SETTINGS,
                heroMetrics: DEFAULT_PORTFOLIO_CONTENT.heroMetrics,
                techStack: DEFAULT_PORTFOLIO_CONTENT.techStack,
                services: DEFAULT_PORTFOLIO_CONTENT.services,
                wireframeScenes: DEFAULT_PORTFOLIO_CONTENT.wireframeScenes,
                techPartners: DEFAULT_PORTFOLIO_CONTENT.techPartners,
              });
            }}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Load Safe Defaults
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {saving ? 'Saving Changes...' : 'Save Profile & Settings'}
          </button>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-red-200"
        >
          <span>{formError}</span>
          <button
            type="button"
            onClick={() => setFormError(null)}
            aria-label="Dismiss validation error"
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sub-navigation segmented tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-[#08090D] p-1">
        {(
          [
            { id: 'identity', label: 'Hero & Portrait' },
            { id: 'contact', label: 'Contact, Quote & CTA' },
            { id: 'metrics', label: 'Metrics & Partners' },
            { id: 'process', label: 'Services, Stack & Scenes' },
            { id: 'viewer', label: 'Viewer Controls' },
            { id: 'cv', label: 'Resume / CV' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.id
                ? 'bg-accent text-white'
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

            <div className="space-y-3 rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-200">Hero Portrait Photo</span>
                {p.portraitUrl !== DEFAULT_PORTFOLIO_CONTENT.profile.portraitUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateProfile('portraitUrl', DEFAULT_PORTFOLIO_CONTENT.profile.portraitUrl);
                      setPortraitNote(null);
                      setFormError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    Reset Default Cutout
                  </button>
                )}
              </div>

              <input
                ref={portraitInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePortraitPicked}
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={portraitBusy || saving}
                  onClick={() => portraitInputRef.current?.click()}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3.5 py-2 text-xs font-medium text-white hover:border-[#DC2626]/60 hover:bg-[#161922] disabled:opacity-50"
                >
                  {portraitBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#EF4444]" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                  )}
                  {portraitBusy ? 'Optimizing Photo...' : 'Pick Portrait From Device'}
                </button>
              </div>

              {(portraitNote || isUploadedPortrait) && (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {portraitNote ?? 'Custom portrait photo attached from device.'}
                </p>
              )}

              {!isUploadedPortrait && (
                <SafeUrlInput
                  id="prof-portrait"
                  label="Or Paste Portrait Path / URL"
                  value={p.portraitUrl}
                  maxLength={500}
                  required
                  onChange={(v) => updateProfile('portraitUrl', v)}
                  hint="Default cutout: /assets/shanto-cutout.png (or any public https:// transparent PNG)."
                />
              )}
            </div>
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
                  onClick={() => {
                    const maxNum = draft.services.reduce(
                      (max, item) => Math.max(max, Number.parseInt(item.index, 10) || 0),
                      0
                    );
                    onChange({
                      ...draft,
                      services: [
                        ...draft.services,
                        {
                          index: String(maxNum + 1).padStart(2, '0'),
                          title: 'Custom Solution',
                          detail: 'End-to-end engineering from wireframe to shipped product.',
                        },
                      ],
                    });
                  }}
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

      {subTab === 'viewer' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#090A0F] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-light">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Viewer Page Controls, Speed &amp; Accent Theme
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                  Control cursor animation speed, brand accent color, bottom bar buttons, and
                  public CV visibility. Tap Save Profile &amp; Settings to publish changes.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  applyDocumentAccentTheme(DEFAULT_VIEWER_CONTROLS.accentColor);
                  onChange({
                    ...draft,
                    viewerControls: { ...DEFAULT_VIEWER_CONTROLS },
                  });
                }}
                className="min-h-[36px] rounded-md border border-white/15 bg-[#101218] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
              >
                Reset Viewer Defaults
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    viewerControls: {
                      ...vc,
                      showTopScrollBar: false,
                      showBottomHud: false,
                      showHudProgress: false,
                      showHudCursors: false,
                      showHudAutoScroll: false,
                      showHudReplay: false,
                      showHudSound: false,
                    },
                  })
                }
                className="min-h-[36px] rounded-md border border-white/15 bg-[#101218] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
              >
                Hide All Bottom Bars
              </button>
            </div>
          </div>

          {/* Cursor Speed & Brand Theme Accent Control */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Cursor Animation Speed */}
            <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
              <div className="flex items-center gap-2.5">
                <Gauge className="h-4 w-4 text-accent-light" aria-hidden="true" />
                <h4 className="text-sm font-semibold text-white">Cursor Animation Speed</h4>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Choose how fast the 18 design cursors build sections and glide across the public site.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'slow', label: 'Slow', sub: 'Cinematic 0.65×' },
                    { id: 'normal', label: 'Normal', sub: 'Balanced 1.0×' },
                    { id: 'fast', label: 'Fast', sub: 'Snappy 1.7×' },
                  ] as ReadonlyArray<{ id: CursorSpeed; label: string; sub: string }>
                ).map((opt) => {
                  const selected = (vc.cursorSpeed ?? 'normal') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateViewerControl('cursorSpeed', opt.id)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? 'border-accent bg-accent/15 text-white'
                          : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-400">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Theme Accent Color */}
            <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Palette className="h-4 w-4 text-accent-light" aria-hidden="true" />
                  <h4 className="text-sm font-semibold text-white">Brand Theme Accent Color</h4>
                </div>
                <span className="font-mono text-xs text-zinc-300">
                  {sanitizeHexColor(vc.accentColor, DEFAULT_ACCENT_COLOR)}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Replaces red highlights, buttons, borders, and PDF accent color across the entire site.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((preset) => {
                  const active =
                    sanitizeHexColor(vc.accentColor, DEFAULT_ACCENT_COLOR) === preset.hex;
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateViewerControl('accentColor', preset.hex)}
                      title={preset.name}
                      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-white bg-white/10 text-white'
                          : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.name.split(' ')[1] ?? preset.name}</span>
                    </button>
                  );
                })}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-[#0D0F16] px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/30">
                  <input
                    type="color"
                    aria-label="Pick custom accent color"
                    value={sanitizeHexColor(vc.accentColor, DEFAULT_ACCENT_COLOR)}
                    onChange={(e) => updateViewerControl('accentColor', e.target.value.toUpperCase())}
                    className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span>Custom</span>
                </label>
              </div>
            </div>
          </div>

          {[
            { heading: 'Bars & Color Lines', items: VIEWER_BAR_AND_LINE_TOGGLES },
            { heading: 'Bottom Bar Buttons', items: VIEWER_BUTTON_TOGGLES },
            { heading: 'Default Startup Behavior', items: VIEWER_DEFAULT_BEHAVIOR_TOGGLES },
          ].map((group) => (
            <div key={group.heading} className="space-y-3">
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {group.heading}
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {group.items.map((item) => {
                  const enabled = Boolean(vc[item.key]);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#090A0F] p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                          {item.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={item.title}
                        onClick={() => updateViewerControl(item.key, !enabled)}
                        className={`relative inline-flex h-8 w-16 shrink-0 items-center justify-between rounded-md border px-2 text-[11px] font-bold tracking-wide transition-colors ${
                          enabled
                            ? 'border-accent bg-accent text-white'
                            : 'border-white/15 bg-[#111218] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="mx-auto">{enabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'cv' && (
        <div className="space-y-6">
          {/* Public Visibility Switch Banner (CRITICAL Custom Condition) */}
          <div className="flex flex-col gap-4 rounded-xl border border-white/12 bg-[#090A0F] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  vc.showCvDownloadOnViewer
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/15 bg-white/5 text-zinc-400'
                }`}
              >
                {vc.showCvDownloadOnViewer ? (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Public Website CV Download Visibility
                  </h3>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      vc.showCvDownloadOnViewer
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {vc.showCvDownloadOnViewer
                      ? 'ON · Visible on Public Site'
                      : 'OFF · Admin Panel Only'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  When switched OFF (default), visitors on your public website will NOT see any CV
                  download button—you can still generate and download your PDF anytime right here in
                  the Admin Panel. Switch ON and Save when you want visitors to download it.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(vc.showCvDownloadOnViewer)}
              aria-label="Show CV Download on Public Website"
              onClick={() =>
                updateViewerControl('showCvDownloadOnViewer', !vc.showCvDownloadOnViewer)
              }
              className={`relative inline-flex h-10 w-24 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-bold tracking-wide transition-colors ${
                vc.showCvDownloadOnViewer
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-white/15 bg-[#12131A] text-zinc-300 hover:border-white/30 hover:text-white'
              }`}
            >
              {vc.showCvDownloadOnViewer ? 'PUBLIC ON' : 'ADMIN ONLY'}
            </button>
          </div>

          {/* Instant Admin Download & Preview */}
          <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-accent-light" aria-hidden="true" />
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Instant Admin CV PDF Generator
                </h4>
                <p className="mt-0.5 text-xs text-zinc-300">
                  Downloads a clean PDF built live from your Experience, Core Stack, Projects,
                  Milestones, and selected accent color (or opens your custom PDF if set below).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadPortfolioCv(draft)}
              className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark whitespace-nowrap"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download / Preview CV (PDF)
            </button>
          </div>

          {/* CV Source Mode & Content Options */}
          <div className="space-y-5 rounded-xl border border-white/10 bg-[#090A0F] p-5">
            <div>
              <h4 className="text-sm font-semibold text-white">Resume / CV Source</h4>
              <p className="mt-0.5 text-xs text-zinc-400">
                Use auto-generated dynamic PDF or upload/link your own custom PDF file.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateCvSettings('mode', 'auto')}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    cv.mode === 'auto'
                      ? 'border-accent bg-accent/12 text-white'
                      : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <div className="text-sm font-semibold">Auto-Generated PDF</div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Automatically formats your live bio, metrics, experience, stack, projects &amp;
                    milestones into a crisp A4 PDF.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateCvSettings('mode', 'custom')}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    cv.mode === 'custom'
                      ? 'border-accent bg-accent/12 text-white'
                      : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <div className="text-sm font-semibold">Custom PDF Upload / Link</div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Upload your own designed PDF file (&lt; 380 KB) or paste a direct PDF link
                    (Google Drive / hosted URL).
                  </p>
                </button>
              </div>
            </div>

            <LimitedInput
              id="cv-headline"
              label="CV Subtitle / Executive Headline"
              value={cv.headline}
              maxLength={96}
              onChange={(v) => updateCvSettings('headline', v)}
              hint="Shown beneath your name & role in the auto-generated PDF header."
            />

            {cv.mode === 'custom' && (
              <div className="space-y-3 rounded-lg border border-white/10 bg-[#050507] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-200">
                    Custom PDF File or Direct URL
                  </span>
                  {cv.customUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        updateCvSettings('customUrl', '');
                        setCvNote(null);
                      }}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Clear Custom PDF
                    </button>
                  )}
                </div>

                <input
                  ref={cvFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleCvPdfPicked}
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={cvBusy || saving}
                    onClick={() => cvFileInputRef.current?.click()}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3.5 py-2 text-xs font-medium text-white hover:border-accent/60 hover:bg-[#161922] disabled:opacity-50"
                  >
                    {cvBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent-light" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4 text-accent-light" aria-hidden="true" />
                    )}
                    {cvBusy ? 'Reading PDF...' : 'Upload PDF From Device'}
                  </button>
                </div>

                {(cvNote || cv.customUrl.startsWith('data:application/pdf')) && (
                  <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {cvNote ?? 'Custom PDF file attached and ready to download.'}
                  </p>
                )}

                {!cv.customUrl.startsWith('data:application/pdf') && (
                  <SafeUrlInput
                    id="cv-custom-url"
                    label="Or Paste External PDF URL (https://...)"
                    value={cv.customUrl}
                    maxLength={500}
                    onChange={(v) => updateCvSettings('customUrl', v)}
                    hint="Use a direct https:// link to your resume PDF."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {saving ? 'Saving Changes...' : 'Save Profile & Settings'}
        </button>
      </div>
    </form>
  );
};
