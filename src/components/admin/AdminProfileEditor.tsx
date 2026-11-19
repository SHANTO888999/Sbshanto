import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
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
  Share2,
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
  SocialPlatformKey,
  TechStackItem,
  ViewerControlsConfig,
  WireframeRealScene,
} from '../../data/contentSchema';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CV_SETTINGS,
  DEFAULT_SOCIAL_NAMES,
  DEFAULT_VIEWER_CONTROLS,
  formatWhatsappHref,
  isValidEmailAddress,
  isValidPhoneIfPresent,
  sanitizeCvSourceUrl,
  sanitizeHexColor,
  sanitizePublicUrl,
} from '../../data/contentSchema';
import { ADMIN_INITIAL_BUNDLE } from '../../data/adminDefaults';
import { downloadPortfolioCv } from '../../utils/cvPdfGenerator';
import { handleFormEnterToNext } from '../../utils/formKeyboardNav';
import { processProjectPhotoFile } from '../../utils/mediaCompressor';
import { ACCENT_PRESETS, applyDocumentAccentTheme } from '../../utils/themeAccent';
import { SocialBrandLogo } from '../SocialBrandLogo';
import { getAdminCopy, type AdminLang } from './adminI18n';
import { LimitedInput, LimitedTextarea, SafeUrlInput } from './FieldControls';

export type ProfileSubTab =
  | 'identity'
  | 'contact'
  | 'social'
  | 'metrics'
  | 'process'
  | 'viewer'
  | 'cv';

const COMPACT_VIEWER_TOGGLES: ReadonlyArray<{
  key: keyof ViewerControlsConfig;
  en: string;
  bn: string;
}> = [
  { key: 'showTopScrollBar', en: 'Top Scroll Progress Bar', bn: 'টপ স্ক্রল প্রগ্রেস লাইন' },
  { key: 'showMultiBackBar', en: 'Floating Back Button', bn: 'ফ্লোটিং ব্যাক বাটন' },
  { key: 'enableCursorsByDefault', en: 'Cursor Build Animation on Load', bn: 'পেজ লোডে কার্সর অ্যানিমেশন' },
  { key: 'enableAutoScrollByDefault', en: 'Auto-Scroll on Load', bn: 'অটো-স্ক্রল চালু রাখুন' },
  { key: 'enableSoundByDefault', en: 'Sound FX on Load', bn: 'সাউন্ড এফেক্ট চালু রাখুন' },
];

interface AdminProfileEditorProps {
  draft: PortfolioContentBundle;
  saving: boolean;
  lang?: AdminLang;
  hasUnsavedChanges?: boolean;
  subTab?: ProfileSubTab;
  onChangeSubTab?: (tab: ProfileSubTab) => void;
  onBack?: () => void;
  onChange: (next: PortfolioContentBundle) => void;
  onSave: () => Promise<boolean>;
}

