import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { ProjectCategory } from '../../data/contentSchema';
import { isVideoMediaSource, normalizeUserUrlInput, sanitizePublicUrl } from '../../data/contentSchema';
import type { AdminProjectRecord } from '../../firebaseAdmin';
import { handleFormEnterToNext } from '../../utils/formKeyboardNav';
import { processGalleryPhotoFile, processProjectVideoFile } from '../../utils/mediaCompressor';
import { ProductPreviewCanvas } from '../ProductPreviewCanvas';
import { getAdminCopy, type AdminLang } from './adminI18n';
import {
  ConfirmDialog,
  LimitedInput,
  LimitedTextarea,
  SafeUrlInput,
} from './FieldControls';

interface AdminProjectsEditorProps {
  projects: AdminProjectRecord[];
  saving: boolean;
  lang?: AdminLang;
  onSaveProject: (project: AdminProjectRecord) => Promise<boolean>;
  onDeleteProject: (projectId: string) => Promise<boolean>;
  onSubViewChange?: (label: string | null) => void;
  exitSubViewNonce?: number;
  closeDialogNonce?: number;
  onDialogOpenChange?: (open: boolean) => void;
}

const CATEGORIES: ReadonlyArray<Exclude<ProjectCategory, 'All'>> = [
  'Websites',
  'Apps',
  'Games',
  'UI/UX Design',
];

const MAX_GALLERY_PHOTOS = 5;

function getEffectiveGallery(proj: AdminProjectRecord): string[] {
  if (proj.coverMediaType === 'video' && isVideoMediaSource(proj.coverImageUrl, proj.coverMediaType)) {
    return [];
  }
  const merged: string[] = [];
  const seen = new Set<string>();
  const rawList = [
    ...(Array.isArray(proj.galleryUrls) ? proj.galleryUrls : []),
    ...(proj.coverImageUrl && !isVideoMediaSource(proj.coverImageUrl, proj.coverMediaType)
      ? [proj.coverImageUrl]
      : []),
  ];
  for (const item of rawList) {
    const clean = sanitizePublicUrl(item, '', true);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      merged.push(clean);
    }
    if (merged.length >= MAX_GALLERY_PHOTOS) break;
  }
  return merged;
}

function createBlankProject(projects: AdminProjectRecord[]): AdminProjectRecord {
  const maxOrder = projects.reduce((max, item) => Math.max(max, item.sortOrder), -1);
  const maxNum = projects.reduce(
    (max, item) => Math.max(max, Number.parseInt(item.index, 10) || 0),
    0
  );
  const nextOrder = Math.min(1000, maxOrder + 1);
  const padded = String(maxNum + 1).padStart(2, '0');
  return {
    id: `proj-${Date.now().toString(36)}`,
    index: padded,
    title: '',
    category: 'Websites',
    year: String(new Date().getFullYear()),
    platform: 'Responsive Web',
    client: 'Independent Studio',
    role: 'Full-Stack Developer & Designer',
    stack: ['React', 'TypeScript', 'Tailwind CSS'],
    summary: '',
    architectureNotes: '',
    previewTheme: 'web-commerce',
    dimensions: '1440 × 900',
    coverImageUrl: '',
    galleryUrls: [],
    coverMediaType: undefined,
    liveUrl: '',
    repoUrl: '',
    published: true,
    sortOrder: nextOrder,
  };
}

