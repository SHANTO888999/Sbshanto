import React, { useEffect, useRef, useState } from 'react';
import {
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
  normalizeUserUrlInput,
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
import {
  ConfirmDialog,
  LimitedInput,
  LimitedTextarea,
  SafeUrlInput,
} from './FieldControls';

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
  { key: 'enableCursorsByDefault', en: 'Cursor Build Animation on Load', bn: 'পেজ লোডে কার্সর অ্যানিমেশন' },
];

interface AdminProfileEditorProps {
  draft: PortfolioContentBundle;
  saving: boolean;
  lang?: AdminLang;
  hasUnsavedChanges?: boolean;
  subTab?: ProfileSubTab;
  onChangeSubTab?: (tab: ProfileSubTab) => void;
  onChange: (next: PortfolioContentBundle) => void;
  onSave: (bundleOverride?: PortfolioContentBundle) => Promise<boolean>;
}

export const AdminProfileEditor: React.FC<AdminProfileEditorProps> = ({
  draft,
  saving,
  lang = 'en',
  hasUnsavedChanges = false,
  subTab: controlledSubTab,
  onChangeSubTab,
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
  const [confirmDefaultsOpen, setConfirmDefaultsOpen] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);
  const errorAlertRef = useRef<HTMLDivElement | null>(null);

  const p = draft.profile;
  const cv = draft.cvSettings ?? DEFAULT_CV_SETTINGS;
  const socialNames = p.socialNames ?? DEFAULT_SOCIAL_NAMES;

  useEffect(() => {
    setPortraitLoadFailed(false);
  }, [p.portraitUrl]);

  const updateProfile = <K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) => {
    if (key === 'portraitUrl') setPortraitLoadFailed(false);
    if (formError) setFormError(null);
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
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে শুধু PDF (.pdf) ফাইল বাছাই করুন।'
          : 'Please choose a PDF (.pdf) file for your CV.'
      );
      return;
    }
    if (file.size > 380 * 1024) {
      setFormError(
        lang === 'bn'
          ? 'PDF ফাইলটি ৩৮০ KB-এর বেশি বড়। ছোট PDF দিন অথবা Google Drive লিংক পেস্ট করুন।'
          : 'This PDF is over 380 KB. Choose a smaller PDF or paste a Google Drive / PDF link instead.'
      );
      return;
    }

    setCvBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error(lang === 'bn' ? 'PDF ফাইলটি পড়া যায়নি।' : 'Could not read PDF file.'));
        };
        reader.onerror = () =>
          reject(new Error(lang === 'bn' ? 'PDF ফাইলটি পড়া যায়নি।' : 'Failed to read selected PDF file.'));
        reader.readAsDataURL(file);
      });
      const safe = sanitizeCvSourceUrl(dataUrl);
      if (!safe) {
        setFormError(
          lang === 'bn'
            ? 'PDF ফাইলটি সেভ করা যাচ্ছে না। ছোট ফাইল বা লিংক ব্যবহার করুন।'
            : 'This PDF could not be attached. Try a smaller PDF or paste a link.'
        );
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
      setCvNote(
        lang === 'bn'
          ? `যুক্ত হয়েছে: "${file.name}" (${Math.round(file.size / 1024)} KB)`
          : `Attached "${file.name}" (${Math.round(file.size / 1024)} KB)`
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'PDF ফাইলটি যুক্ত করা যায়নি।'
            : 'Unable to attach PDF.'
      );
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
      setPortraitNote(
        lang === 'bn'
          ? `ছবি প্রস্তুত হয়েছে (${result.sizeKB} KB)। সেভ করতে ভুলবেন না।`
          : `Photo ready (${result.sizeKB} KB). Remember to click Save.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'ছবিটি প্রসেস করা যায়নি।'
            : 'Unable to process selected photo.'
      );
    } finally {
      setPortraitBusy(false);
    }
  };

  const buildNormalizedFrom = (sourceDraft: PortfolioContentBundle): PortfolioContentBundle => {
    const sp = sourceDraft.profile;
    const scv = sourceDraft.cvSettings ?? DEFAULT_CV_SETTINGS;
    return {
      ...sourceDraft,
      profile: {
        ...sp,
        portraitUrl: normalizeUserUrlInput(sp.portraitUrl),
        githubUrl: normalizeUserUrlInput(sp.githubUrl),
        twitterUrl: normalizeUserUrlInput(sp.twitterUrl),
        linkedinUrl: normalizeUserUrlInput(sp.linkedinUrl),
        behanceUrl: normalizeUserUrlInput(sp.behanceUrl),
        facebookUrl: normalizeUserUrlInput(sp.facebookUrl),
        instagramUrl: normalizeUserUrlInput(sp.instagramUrl),
      },
      cvSettings: {
        ...scv,
        customUrl: normalizeUserUrlInput(scv.customUrl),
      },
    };
  };

  const buildNormalizedDraft = (): PortfolioContentBundle => buildNormalizedFrom(draft);

  const validateBeforeSave = (
    targetDraft: PortfolioContentBundle
  ): { tab: ProfileSubTab; message: string } | null => {
    const prof = targetDraft.profile;
    const cvCfg = targetDraft.cvSettings ?? DEFAULT_CV_SETTINGS;
    const reqText = (val: string) => val.trim().length > 0;
    if (
      !reqText(prof.wordmark) ||
      !reqText(prof.greeting) ||
      !reqText(prof.displayName) ||
      !reqText(prof.backdropName) ||
      !reqText(prof.role) ||
      !reqText(prof.bio)
    ) {
      return {
        tab: 'identity',
        message:
          lang === 'bn'
            ? 'অনুগ্রহ করে "নাম ও ছবি" অংশের সব জরুরি ঘর পূরণ করুন।'
            : 'Please fill in all required fields under Name & Photo.',
      };
    }
    const rawPortrait = prof.portraitUrl.trim();
    const isValidPortrait =
      rawPortrait === '' ||
      (rawPortrait.startsWith('data:image/') && rawPortrait.length <= 320_000) ||
      Boolean(sanitizePublicUrl(rawPortrait, '', false));
    if (!isValidPortrait) {
      return {
        tab: 'identity',
        message:
          lang === 'bn'
            ? 'ছবির লিংকটি সঠিক নয়। ডিভাইস থেকে ছবি নিন অথবা https:// লিংক দিন।'
            : 'Photo link is not valid. Upload a photo or enter a valid https:// link.',
      };
    }

    if (!isValidEmailAddress(prof.email)) {
      return {
        tab: 'contact',
        message:
          lang === 'bn'
            ? 'অনুগ্রহ করে সঠিক ইমেইল অ্যাড্রেস লিখুন।'
            : 'Please enter a valid contact email address.',
      };
    }
    if (!isValidPhoneIfPresent(prof.phoneNumber)) {
      return {
        tab: 'contact',
        message:
          lang === 'bn'
            ? 'ফোন নম্বরে ৬ থেকে ১৮টি সংখ্যা থাকতে হবে (যেমন: +880 1XXX-XXXXXX)।'
            : 'Phone number must have 6–18 digits (e.g. +880 1XXX-XXXXXX).',
      };
    }
    if (!isValidPhoneIfPresent(prof.whatsappNumber)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'হোয়াটসঅ্যাপ নম্বরে ৬ থেকে ১৮টি সংখ্যা থাকতে হবে (যেমন: +880 1XXX-XXXXXX)।'
            : 'WhatsApp number must have 6–18 digits (e.g. +880 1XXX-XXXXXX).',
      };
    }
    if (prof.githubUrl.trim() && !sanitizePublicUrl(prof.githubUrl, '', false)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'GitHub লিংকটি https:// বা http:// দিয়ে শুরু হতে হবে।'
            : 'GitHub link must start with https:// or http://.',
      };
    }
    if (prof.twitterUrl.trim() && !sanitizePublicUrl(prof.twitterUrl, '', false)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'Twitter / X লিংকটি https:// বা http:// দিয়ে শুরু হতে হবে।'
            : 'Twitter / X link must start with https:// or http://.',
      };
    }
    if (prof.behanceUrl.trim() && !sanitizePublicUrl(prof.behanceUrl, '', false)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'Behance লিংকটি https:// বা http:// দিয়ে শুরু হতে হবে।'
            : 'Behance link must start with https:// or http://.',
      };
    }
    if (prof.facebookUrl.trim() && !sanitizePublicUrl(prof.facebookUrl, '', false)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'Facebook লিংকটি https:// বা http:// দিয়ে শুরু হতে হবে।'
            : 'Facebook link must start with https:// or http://.',
      };
    }
    if (prof.linkedinUrl.trim() && !sanitizePublicUrl(prof.linkedinUrl, '', false)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'LinkedIn লিংকটি https:// বা http:// দিয়ে শুরু হতে হবে।'
            : 'LinkedIn link must start with https:// or http://.',
      };
    }
    if (prof.instagramUrl.trim() && !sanitizePublicUrl(prof.instagramUrl, '', false)) {
      return {
        tab: 'social',
        message:
          lang === 'bn'
            ? 'Instagram লিংকটি https:// বা http:// দিয়ে শুরু হতে হবে।'
            : 'Instagram link must start with https:// or http://.',
      };
    }
    if (
      !reqText(prof.availability) ||
      !reqText(prof.quoteText) ||
      !reqText(prof.manifestoLead) ||
      !reqText(prof.manifestoAvailability)
    ) {
      return {
        tab: 'contact',
        message:
          lang === 'bn'
            ? 'অনুগ্রহ করে "যোগাযোগ তথ্য" অংশের সব জরুরি ঘর পূরণ করুন।'
            : 'Please fill in all required fields under Contact Info.',
      };
    }

    if (targetDraft.heroMetrics.some((m) => !reqText(m.value) || !reqText(m.label))) {
      return {
        tab: 'metrics',
        message:
          lang === 'bn'
            ? '"মূল সংখ্যা" অংশের কোনো ঘর খালি রাখা যাবে না।'
            : 'Every highlight card needs both a number and text.',
      };
    }

    if (
      targetDraft.services.some((s) => !reqText(s.index) || !reqText(s.title) || !reqText(s.detail)) ||
      targetDraft.techStack.some((item) => !reqText(item.name) || !reqText(item.role)) ||
      targetDraft.wireframeScenes.some((sc) => !reqText(sc.label) || !reqText(sc.specs) || !reqText(sc.notes))
    ) {
      return {
        tab: 'process',
        message:
          lang === 'bn'
            ? '"কাজ ও স্কিল" অংশের সব ঘর পূরণ করুন।'
            : 'Please fill in all fields under Services & Skills.',
      };
    }

    if (cvCfg.mode === 'custom' && !sanitizeCvSourceUrl(cvCfg.customUrl)) {
      return {
        tab: 'cv',
        message:
          lang === 'bn'
            ? 'নিজের সিভি দেখাতে হলে PDF আপলোড করুন অথবা https:// লিংক দিন।'
            : 'Please upload a PDF or enter a valid https:// CV link.',
      };
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (portraitBusy || cvBusy) {
      setFormError(
        lang === 'bn'
          ? 'ছবি বা PDF ফাইল প্রস্তুত হওয়া পর্যন্ত একটু অপেক্ষা করুন।'
          : 'Please wait a moment for the photo or PDF to finish preparing.'
      );
      return;
    }

    const normalizedDraft = buildNormalizedDraft();
    onChange(normalizedDraft);

    const issue = validateBeforeSave(normalizedDraft);
    if (issue) {
      setSubTab(issue.tab);
      setFormError(issue.message);
      window.requestAnimationFrame(() => {
        errorAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    setFormError(null);
    await onSave(normalizedDraft);
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
            onClick={() => setConfirmDefaultsOpen(true)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t.profile.loadDefaults}
          </button>

          <button
            type="submit"
            disabled={saving || portraitBusy || cvBusy}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {saving ? t.common.saving : t.profile.saveSettings}
          </button>
        </div>
      </div>

      {formError && (
        <div
          ref={errorAlertRef}
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-4 py-3 text-xs text-red-200"
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
                label={lang === 'bn' ? 'উপরের ব্র্যান্ড নাম' : 'Top Bar Name'}
                value={p.wordmark}
                maxLength={16}
                required
                onChange={(v) => updateProfile('wordmark', v)}
              />
              <LimitedInput
                id="prof-greeting"
                label={lang === 'bn' ? 'স্বাগতম কথা' : 'Welcome Greeting'}
                value={p.greeting}
                maxLength={32}
                required
                onChange={(v) => updateProfile('greeting', v)}
              />
              <LimitedInput
                id="prof-display-name"
                label={lang === 'bn' ? 'আপনার মূল নাম' : 'Your Main Name'}
                value={p.displayName}
                maxLength={18}
                required
                onChange={(v) => updateProfile('displayName', v)}
              />
              <LimitedInput
                id="prof-backdrop"
                label={lang === 'bn' ? 'পেছনের বড় নাম' : 'Big Background Name'}
                value={p.backdropName}
                maxLength={10}
                required
                onChange={(v) => updateProfile('backdropName', v.toUpperCase())}
              />
            </div>

            <LimitedInput
              id="prof-role"
              label={lang === 'bn' ? 'আপনার পেশা / কাজ' : 'Your Profession / Title'}
              value={p.role}
              maxLength={64}
              required
              onChange={(v) => updateProfile('role', v)}
            />

            <LimitedTextarea
              id="prof-bio"
              label={lang === 'bn' ? 'আপনার সম্পর্কে সংক্ষেপে' : 'About You (Short Bio)'}
              value={p.bio}
              maxLength={260}
              rows={3}
              required
              onChange={(v) => updateProfile('bio', v)}
            />

            <div className="space-y-3 rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-200">
                  {lang === 'bn' ? 'আপনার প্রোফাইল ছবি' : 'Your Profile Photo'}
                </span>
                {p.portraitUrl.trim() && (
                  <button
                    type="button"
                    disabled={saving || portraitBusy}
                    onClick={() => {
                      updateProfile('portraitUrl', '');
                      setPortraitNote(null);
                      setFormError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#DC2626]/35 bg-[#DC2626]/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition-colors hover:bg-[#DC2626]/20 hover:text-white disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    {lang === 'bn' ? 'ছবি মুছুন' : 'Delete Photo'}
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
                  {portraitBusy
                    ? lang === 'bn'
                      ? 'ছবি প্রস্তুত হচ্ছে...'
                      : 'Preparing Photo...'
                    : lang === 'bn'
                      ? 'ফোন বা পিসি থেকে ছবি দিন'
                      : 'Upload Photo From Device'}
                </button>
              </div>

              {(portraitNote || isUploadedPortrait) && (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {portraitNote ??
                    (lang === 'bn'
                      ? 'ডিভাইস থেকে প্রোফাইল ছবি যুক্ত হয়েছে।'
                      : 'Profile photo attached from device.')}
                </p>
              )}

              {!isUploadedPortrait && (
                <SafeUrlInput
                  id="prof-portrait"
                  label={lang === 'bn' ? 'অথবা ছবির লিংক দিন (ঐচ্ছিক)' : 'Or Paste Photo Link (Optional)'}
                  value={p.portraitUrl}
                  maxLength={500}
                  autoPrefixHttps
                  lang={lang}
                  placeholder="/assets/shanto-cutout.png"
                  onChange={(v) => updateProfile('portraitUrl', v)}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                {lang === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Preview'}
              </p>
              <div className="mt-4 flex items-center gap-4 border-b border-white/10 pb-4">
                <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#12131A]">
                  {portraitLoadFailed || !p.portraitUrl.trim() ? (
                    <span className="font-display text-xl font-bold text-zinc-500">
                      {p.displayName.slice(0, 2)}
                    </span>
                  ) : (
                    <img
                      src={normalizeUserUrlInput(p.portraitUrl)}
                      alt={p.displayName}
                      onLoad={() => setPortraitLoadFailed(false)}
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
                <p className="mt-3 text-xs text-amber-300">
                  {lang === 'bn'
                    ? 'ছবিটি প্রিভিউতে দেখা যাচ্ছে না, তবে সেভ করতে পারবেন — ছবি না পেলে নামের প্রথম দুই অক্ষর দেখাবে।'
                    : 'Preview could not load the photo, but you can still save — initials will show if needed.'}
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
                  {lang === 'bn' ? 'হোয়াটসঅ্যাপ ও সোশ্যাল মিডিয়া' : 'WhatsApp & Social Links →'}
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
                <div className="space-y-1.5">
                  <LimitedInput
                    id="prof-phone"
                    label={lang === 'bn' ? 'ফোন / কন্টাক্ট নম্বর (Phone)' : 'Contact / Phone Number'}
                    type="tel"
                    value={p.phoneNumber}
                    maxLength={24}
                    placeholder="+880 1XXX-XXXXXX"
                    onChange={(v) => updateProfile('phoneNumber', v)}
                  />
                  {p.phoneNumber.trim() && (
                    <button
                      type="button"
                      disabled={saving || portraitBusy || cvBusy}
                      onClick={async () => {
                        if (saving || portraitBusy || cvBusy) return;
                        const nextDraft = buildNormalizedFrom({
                          ...draft,
                          profile: {
                            ...p,
                            phoneNumber: '',
                          },
                        });
                        onChange(nextDraft);
                        const issue = validateBeforeSave(nextDraft);
                        if (issue) {
                          setSubTab(issue.tab);
                          setFormError(issue.message);
                          window.requestAnimationFrame(() => {
                            errorAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          });
                          return;
                        }
                        setFormError(null);
                        await onSave(nextDraft);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[#DC2626]/35 bg-[#DC2626]/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition-colors hover:bg-[#DC2626]/20 hover:text-white disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'নম্বর মুছুন' : 'Remove Number'}</span>
                    </button>
                  )}
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
            </div>

            <LimitedInput
              id="prof-avail"
              label={lang === 'bn' ? 'কাজের অবস্থা (Available?)' : 'Work Availability'}
              value={p.availability}
              maxLength={40}
              required
              onChange={(v) => updateProfile('availability', v)}
            />
          </div>

          <div className="space-y-4">
            <LimitedTextarea
              id="prof-quote"
              label={lang === 'bn' ? 'পছন্দের উক্তি / কোট' : 'Featured Quote'}
              value={p.quoteText}
              maxLength={180}
              rows={3}
              required
              onChange={(v) => updateProfile('quoteText', v)}
            />
            <LimitedTextarea
              id="prof-manifesto"
              label={lang === 'bn' ? 'কাজের গল্পের মূল কথা' : 'Story Headline'}
              value={p.manifestoLead}
              maxLength={200}
              rows={2}
              required
              onChange={(v) => updateProfile('manifestoLead', v)}
            />
            <LimitedTextarea
              id="prof-manifesto-avail"
              label={lang === 'bn' ? 'সাইটের নিচে ক্লায়েন্টের জন্য বার্তা' : 'Footer Note for Clients'}
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
              const rawValue = platform.isPhone ? p.whatsappNumber : urlKey ? p[urlKey] : '';
              const isActive = platform.isPhone
                ? Boolean(formatWhatsappHref(p.whatsappNumber))
                : Boolean(sanitizePublicUrl(rawValue, '', false));
              const accountName = socialNames[platform.id] ?? '';
              const hasAnyInput = isActive || Boolean(rawValue.trim()) || Boolean(accountName.trim());
              const previewLabel =
                accountName.trim() ||
                (platform.id === 'github' ? p.githubHandle.trim() || 'GitHub' : platform.title);

              const handleRemoveSocial = async () => {
                if (saving || portraitBusy || cvBusy) return;
                const nextProfile: SiteProfile = {
                  ...p,
                  ...(platform.isPhone ? { whatsappNumber: '' } : urlKey ? { [urlKey]: '' } : {}),
                  socialNames: {
                    ...socialNames,
                    [platform.id]: '',
                  },
                };
                const nextDraft = buildNormalizedFrom({
                  ...draft,
                  profile: nextProfile,
                });
                onChange(nextDraft);
                const issue = validateBeforeSave(nextDraft);
                if (issue) {
                  setSubTab(issue.tab);
                  setFormError(issue.message);
                  window.requestAnimationFrame(() => {
                    errorAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  });
                  return;
                }
                setFormError(null);
                await onSave(nextDraft);
              };

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

                    <div className="flex items-center gap-2">
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

                      {hasAnyInput && (
                        <button
                          type="button"
                          disabled={saving || portraitBusy || cvBusy}
                          onClick={() => void handleRemoveSocial()}
                          aria-label={`Remove ${platform.title}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#DC2626]/35 bg-[#DC2626]/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition-colors hover:bg-[#DC2626]/20 hover:text-white disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          <span>{lang === 'bn' ? 'মুছুন' : 'Remove'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {platform.isPhone || !urlKey ? (
                    <LimitedInput
                      id={`social-url-${platform.id}`}
                      label={lang === 'bn' ? 'হোয়াটসঅ্যাপ নম্বর (WhatsApp Number)' : 'WhatsApp Phone Number'}
                      type="tel"
                      value={p.whatsappNumber}
                      maxLength={24}
                      placeholder={platform.placeholder}
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
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {lang === 'bn'
                  ? `মূল সংখ্যা ও অর্জন (${draft.heroMetrics.length}/4)`
                  : `Highlight Numbers (${draft.heroMetrics.length}/4)`}
              </h3>
              {draft.heroMetrics.length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      heroMetrics: [
                        ...draft.heroMetrics,
                        {
                          value: '10+',
                          label: lang === 'bn' ? 'নতুন অর্জন' : 'Projects Completed',
                        },
                      ],
                    })
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {lang === 'bn' ? 'যোগ করুন' : 'Add Highlight'}
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
                      label={lang === 'bn' ? 'সংখ্যা' : 'Number'}
                      value={metric.value}
                      maxLength={10}
                      required
                      onChange={(v) => updateHeroMetric(idx, { value: v })}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <LimitedInput
                      id={`hm-lbl-${idx}`}
                      label={lang === 'bn' ? 'বিবরণ' : 'Text'}
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
        </div>
      )}

      {subTab === 'process' && (
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {lang === 'bn'
                  ? `আপনার সার্ভিসসমূহ (${draft.services.length}/6)`
                  : `Services You Offer (${draft.services.length}/6)`}
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
                          detail: 'Complete website or app from design to launch.',
                        },
                      ],
                    });
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {lang === 'bn' ? 'সার্ভিস যোগ' : 'Add Service'}
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
                        label={lang === 'bn' ? 'নং' : 'No.'}
                        value={srv.index}
                        maxLength={4}
                        required
                        onChange={(v) => updateService(idx, { index: v })}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <LimitedInput
                        id={`srv-title-${idx}`}
                        label={lang === 'bn' ? 'সার্ভিসের নাম' : 'Service Name'}
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
                    label={lang === 'bn' ? 'সংক্ষিপ্ত বিবরণ' : 'Short Details'}
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
                {lang === 'bn'
                  ? `টুলস ও স্কিল (${draft.techStack.length}/8)`
                  : `Tools & Skills (${draft.techStack.length}/8)`}
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
                  {lang === 'bn' ? 'স্কিল যোগ' : 'Add Skill'}
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
                      label={lang === 'bn' ? 'টুলস / স্কিল' : 'Tool / Skill'}
                      value={item.name}
                      maxLength={40}
                      required
                      onChange={(v) => updateTechStack(idx, { name: v })}
                    />
                    <LimitedInput
                      id={`ts-role-${idx}`}
                      label={lang === 'bn' ? 'কী কাজে ব্যবহার করেন' : 'What You Use It For'}
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
              {lang === 'bn'
                ? `কাজের আগে ও পরের প্রিভিউ (${draft.wireframeScenes.length}/6)`
                : `Before & After Showcase (${draft.wireframeScenes.length}/6)`}
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
                      label={lang === 'bn' ? 'শিরোনাম' : 'Title'}
                      value={scene.label}
                      maxLength={64}
                      required
                      onChange={(v) => updateScene(idx, { label: v })}
                    />
                    <LimitedInput
                      id={`sc-spec-${idx}`}
                      label={lang === 'bn' ? 'মূল তথ্য' : 'Key Highlights'}
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
                        {lang === 'bn' ? 'প্রিভিউয়ের ধরন' : 'Preview Type'}
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
                        <option value="web-build">
                          {lang === 'bn' ? 'ওয়েবসাইট প্রিভিউ' : 'Website'}
                        </option>
                        <option value="app-ui">
                          {lang === 'bn' ? 'মোবাইল / ওয়েব অ্যাপ' : 'Mobile / Web App'}
                        </option>
                        <option value="game-engine">
                          {lang === 'bn' ? 'গেম প্রিভিউ' : 'Game'}
                        </option>
                      </select>
                    </div>
                  </div>
                  <LimitedTextarea
                    id={`sc-notes-${idx}`}
                    label={lang === 'bn' ? 'কাজের নোট' : 'Notes'}
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
                    {lang === 'bn' ? 'অ্যানিমেশনের গতি' : 'Animation Speed'}
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
                    { id: 'slow', label: lang === 'bn' ? 'ধীরে' : 'Slow' },
                    { id: 'normal', label: lang === 'bn' ? 'সাধারণ' : 'Normal' },
                    { id: 'fast', label: lang === 'bn' ? 'দ্রুত' : 'Fast' },
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
                  {vc.showCvDownloadOnViewer ? t.common.published : t.common.draft}
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
                  <div className="text-sm font-semibold">
                    {lang === 'bn' ? 'অটো তৈরি সিভি (Auto PDF)' : 'Auto-Created CV'}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {lang === 'bn' ? 'আপনার প্রোফাইল থেকেই তৈরি হবে' : 'Created from your profile info'}
                  </div>
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
                  <div className="text-sm font-semibold">
                    {lang === 'bn' ? 'নিজের সিভি দিন (PDF / লিংক)' : 'Upload Own CV'}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {lang === 'bn' ? '৩৮০ KB এর কম PDF বা লিংক' : 'PDF under 380 KB or https:// link'}
                  </div>
                </div>
              </button>
            </div>

            <LimitedInput
              id="cv-headline"
              label={lang === 'bn' ? 'সিভির শিরোনাম (Subtitle)' : 'CV Headline'}
              value={cv.headline}
              maxLength={96}
              onChange={(v) => updateCvSettings('headline', v)}
            />

            {cv.mode === 'custom' && (
              <div className="space-y-3 rounded-lg border border-white/10 bg-[#050507] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-200">
                    {lang === 'bn' ? 'নিজের PDF ফাইল বা লিংক' : 'Your Custom PDF or Link'}
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
                    {cvBusy ? t.common.working : lang === 'bn' ? 'PDF আপলোড করুন' : 'Upload PDF'}
                  </button>
                </div>

                {(cvNote || cv.customUrl.startsWith('data:application/pdf')) && (
                  <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {cvNote ?? (lang === 'bn' ? 'নিজের PDF ফাইল যুক্ত আছে।' : 'Custom PDF attached.')}
                  </p>
                )}

                {!cv.customUrl.startsWith('data:application/pdf') && (
                  <SafeUrlInput
                    id="cv-custom-url"
                    label={
                      lang === 'bn' ? 'অথবা Google Drive / PDF লিংক দিন' : 'Or Paste PDF Link'
                    }
                    value={cv.customUrl}
                    maxLength={500}
                    lang={lang}
                    onChange={(v) => updateCvSettings('customUrl', v)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-white/10 pt-5">
        {hasUnsavedChanges && (
          <span className="mr-auto rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            {t.common.unsavedChanges}
          </span>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => setConfirmDefaultsOpen(true)}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t.profile.loadDefaults}
        </button>

        <button
          type="submit"
          disabled={saving || portraitBusy || cvBusy}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-accent px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {saving ? t.common.saving : t.profile.saveSettings}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDefaultsOpen}
        title={lang === 'bn' ? 'ডিফল্ট সেটিংস লোড করবেন?' : 'Load Default Settings?'}
        description={
          lang === 'bn'
            ? 'এতে বর্তমান ফর্মের সব আনসেভড পরিবর্তন মুছে ডিফল্ট কনটেন্ট ফিরে আসবে (সেভ না করা পর্যন্ত ক্লাউডে বদলাবে না)।'
            : 'This replaces the current form draft with default starter values (cloud stays unchanged until you save).'
        }
        confirmLabel={t.profile.loadDefaults}
        lang={lang}
        onCancel={() => setConfirmDefaultsOpen(false)}
        onConfirm={() => {
          applyDocumentAccentTheme(DEFAULT_VIEWER_CONTROLS.accentColor);
          setPortraitLoadFailed(false);
          setPortraitNote(null);
          setCvNote(null);
          setFormError(null);
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
          setConfirmDefaultsOpen(false);
        }}
      />
    </form>
  );
};