export const AdminProfileEditor: React.FC<AdminProfileEditorProps> = ({
  draft,
  saving,
  lang = 'en',
  hasUnsavedChanges = false,
  subTab: controlledSubTab,
  onChangeSubTab,
  onBack,
  onChange,
  onSave,
}) => {
  const t = getAdminCopy(lang);
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
  const socialNames = p.socialNames ?? DEFAULT_SOCIAL_NAMES;

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

  const updateSocialName = (key: SocialPlatformKey, value: string) => {
    onChange({
      ...draft,
      profile: {
        ...draft.profile,
        socialNames: {
          ...socialNames,
          [key]: value,
        },
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
      rawPortrait === '' ||
      (rawPortrait.startsWith('data:image/') && rawPortrait.length <= 320_000) ||
      Boolean(sanitizePublicUrl(rawPortrait, '', false));
    if (!isValidPortrait) {
      return {
        tab: 'identity',
        message: 'Portrait URL must be empty, a valid https:// link, /assets/... path, or picked image.',
      };
    }

    if (!isValidEmailAddress(p.email)) {
      return { tab: 'contact', message: 'Enter a valid public studio contact email address.' };
    }
    if (!isValidPhoneIfPresent(p.phoneNumber)) {
      return {
        tab: 'contact',
        message: 'Contact / Phone number must contain 6–18 digits (e.g. +880 1XXX-XXXXXX).',
      };
    }
    if (!isValidPhoneIfPresent(p.whatsappNumber)) {
      return {
        tab: subTab === 'social' ? 'social' : 'contact',
        message: 'WhatsApp number must contain 6–18 digits (e.g. +880 1XXX-XXXXXX).',
      };
    }
    if (!sanitizePublicUrl(p.githubUrl, '', false)) {
      return {
        tab: 'social',
        message: 'GitHub Profile URL must start with https:// or http://.',
      };
    }
    if (p.twitterUrl.trim() && !sanitizePublicUrl(p.twitterUrl, '', false)) {
      return {
        tab: 'social',
        message: 'Twitter / X URL must start with https:// or http://.',
      };
    }
    if (p.behanceUrl.trim() && !sanitizePublicUrl(p.behanceUrl, '', false)) {
      return {
        tab: 'social',
        message: 'Behance URL must start with https:// or http://.',
      };
    }
    if (p.facebookUrl.trim() && !sanitizePublicUrl(p.facebookUrl, '', false)) {
      return {
        tab: 'social',
        message: 'Facebook URL must start with https:// or http://.',
      };
    }
    if (p.linkedinUrl.trim() && !sanitizePublicUrl(p.linkedinUrl, '', false)) {
      return {
        tab: 'social',
        message: 'LinkedIn URL must start with https:// or http://.',
      };
    }
    if (p.instagramUrl.trim() && !sanitizePublicUrl(p.instagramUrl, '', false)) {
      return {
        tab: 'social',
        message: 'Instagram URL must start with https:// or http://.',
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
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
            {t.profile.heading}
          </h2>
          {hasUnsavedChanges && (
            <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              {t.common.unsavedChanges}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              applyDocumentAccentTheme(DEFAULT_VIEWER_CONTROLS.accentColor);
              onChange({
                ...draft,
                profile: ADMIN_INITIAL_BUNDLE.profile,
                viewerControls: DEFAULT_VIEWER_CONTROLS,
                cvSettings: DEFAULT_CV_SETTINGS,
                heroMetrics: ADMIN_INITIAL_BUNDLE.heroMetrics,
                techStack: ADMIN_INITIAL_BUNDLE.techStack,
                services: ADMIN_INITIAL_BUNDLE.services,
                wireframeScenes: ADMIN_INITIAL_BUNDLE.wireframeScenes,
                techPartners: ADMIN_INITIAL_BUNDLE.techPartners,
              });
            }}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t.profile.loadDefaults}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {saving ? t.common.saving : t.profile.saveSettings}
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
            { id: 'identity', label: t.nav.subProfile.identity },
            { id: 'contact', label: t.nav.subProfile.contact },
            { id: 'social', label: t.nav.subProfile.social },
            { id: 'metrics', label: t.nav.subProfile.metrics },
            { id: 'process', label: t.nav.subProfile.process },
            { id: 'viewer', label: t.nav.subProfile.viewer },
            { id: 'cv', label: t.nav.subProfile.cv },
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
                {p.portraitUrl !== ADMIN_INITIAL_BUNDLE.profile.portraitUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateProfile('portraitUrl', ADMIN_INITIAL_BUNDLE.profile.portraitUrl);
                      setPortraitNote(null);
                      setFormError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    Reset Portrait Path
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
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3.5 py-2 text-xs font-medium text-white hover:border-accent/60 hover:bg-[#161922] disabled:opacity-50"
                >
                  {portraitBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent-light" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-accent-light" aria-hidden="true" />
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
                  label="Portrait Path / URL (optional)"
                  value={p.portraitUrl}
                  maxLength={500}
                  onChange={(v) => updateProfile('portraitUrl', v)}
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
                  {portraitLoadFailed || !p.portraitUrl ? (
                    <span className="font-display text-xl font-bold text-zinc-500">
                      {p.displayName.slice(0, 2)}
                    </span>
                  ) : (
                    <img
                      src={p.portraitUrl}
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
                  <p className="mt-0.5 truncate font-mono text-[11px] text-accent-light">
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
            <div className="space-y-4 rounded-xl border border-white/10 bg-[#090A0F] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  {lang === 'bn'
                    ? 'ওয়েবসাইটের নিচের কন্টাক্ট ডিটেইলস'
                    : 'Footer Direct Contact Details'}
                </p>
                <button
                  type="button"
                  onClick={() => setSubTab('social')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-light hover:bg-accent/20"
                >
                  <Share2 className="h-3 w-3" aria-hidden="true" />
                  {lang === 'bn' ? 'সোশ্যাল মিডিয়া যোগ করুন' : 'Social Media Links →'}
                </button>
              </div>

              <LimitedInput
                id="prof-email"
                label={lang === 'bn' ? 'ইমেইল অ্যাড্রেস (Email)' : 'Public Studio Contact Email'}
                type="email"
                value={p.email}
                maxLength={80}
                required
                onChange={(v) => updateProfile('email', v)}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LimitedInput
                  id="prof-whatsapp"
                  label={lang === 'bn' ? 'হোয়াটসঅ্যাপ নম্বর (WhatsApp)' : 'WhatsApp Number'}
                  type="tel"
                  value={p.whatsappNumber}
                  maxLength={24}
                  placeholder="+880 1XXX-XXXXXX"
                  onChange={(v) => updateProfile('whatsappNumber', v)}
                />
                <LimitedInput
                  id="prof-phone"
                  label={lang === 'bn' ? 'ফোন / কন্টাক্ট নম্বর (Phone)' : 'Contact / Phone Number'}
                  type="tel"
                  value={p.phoneNumber}
                  maxLength={24}
                  placeholder="+880 1XXX-XXXXXX"
                  onChange={(v) => updateProfile('phoneNumber', v)}
                />
              </div>

              <LimitedInput
                id="prof-location"
                label={lang === 'bn' ? 'ঠিকানা / শহর (Location)' : 'Location / City'}
                value={p.location}
                maxLength={60}
                placeholder="Dhaka, Bangladesh"
                onChange={(v) => updateProfile('location', v)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="prof-gh-handle"
                label={lang === 'bn' ? 'গিটহাব হ্যান্ডেল (CV-এর জন্য)' : 'GitHub Handle Label'}
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

      {subTab === 'social' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#090A0F] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {lang === 'bn'
                    ? 'সোশ্যাল মিডিয়া লিংক ও অ্যাকাউন্টের নাম'
                    : 'Social Media Links & Account Display Names'}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {lang === 'bn'
                    ? 'প্রতিটি প্ল্যাটফর্মের লিংক এবং আপনার অ্যাকাউন্টের নাম (যেমন: Shanto) লিখুন। মেইন ওয়েবসাইটে লোগোর পাশে সেই নাম দেখা যাবে।'
                    : 'Add your social profile link and optional account display name (e.g. Shanto). Your public site shows the brand logo right next to your account name.'}
                </p>
              </div>
              <span className="rounded border border-white/10 bg-[#12131A] px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                {[
                  p.facebookUrl,
                  formatWhatsappHref(p.whatsappNumber),
                  p.instagramUrl,
                  p.linkedinUrl,
                  p.twitterUrl,
                  p.behanceUrl,
                  p.githubUrl,
                ].filter(Boolean).length}{' '}
                / 7 {lang === 'bn' ? 'সক্রিয়' : 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(
              [
                {
                  id: 'facebook',
                  title: 'Facebook',
                  bnTitle: 'ফেসবুক (Facebook)',
                  urlKey: 'facebookUrl',
                  placeholder: 'https://facebook.com/your.profile',
                  namePlaceholder: 'Shanto',
                },
                {
                  id: 'whatsapp',
                  title: 'WhatsApp',
                  bnTitle: 'হোয়াটসঅ্যাপ (WhatsApp)',
                  isPhone: true,
                  placeholder: '+880 1XXX-XXXXXX',
                  namePlaceholder: 'Shanto',
                },
                {
                  id: 'instagram',
                  title: 'Instagram',
                  bnTitle: 'ইনস্টাগ্রাম (Instagram)',
                  urlKey: 'instagramUrl',
                  placeholder: 'https://instagram.com/your.handle',
                  namePlaceholder: '@shanto',
                },
                {
                  id: 'linkedin',
                  title: 'LinkedIn',
                  bnTitle: 'লিংকডইন (LinkedIn)',
                  urlKey: 'linkedinUrl',
                  placeholder: 'https://linkedin.com/in/your-name',
                  namePlaceholder: 'Shanto',
                },
                {
                  id: 'twitter',
                  title: 'Twitter / X',
                  bnTitle: 'টুইটার / X',
                  urlKey: 'twitterUrl',
                  placeholder: 'https://x.com/your_handle',
                  namePlaceholder: '@shanto',
                },
                {
                  id: 'behance',
                  title: 'Behance',
                  bnTitle: 'বিহ্যান্স (Behance)',
                  urlKey: 'behanceUrl',
                  placeholder: 'https://behance.net/yourname',
                  namePlaceholder: 'Shanto',
                },
                {
                  id: 'github',
                  title: 'GitHub',
                  bnTitle: 'গিটহাব (GitHub)',
                  urlKey: 'githubUrl',
                  required: true,
                  placeholder: 'https://github.com/your-username',
                  namePlaceholder: p.githubHandle || 'Shanto',
                },
              ] as Array<{
                id: SocialPlatformKey;
                title: string;
                bnTitle: string;
                urlKey?:
                  | 'facebookUrl'
                  | 'instagramUrl'
                  | 'linkedinUrl'
                  | 'twitterUrl'
                  | 'behanceUrl'
                  | 'githubUrl';
                isPhone?: boolean;
                required?: boolean;
                placeholder: string;
                namePlaceholder: string;
              }>
            ).map((platform) => {
              const urlKey = platform.urlKey;
              const rawValue = urlKey ? p[urlKey] : '';
              const isActive = platform.isPhone
                ? Boolean(formatWhatsappHref(p.whatsappNumber))
                : Boolean(sanitizePublicUrl(rawValue, '', false));
              const accountName = socialNames[platform.id] ?? '';
              const previewLabel =
                accountName.trim() ||
                (platform.id === 'github' ? p.githubHandle.trim() || 'GitHub' : platform.title);

              return (
                <div
                  key={platform.id}
                  className={`space-y-3.5 rounded-xl border p-4 transition-colors ${
                    isActive
                      ? 'border-white/15 bg-[#090A0F]'
                      : 'border-white/8 bg-[#08090D]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <SocialBrandLogo id={platform.id} className="h-4 w-4 shrink-0 fill-current text-accent-light" />
                      <span>{lang === 'bn' ? platform.bnTitle : platform.title}</span>
                    </div>

                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                        <SocialBrandLogo id={platform.id} className="h-3.5 w-3.5 shrink-0 fill-current" />
                        <span>{previewLabel}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-75" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                        {lang === 'bn' ? 'যুক্ত নেই' : 'Not Added'}
                      </span>
                    )}
                  </div>

                  {platform.isPhone || !urlKey ? (
                    <LimitedInput
                      id={`social-url-${platform.id}`}
                      label={lang === 'bn' ? 'হোয়াটসঅ্যাপ নম্বর (WhatsApp Number)' : 'WhatsApp Phone Number'}
                      type="tel"
                      value={p.whatsappNumber}
                      maxLength={24}
                      placeholder={platform.placeholder}
                      hint={
                        lang === 'bn'
                          ? 'Contact & Quote ট্যাবের হোয়াটসঅ্যাপ নম্বরের সাথে যুক্ত থাকবে।'
                          : 'Synced with the WhatsApp number in Contact & Quote.'
                      }
                      onChange={(v) => updateProfile('whatsappNumber', v)}
                    />
                  ) : (
                    <SafeUrlInput
                      id={`social-url-${platform.id}`}
                      label={
                        lang === 'bn'
                          ? `${platform.title} প্রোফাইল লিংক (URL)`
                          : `${platform.title} Profile URL`
                      }
                      value={p[urlKey]}
                      maxLength={300}
                      required={platform.required}
                      placeholder={platform.placeholder}
                      autoPrefixHttps
                      lang={lang}
                      onChange={(v) => updateProfile(urlKey, v)}
                    />
                  )}

                  <LimitedInput
                    id={`social-name-${platform.id}`}
                    label={
                      lang === 'bn'
                        ? 'অ্যাকাউন্টের নাম (লোগোর পাশে দেখাবে)'
                        : 'Account Display Name (shown next to logo)'
                    }
                    value={accountName}
                    maxLength={40}
                    placeholder={platform.namePlaceholder}
                    onChange={(v) => updateSocialName(platform.id, v)}
                  />
                </div>
              );
            })}
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
                        className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
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
        <div className="space-y-5">
          {/* Cursor Speed & Brand Theme Accent Control */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Cursor Animation Speed */}
            <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-accent-light" aria-hidden="true" />
                  <h4 className="text-sm font-semibold text-white">
                    {lang === 'bn' ? 'কার্সর স্পিড' : 'Cursor Speed'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applyDocumentAccentTheme(DEFAULT_VIEWER_CONTROLS.accentColor);
                    onChange({
                      ...draft,
                      viewerControls: { ...DEFAULT_VIEWER_CONTROLS },
                    });
                  }}
                  className="rounded border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
                >
                  {lang === 'bn' ? 'রিসেট' : 'Reset'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'slow', label: lang === 'bn' ? 'স্লো · 0.65×' : 'Slow · 0.65×' },
                    { id: 'normal', label: lang === 'bn' ? 'নরমাল · 1.0×' : 'Normal · 1.0×' },
                    { id: 'fast', label: lang === 'bn' ? 'ফাস্ট · 1.7×' : 'Fast · 1.7×' },
                  ] as ReadonlyArray<{ id: CursorSpeed; label: string }>
                ).map((opt) => {
                  const selected = (vc.cursorSpeed ?? 'normal') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateViewerControl('cursorSpeed', opt.id)}
                      className={`rounded-md border px-2.5 py-2 text-center font-mono text-xs font-medium transition-colors ${
                        selected
                          ? 'border-accent bg-accent/15 text-white'
                          : 'border-white/10 bg-[#0D0F16] text-zinc-400 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Theme Accent Color */}
            <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-accent-light" aria-hidden="true" />
                  <h4 className="text-sm font-semibold text-white">
                    {lang === 'bn' ? 'থিম কালার' : 'Accent Color'}
                  </h4>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  {sanitizeHexColor(vc.accentColor, DEFAULT_ACCENT_COLOR)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((preset) => {
                  const active =
                    sanitizeHexColor(vc.accentColor, DEFAULT_ACCENT_COLOR) === preset.hex;
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateViewerControl('accentColor', preset.hex)}
                      title={preset.name}
                      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-white bg-white/10 text-white'
                          : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white/30"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.name.split(' ')[1] ?? preset.name}</span>
                    </button>
                  );
                })}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-[#0D0F16] px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/30">
                  <input
                    type="color"
                    aria-label="Pick custom accent color"
                    value={sanitizeHexColor(vc.accentColor, DEFAULT_ACCENT_COLOR)}
                    onChange={(e) => updateViewerControl('accentColor', e.target.value.toUpperCase())}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span>{lang === 'bn' ? 'কাস্টম' : 'Custom'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#090A0F]">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm font-medium text-white">{t.profile.starterDemosTitle}</span>
              <button
                type="button"
                role="switch"
                aria-checked={vc.showStarterDemoProjects !== false}
                aria-label={t.profile.starterDemosTitle}
                onClick={() =>
                  updateViewerControl(
                    'showStarterDemoProjects',
                    vc.showStarterDemoProjects === false
                  )
                }
                className={`relative inline-flex h-7 w-14 shrink-0 items-center justify-center rounded border px-2 font-mono text-[11px] font-bold transition-colors ${
                  vc.showStarterDemoProjects !== false
                    ? 'border-emerald-500 bg-emerald-600 text-white'
                    : 'border-white/15 bg-[#111218] text-zinc-400 hover:text-white'
                }`}
              >
                {vc.showStarterDemoProjects !== false ? 'ON' : 'OFF'}
              </button>
            </div>

            {COMPACT_VIEWER_TOGGLES.map((item) => {
              const enabled = Boolean(vc[item.key]);
              const label = lang === 'bn' ? item.bn : item.en;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="text-sm font-medium text-white">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={label}
                    onClick={() => updateViewerControl(item.key, !enabled)}
                    className={`relative inline-flex h-7 w-14 shrink-0 items-center justify-center rounded border px-2 font-mono text-[11px] font-bold transition-colors ${
                      enabled
                        ? 'border-accent bg-accent text-white'
                        : 'border-white/15 bg-[#111218] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'cv' && (
        <div className="space-y-5">
          {/* Public Visibility Switch */}
          <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#090A0F] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                  vc.showCvDownloadOnViewer
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/15 bg-white/5 text-zinc-400'
                }`}
              >
                {vc.showCvDownloadOnViewer ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{t.profile.publicCvTitle}</h3>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    vc.showCvDownloadOnViewer
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {vc.showCvDownloadOnViewer ? 'PUBLIC' : 'HIDDEN'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadPortfolioCv(draft)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 bg-[#101218] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/30 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t.overview.downloadCv}
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(vc.showCvDownloadOnViewer)}
                aria-label={t.profile.publicCvTitle}
                onClick={() =>
                  updateViewerControl('showCvDownloadOnViewer', !vc.showCvDownloadOnViewer)
                }
                className={`inline-flex h-[38px] w-16 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold transition-colors ${
                  vc.showCvDownloadOnViewer
                    ? 'border-emerald-500 bg-emerald-600 text-white'
                    : 'border-white/15 bg-[#12131A] text-zinc-300 hover:border-white/30 hover:text-white'
                }`}
              >
                {vc.showCvDownloadOnViewer ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* CV Source Mode & Content Options */}
          <div className="space-y-4 rounded-lg border border-white/10 bg-[#090A0F] p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateCvSettings('mode', 'auto')}
                className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                  cv.mode === 'auto'
                    ? 'border-accent bg-accent/12 text-white'
                    : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold">Auto PDF</div>
                  <div className="font-mono text-[11px] text-zinc-400">Generated from profile</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateCvSettings('mode', 'custom')}
                className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                  cv.mode === 'custom'
                    ? 'border-accent bg-accent/12 text-white'
                    : 'border-white/10 bg-[#0D0F16] text-zinc-300 hover:border-white/25'
                }`}
              >
                <Upload className="h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold">Custom PDF / URL</div>
                  <div className="font-mono text-[11px] text-zinc-400">&lt; 380 KB PDF or https://</div>
                </div>
              </button>
            </div>

            <LimitedInput
              id="cv-headline"
              label="CV Subtitle"
              value={cv.headline}
              maxLength={96}
              onChange={(v) => updateCvSettings('headline', v)}
            />

            {cv.mode === 'custom' && (
              <div className="space-y-3 rounded-lg border border-white/10 bg-[#050507] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-200">
                    Custom PDF / URL
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
                      {t.common.clear}
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
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3.5 py-2 text-xs font-medium text-white hover:border-accent/60 hover:bg-[#161922] disabled:opacity-50"
                  >
                    {cvBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent-light" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4 text-accent-light" aria-hidden="true" />
                    )}
                    {cvBusy ? t.common.working : 'Upload PDF'}
                  </button>
                </div>

                {(cvNote || cv.customUrl.startsWith('data:application/pdf')) && (
                  <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {cvNote ?? 'Custom PDF attached.'}
                  </p>
                )}

                {!cv.customUrl.startsWith('data:application/pdf') && (
                  <SafeUrlInput
                    id="cv-custom-url"
                    label="External PDF URL"
                    value={cv.customUrl}
                    maxLength={500}
                    onChange={(v) => updateCvSettings('customUrl', v)}
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
            {t.common.back}
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
          {saving ? t.common.saving : t.profile.saveSettings}
        </button>
      </div>
    </form>
  );
};