export const AdminProjectsEditor: React.FC<AdminProjectsEditorProps> = ({
  projects,
  saving,
  lang = 'en',
  onSaveProject,
  onDeleteProject,
  onSubViewChange,
  exitSubViewNonce = 0,
  closeDialogNonce = 0,
  onDialogOpenChange,
}) => {
  const t = getAdminCopy(lang);
  const [filterCategory, setFilterCategory] = useState<ProjectCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<AdminProjectRecord | null>(null);
  const [stackInput, setStackInput] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProjectRecord | null>(null);

  const [mediaBusyLabel, setMediaBusyLabel] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatusNote, setMediaStatusNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const formErrorRef = useRef<HTMLDivElement | null>(null);
  const lastExitNonceRef = useRef(exitSubViewNonce);
  const lastCloseDialogNonceRef = useRef(closeDialogNonce);

  useEffect(() => {
    onDialogOpenChange?.(Boolean(deleteTarget));
  }, [deleteTarget, onDialogOpenChange]);

  useEffect(() => {
    if (closeDialogNonce !== lastCloseDialogNonceRef.current) {
      lastCloseDialogNonceRef.current = closeDialogNonce;
      setDeleteTarget(null);
    }
  }, [closeDialogNonce]);

  useEffect(() => {
    if (exitSubViewNonce !== lastExitNonceRef.current) {
      lastExitNonceRef.current = exitSubViewNonce;
      setEditing(null);
      setMediaError(null);
      setMediaStatusNote(null);
      setFormError(null);
      setPhotoUrlInput('');
    }
  }, [exitSubViewNonce]);

  useEffect(() => {
    if (!onSubViewChange) return;
    if (!editing) {
      onSubViewChange(null);
      return;
    }
    const isExisting = projects.some((p) => p.id === editing.id);
    onSubViewChange(isExisting ? t.projects.editHeading : t.projects.newHeading);
  }, [editing, projects, onSubViewChange, t.projects.editHeading, t.projects.newHeading]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (filterCategory !== 'All' && p.category !== filterCategory) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q)
      );
    });
  }, [projects, filterCategory, searchQuery]);

  const startEdit = (proj: AdminProjectRecord) => {
    const gallery = getEffectiveGallery(proj);
    setEditing({
      ...proj,
      stack: [...proj.stack],
      galleryUrls: gallery,
      coverImageUrl:
        proj.coverMediaType === 'video' ? proj.coverImageUrl : gallery[0] ?? proj.coverImageUrl ?? '',
    });
    setStackInput('');
    setPhotoUrlInput('');
    setMediaError(null);
    setMediaStatusNote(null);
    setFormError(null);
  };

  const startNew = () => {
    setEditing(createBlankProject(projects));
    setStackInput('');
    setPhotoUrlInput('');
    setMediaError(null);
    setMediaStatusNote(null);
    setFormError(null);
  };

  const addStackTag = () => {
    if (!editing) return;
    const tag = stackInput.trim().slice(0, 24);
    if (!tag || editing.stack.length >= 6) return;
    if (editing.stack.some((s) => s.toLowerCase() === tag.toLowerCase())) {
      setStackInput('');
      return;
    }
    setEditing({ ...editing, stack: [...editing.stack, tag] });
    setStackInput('');
  };

  const handlePhotosPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0 || !editing) return;

    const currentGallery = getEffectiveGallery(editing);
    const remainingSlots = Math.max(0, MAX_GALLERY_PHOTOS - currentGallery.length);
    if (remainingSlots === 0) {
      setMediaError(
        lang === 'bn'
          ? 'সর্বোচ্চ ৫টি ছবি যোগ করা যায়। নতুন ছবি যোগ করতে একটি ছবি মুছুন।'
          : 'Maximum 5 photos per project. Remove one photo before adding another.'
      );
      return;
    }

    const toProcess = files.slice(0, remainingSlots);
    setMediaError(null);
    setMediaStatusNote(null);
    setMediaBusyLabel(
      lang === 'bn'
        ? `${toProcess.length}টি ছবি অপ্টিমাইজ হচ্ছে...`
        : `Optimizing ${toProcess.length} photo(s)...`
    );

    try {
      const addedUrls: string[] = [];
      let totalKB = 0;
      for (const file of toProcess) {
        const res = await processGalleryPhotoFile(file);
        addedUrls.push(res.dataUrl);
        totalKB += res.sizeKB;
      }

      setEditing((prev) => {
        if (!prev) return prev;
        const latestGallery = getEffectiveGallery(prev);
        const nextGallery = [...latestGallery, ...addedUrls].slice(0, MAX_GALLERY_PHOTOS);
        return {
          ...prev,
          galleryUrls: nextGallery,
          coverImageUrl: nextGallery[0] ?? '',
          coverMediaType: 'image',
        };
      });
      setMediaStatusNote(
        lang === 'bn'
          ? `${addedUrls.length}টি ছবি স্লাইডশোতে যোগ হয়েছে (${totalKB} KB)`
          : `${addedUrls.length} photo(s) added to slideshow (${totalKB} KB)`
      );
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to process selected photos.');
    } finally {
      setMediaBusyLabel(null);
    }
  };

  const handleAddPhotoUrl = () => {
    if (!editing) return;
    const raw = photoUrlInput.trim();
    if (!raw) return;
    const clean = sanitizePublicUrl(normalizeUserUrlInput(raw), '', false);
    if (!clean) {
      setMediaError(
        lang === 'bn'
          ? 'সঠিক https:// ছবির লিংক বা /assets/... পাথ লিখুন।'
          : 'Enter a valid https:// image link or /assets/... path.'
      );
      return;
    }
    const currentGallery = getEffectiveGallery(editing);
    if (currentGallery.length >= MAX_GALLERY_PHOTOS) {
      setMediaError(
        lang === 'bn' ? 'সর্বোচ্চ ৫টি ছবি যোগ করা যায়।' : 'Maximum 5 slideshow photos allowed.'
      );
      return;
    }
    const nextGallery = [...currentGallery, clean].slice(0, MAX_GALLERY_PHOTOS);
    setEditing({
      ...editing,
      galleryUrls: nextGallery,
      coverImageUrl: nextGallery[0] ?? clean,
      coverMediaType: 'image',
    });
    setPhotoUrlInput('');
    setMediaError(null);
  };

  const handleRemoveGallerySlide = (idx: number) => {
    if (!editing) return;
    const currentGallery = getEffectiveGallery(editing);
    const nextGallery = currentGallery.filter((_, i) => i !== idx);
    setEditing({
      ...editing,
      galleryUrls: nextGallery,
      coverImageUrl: nextGallery[0] ?? '',
      coverMediaType: nextGallery.length > 0 ? 'image' : undefined,
    });
    setMediaError(null);
    setMediaStatusNote(
      lang === 'bn'
        ? 'ছবি সরানো হয়েছে। আপডেট করতে "সেভ প্রজেক্ট" চাপুন।'
        : 'Photo removed. Click "Save Project" to update.'
    );
  };

  const handleClearAllMedia = () => {
    if (!editing) return;
    const hadVideo = Boolean(
      editing.coverImageUrl && isVideoMediaSource(editing.coverImageUrl, editing.coverMediaType)
    );
    setEditing({
      ...editing,
      coverImageUrl: '',
      galleryUrls: [],
      coverMediaType: undefined,
    });
    setMediaError(null);
    setMediaStatusNote(
      hadVideo
        ? lang === 'bn'
          ? 'ভিডিও মুছে ফেলা হয়েছে। আপডেট করতে "সেভ প্রজেক্ট" চাপুন।'
          : 'Video removed. Click "Save Project" to update.'
        : lang === 'bn'
          ? 'সব ছবি মুছে ফেলা হয়েছে। আপডেট করতে "সেভ প্রজেক্ট" চাপুন।'
          : 'All photos removed. Click "Save Project" to update.'
    );
  };

  const handleMoveGallerySlide = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const currentGallery = [...getEffectiveGallery(editing)];
    const target = idx + dir;
    if (target < 0 || target >= currentGallery.length) return;
    const [moved] = currentGallery.splice(idx, 1);
    currentGallery.splice(target, 0, moved);
    setEditing({
      ...editing,
      galleryUrls: currentGallery,
      coverImageUrl: currentGallery[0] ?? '',
      coverMediaType: 'image',
    });
  };

  const handleSetPrimarySlide = (idx: number) => {
    if (!editing || idx === 0) return;
    const currentGallery = [...getEffectiveGallery(editing)];
    const [picked] = currentGallery.splice(idx, 1);
    currentGallery.unshift(picked);
    setEditing({
      ...editing,
      galleryUrls: currentGallery,
      coverImageUrl: currentGallery[0] ?? '',
      coverMediaType: 'image',
    });
  };

  const handleVideoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    setMediaError(null);
    setMediaStatusNote(null);
    setMediaBusyLabel(lang === 'bn' ? 'ভিডিও প্রসেস হচ্ছে...' : 'Preparing video clip...');
    try {
      const result = await processProjectVideoFile(file, (label) => setMediaBusyLabel(label));
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              coverImageUrl: result.dataUrl,
              galleryUrls: [],
              coverMediaType: 'video',
            }
          : prev
      );
      setMediaStatusNote(
        `Video loop ready (${result.sizeKB} KB · ~${Math.max(1, result.trimmedSeconds)}s)`
      );
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to process selected video.');
    } finally {
      setMediaBusyLabel(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;
    if (mediaBusyLabel) {
      setFormError(
        lang === 'bn'
          ? 'ছবি বা ভিডিও প্রস্তুত হওয়া পর্যন্ত একটু অপেক্ষা করুন।'
          : 'Please wait a moment while your photo or video finishes preparing.'
      );
      return;
    }

    if (
      !editing.title.trim() ||
      !editing.year.trim() ||
      !editing.platform.trim() ||
      !editing.client.trim() ||
      !editing.role.trim() ||
      !editing.summary.trim() ||
      !editing.architectureNotes.trim()
    ) {
      setFormError(t.projects.enterNextError);
      window.requestAnimationFrame(() => {
        formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const normalizedCover = normalizeUserUrlInput(editing.coverImageUrl ?? '');
    const normalizedLive = normalizeUserUrlInput(editing.liveUrl ?? '');
    const normalizedRepo = normalizeUserUrlInput(editing.repoUrl ?? '');

    if (normalizedCover && !normalizedCover.startsWith('data:') && !sanitizePublicUrl(normalizedCover, '')) {
      setFormError(
        lang === 'bn'
          ? 'ছবি বা ভিডিওর লিংকটি https:// দিয়ে শুরু হতে হবে।'
          : 'Photo or video link must start with https:// or /assets/...'
      );
      window.requestAnimationFrame(() => {
        formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (normalizedLive && !sanitizePublicUrl(normalizedLive, '')) {
      setFormError(
        lang === 'bn'
          ? 'লাইভ ওয়েবসাইট/অ্যাপ লিংকটি https:// দিয়ে শুরু হতে হবে।'
          : 'Live Website / App Link must start with https:// or http://.'
      );
      window.requestAnimationFrame(() => {
        formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (normalizedRepo && !sanitizePublicUrl(normalizedRepo, '')) {
      setFormError(
        lang === 'bn'
          ? 'কোড / গিটহাব লিংকটি https:// দিয়ে শুরু হতে হবে।'
          : 'Code / GitHub Link must start with https:// or http://.'
      );
      window.requestAnimationFrame(() => {
        formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const pendingPhotoUrl = normalizeUserUrlInput(photoUrlInput);
    let nextGallery = Array.isArray(editing.galleryUrls) ? [...editing.galleryUrls] : [];
    if (
      pendingPhotoUrl &&
      editing.coverMediaType !== 'video' &&
      !isVideoMediaSource(pendingPhotoUrl) &&
      sanitizePublicUrl(pendingPhotoUrl, '', false) &&
      nextGallery.length < MAX_GALLERY_PHOTOS &&
      !nextGallery.includes(pendingPhotoUrl)
    ) {
      nextGallery = [...nextGallery, pendingPhotoUrl];
    }

    const normalizedRecord: AdminProjectRecord = {
      ...editing,
      index: editing.index.trim() || String(editing.sortOrder + 1).padStart(2, '0'),
      dimensions: editing.dimensions.trim() || '1440 × 900',
      coverImageUrl: normalizedCover || nextGallery[0] || '',
      galleryUrls: nextGallery,
      liveUrl: normalizedLive,
      repoUrl: normalizedRepo,
      stack: editing.stack.length > 0 ? editing.stack : ['React', 'TypeScript'],
    };

    setEditing(normalizedRecord);
    setPhotoUrlInput('');
    setFormError(null);
    const ok = await onSaveProject(normalizedRecord);
    if (ok) {
      setEditing(null);
    }
  };

  if (editing) {
    const coverValue = editing.coverImageUrl ?? '';
    const isVideoCover = Boolean(
      coverValue && isVideoMediaSource(coverValue, editing.coverMediaType)
    );
    const gallerySlides = isVideoCover ? [] : getEffectiveGallery(editing);

    return (
      <form
        noValidate
        onSubmit={handleSave}
        onKeyDown={handleFormEnterToNext}
        className="space-y-6 pb-8"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl font-semibold text-white">
            {projects.some((p) => p.id === editing.id)
              ? t.projects.editHeading
              : t.projects.newHeading}
          </h2>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setEditing({ ...editing, published: !editing.published })}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                editing.published
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {editing.published ? (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.projects.publishedOnSite}
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.common.hiddenDraft}
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving || Boolean(mediaBusyLabel)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? t.common.saving : t.projects.saveProject}
            </button>
          </div>
        </div>

        {formError && (
          <div
            ref={formErrorRef}
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <LimitedInput
              id="proj-title"
              label={lang === 'bn' ? 'প্রজেক্টের নাম' : 'Project Title'}
              value={editing.title}
              maxLength={56}
              required
              placeholder="e.g. Nova Commerce Engine"
              onChange={(v) => setEditing({ ...editing, title: v })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="proj-cat" className="block text-xs font-medium text-zinc-200">
                  {lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}{' '}
                  <span className="text-accent-light">*</span>
                </label>
                <select
                  id="proj-cat"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target.value as Exclude<ProjectCategory, 'All'>,
                    })
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <LimitedInput
                id="proj-year"
                label={lang === 'bn' ? 'সাল' : 'Year'}
                value={editing.year}
                maxLength={12}
                required
                onChange={(v) => setEditing({ ...editing, year: v })}
              />

              <div>
                <label htmlFor="proj-order" className="block text-xs font-medium text-zinc-200">
                  {lang === 'bn' ? 'কত নম্বরে দেখাবে (0 = আগে)' : 'Position Order (0 first)'}
                </label>
                <input
                  id="proj-order"
                  type="number"
                  min={0}
                  max={1000}
                  enterKeyHint="next"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sortOrder: Math.max(0, Math.min(1000, Number(e.target.value) || 0)),
                    })
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3.5 py-2 font-mono text-sm tabular-nums text-white focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <LimitedInput
                id="proj-platform"
                label={lang === 'bn' ? 'কিসের জন্য (যেমন: ওয়েব / অ্যাপ)' : 'Platform (Web / App)'}
                value={editing.platform}
                maxLength={36}
                required
                placeholder="Web & Mobile App"
                onChange={(v) => setEditing({ ...editing, platform: v })}
              />
              <LimitedInput
                id="proj-client"
                label={lang === 'bn' ? 'কার জন্য তৈরি (ক্লায়েন্ট)' : 'Client / Made For'}
                value={editing.client}
                maxLength={36}
                required
                onChange={(v) => setEditing({ ...editing, client: v })}
              />
              <LimitedInput
                id="proj-role"
                label={lang === 'bn' ? 'আপনার কাজ / ভূমিকা' : 'Your Role'}
                value={editing.role}
                maxLength={64}
                required
                onChange={(v) => setEditing({ ...editing, role: v })}
              />
            </div>

            <LimitedTextarea
              id="proj-summary"
              label={lang === 'bn' ? 'প্রজেক্ট সম্পর্কে সংক্ষিপ্ত কথা' : 'Short Project Summary'}
              value={editing.summary}
              maxLength={280}
              rows={3}
              required
              placeholder={
                lang === 'bn'
                  ? 'এই প্রজেক্টটি কী কাজ করে সংক্ষেপে লিখুন...'
                  : 'Write a short summary of what you built...'
              }
              onChange={(v) => setEditing({ ...editing, summary: v })}
            />

            <LimitedTextarea
              id="proj-arch"
              label={lang === 'bn' ? 'কীভাবে তৈরি করেছেন (বিস্তারিত)' : 'How You Built It (Details)'}
              value={editing.architectureNotes}
              maxLength={300}
              rows={2}
              required
              placeholder={
                lang === 'bn'
                  ? 'প্রজেক্টের মূল ফিচার বা টেকনিক্যাল দিক লিখুন...'
                  : 'Key features or highlights visitors will see...'
              }
              onChange={(v) => setEditing({ ...editing, architectureNotes: v })}
            />

            {/* Tech Stack Chips */}
            <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">
                  {lang === 'bn'
                    ? `যেসব টুলস ব্যবহার করেছেন (${editing.stack.length}/6)`
                    : `Tools & Technologies Used (${editing.stack.length}/6)`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {editing.stack.map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#121319] px-2.5 py-1 font-mono text-xs text-zinc-200"
                  >
                    {tag}
                    {editing.stack.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            stack: editing.stack.filter((_, i) => i !== idx),
                          })
                        }
                        aria-label={`Remove ${tag}`}
                        className="text-zinc-400 hover:text-[#EF4444]"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {editing.stack.length < 6 && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={stackInput}
                    maxLength={24}
                    enterKeyHint="next"
                    data-enter-action="add-tag"
                    onChange={(e) => setStackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && stackInput.trim()) {
                        e.preventDefault();
                        addStackTag();
                      }
                    }}
                    placeholder={
                      lang === 'bn' ? 'নাম লিখুন (যেমন: React, Unity)' : 'Add tool (e.g. React, Unity)'
                    }
                    className="min-h-[42px] flex-1 rounded-md border border-white/15 bg-[#070709] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addStackTag}
                    className="min-h-[42px] rounded-md border border-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                  >
                    {lang === 'bn' ? '+ যোগ করুন' : '+ Add'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Project URL + Multi-Photo Reel / Video */}
          <div className="space-y-4 lg:col-span-5">
            {/* Live Project URL */}
            <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Link2 className="h-4 w-4 text-accent-light" aria-hidden="true" />
                  <span>{t.projects.liveUrlLabel}</span>
                </div>
                {sanitizePublicUrl(editing.liveUrl, '') && (
                  <a
                    href={sanitizePublicUrl(editing.liveUrl, '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-light hover:underline"
                  >
                    {lang === 'bn' ? 'খুলে দেখুন' : 'Open'}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>

              <SafeUrlInput
                id="proj-live"
                label="https://..."
                value={editing.liveUrl ?? ''}
                maxLength={300}
                autoPrefixHttps
                lang={lang}
                placeholder="https://myproject.web.app"
                onChange={(v) => setEditing({ ...editing, liveUrl: v })}
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                  {t.projects.slidesTitle}
                </p>
                {(gallerySlides.length > 0 || isVideoCover) && (
                  <button
                    type="button"
                    onClick={handleClearAllMedia}
                    className="inline-flex items-center gap-1 rounded-md border border-[#DC2626]/35 bg-[#DC2626]/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition-colors hover:bg-[#DC2626]/20 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    {isVideoCover ? t.projects.deleteVideo : t.projects.deleteAllMedia}
                  </button>
                )}
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotosPicked}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoPicked}
              />

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={Boolean(mediaBusyLabel) || gallerySlides.length >= MAX_GALLERY_PHOTOS}
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3 py-2 text-xs font-medium text-white hover:border-accent/60 hover:bg-[#161922] disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4 text-accent-light" aria-hidden="true" />
                  {t.projects.addPhotosBtn} ({gallerySlides.length}/{MAX_GALLERY_PHOTOS})
                </button>

                <button
                  type="button"
                  disabled={Boolean(mediaBusyLabel)}
                  onClick={() => videoInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3 py-2 text-xs font-medium text-white hover:border-accent/60 hover:bg-[#161922] disabled:opacity-50"
                >
                  <Film className="h-4 w-4 text-accent-light" aria-hidden="true" />
                  {t.projects.shortVideoBtn}
                </button>
              </div>

              {/* Paste external image URL into slideshow */}
              {!isVideoCover && gallerySlides.length < MAX_GALLERY_PHOTOS && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder={t.projects.addPhotoUrlPlaceholder}
                    className="min-h-[40px] flex-1 rounded-md border border-white/15 bg-[#070709] px-3 py-1.5 font-mono text-xs text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="min-h-[40px] rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 shrink-0"
                  >
                    {t.projects.addPhotoUrlBtn}
                  </button>
                </div>
              )}

              {mediaBusyLabel && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
                  <span>{mediaBusyLabel}</span>
                </div>
              )}

              {mediaError && (
                <p className="mt-3 rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-xs text-red-200">
                  {mediaError}
                </p>
              )}

              {!mediaBusyLabel && mediaStatusNote && (
                <p className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {mediaStatusNote}
                </p>
              )}

              {/* Attached Video Control Bar */}
              {isVideoCover && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-[#050507] px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/15 text-accent-light">
                      <Film className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {t.projects.videoAttachedLabel}
                      </p>
                      <p className="truncate font-mono text-[10px] text-zinc-400">
                        {coverValue.startsWith('data:')
                          ? `${Math.round(coverValue.length / 1024)} KB`
                          : coverValue}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllMedia}
                    aria-label={t.projects.deleteVideo}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-[#DC2626]/40 bg-[#DC2626]/15 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-[#DC2626] hover:text-white shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.projects.deleteVideo}</span>
                  </button>
                </div>
              )}

              {/* Reorderable Slideshow Thumbnails */}
              {gallerySlides.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {gallerySlides.map((slideUrl, idx) => (
                    <div
                      key={`${idx}-${slideUrl.slice(0, 32)}`}
                      className="group relative overflow-hidden rounded-lg border border-white/15 bg-[#050507]"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveGallerySlide(idx)}
                        title={t.projects.deletePhoto}
                        aria-label={`${t.projects.deletePhoto} ${idx + 1}`}
                        className="absolute top-1.5 right-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DC2626]/50 bg-black/80 text-red-200 backdrop-blur-sm transition-colors hover:bg-[#DC2626] hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <div className="aspect-[16/10] w-full overflow-hidden">
                        <img
                          src={slideUrl}
                          alt={`Slide ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1 border-t border-white/10 bg-[#0C0D12] px-1.5 py-1">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveGallerySlide(idx, -1)}
                            aria-label="Move slide left"
                            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === gallerySlides.length - 1}
                            onClick={() => handleMoveGallerySlide(idx, 1)}
                            aria-label="Move slide right"
                            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {idx === 0 ? (
                          <span className="font-mono text-[10px] font-semibold text-emerald-300">
                            #1 {t.projects.setCover}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimarySlide(idx)}
                            title={lang === 'bn' ? 'প্রথম ছবি বানান' : 'Make main photo'}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white"
                          >
                            <Star className="h-2.5 w-2.5" />
                            #{idx + 1}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveGallerySlide(idx)}
                          title={t.projects.deletePhoto}
                          aria-label={`Remove slide ${idx + 1}`}
                          className="inline-flex items-center justify-center rounded border border-[#DC2626]/30 bg-[#DC2626]/10 p-1 text-red-300 transition-colors hover:bg-[#DC2626] hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Animated Preview Canvas */}
              <div className="mt-4 aspect-[16/10] w-full overflow-hidden rounded-lg border border-white/10 bg-[#050507]">
                <ProductPreviewCanvas
                  theme={editing.previewTheme}
                  title={editing.title || 'Untitled Project'}
                  coverImageUrl={editing.coverImageUrl || undefined}
                  galleryUrls={gallerySlides}
                  coverMediaType={editing.coverMediaType}
                  isAnimating
                />
              </div>

              <div className="mt-4">
                <SafeUrlInput
                  id="proj-repo"
                  label={t.projects.repoUrlLabel}
                  value={editing.repoUrl ?? ''}
                  maxLength={300}
                  autoPrefixHttps
                  lang={lang}
                  placeholder="https://github.com/..."
                  enterKeyHint="done"
                  onChange={(v) => setEditing({ ...editing, repoUrl: v })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setEditing(null);
              setMediaError(null);
              setMediaStatusNote(null);
              setFormError(null);
              setPhotoUrlInput('');
            }}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            {t.common.cancel}
          </button>

          <button
            type="submit"
            disabled={saving || Boolean(mediaBusyLabel)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-accent px-5 py-2 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {saving ? t.common.saving : t.projects.saveProject}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
          {t.projects.heading} ({projects.length})
        </h2>

        <button
          type="button"
          onClick={startNew}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.projects.addNew}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-[#08090D] p-1">
          {(['All', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterCategory === cat
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            enterKeyHint="search"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.projects.filterPlaceholder}
            aria-label={t.projects.filterPlaceholder}
            className="min-h-[40px] w-full rounded-md border border-white/15 bg-[#070709] py-2 pr-3 pl-9 text-xs text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-[#090A0F] p-10 text-center">
          <p className="text-sm font-medium text-zinc-200">
            {projects.length === 0 ? t.projects.emptyCloudTitle : t.projects.emptyFilterTitle}
          </p>
          {projects.length === 0 && (
            <button
              type="button"
              onClick={startNew}
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t.projects.createFirst}
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#090A0F]">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className="flex flex-col gap-4 p-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#050507]">
                  <ProductPreviewCanvas
                    theme={proj.previewTheme}
                    title={proj.title}
                    coverImageUrl={proj.coverImageUrl}
                    galleryUrls={proj.galleryUrls}
                    coverMediaType={proj.coverMediaType}
                    showSlideBadge={false}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span className="font-mono tabular-nums text-zinc-500">#{proj.index}</span>
                    <span aria-hidden="true">·</span>
                    <span>{proj.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{proj.year}</span>
                    <span aria-hidden="true">·</span>
                    <span className={proj.published ? 'text-emerald-400' : 'text-amber-400'}>
                      {proj.published ? t.common.published : t.common.draft}
                    </span>
                    {proj.galleryUrls && proj.galleryUrls.length > 1 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px] text-zinc-300">
                          {proj.galleryUrls.length} {lang === 'bn' ? 'টি ছবি' : 'photos'}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-0.5 truncate text-base font-semibold text-white">
                    {proj.title}
                  </h3>
                  <p className="truncate text-xs text-zinc-400">
                    {proj.platform} · {proj.client}
                    {proj.liveUrl ? ` · ${proj.liveUrl}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSaveProject({ ...proj, published: !proj.published })}
                  aria-label={proj.published ? `Hide ${proj.title}` : `Publish ${proj.title}`}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  {proj.published ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.common.hide}
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.common.publish}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => startEdit(proj)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.common.edit}
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(proj)}
                  aria-label={`Delete ${proj.title}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:border-[#DC2626]/40 hover:text-[#EF4444]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t.projects.deleteTitle}
        description={
          deleteTarget ? `"${deleteTarget.title}" — ${t.projects.deleteConfirm}` : ''
        }
        confirmLabel={t.projects.deleteTitle}
        busy={saving}
        lang={lang}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const targetId = deleteTarget.id;
          const ok = await onDeleteProject(targetId);
          if (ok) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
