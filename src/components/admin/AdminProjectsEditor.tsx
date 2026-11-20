import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
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
import type { PreviewTheme, ProjectCategory } from '../../data/contentSchema';
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
  StatusNotice,
} from './FieldControls';

interface AdminProjectsEditorProps {
  projects: AdminProjectRecord[];
  saving: boolean;
  lang?: AdminLang;
  saveNotice?: { type: 'success' | 'error'; text: string } | null;
  onDismissNotice?: () => void;
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

const THEMES: ReadonlyArray<{ id: PreviewTheme; label: string }> = [
  { id: 'web-commerce', label: 'Website Launch Canvas' },
  { id: 'app-workspace', label: 'App Workspace Canvas' },
  { id: 'app-realtime', label: 'Mobile / Realtime App Canvas' },
  { id: 'game-rift', label: 'Action Game World Canvas' },
  { id: 'game-drift', label: 'Arcade Racer Canvas' },
  { id: 'ui-system', label: 'UI Component Library Canvas' },
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
  saveNotice = null,
  onDismissNotice,
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
      setFormError('Please wait until the photo or video finishes optimizing before saving.');
      return;
    }

    if (
      !editing.index.trim() ||
      !editing.title.trim() ||
      !editing.year.trim() ||
      !editing.platform.trim() ||
      !editing.client.trim() ||
      !editing.role.trim() ||
      !editing.dimensions.trim() ||
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
      setFormError('Cover media URL must be a valid https:// link or /assets/... path.');
      window.requestAnimationFrame(() => {
        formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (normalizedLive && !sanitizePublicUrl(normalizedLive, '')) {
      setFormError('Live Project URL must start with https:// or http://.');
      window.requestAnimationFrame(() => {
        formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (normalizedRepo && !sanitizePublicUrl(normalizedRepo, '')) {
      setFormError('Source Code URL must start with https:// or http://.');
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t.projects.backToProjects}
            </button>
            <h2 className="font-display text-2xl font-semibold text-white">
              {projects.some((p) => p.id === editing.id)
                ? t.projects.editHeading
                : t.projects.newHeading}
            </h2>
          </div>

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <LimitedInput
                id="proj-index"
                label="Index"
                value={editing.index}
                maxLength={4}
                required
                onChange={(v) => setEditing({ ...editing, index: v })}
              />
              <div className="sm:col-span-2">
                <LimitedInput
                  id="proj-title"
                  label={lang === 'bn' ? 'প্রজেক্টের নাম' : 'Project Title'}
                  value={editing.title}
                  maxLength={56}
                  required
                  placeholder="e.g. Nova Commerce Engine"
                  onChange={(v) => setEditing({ ...editing, title: v })}
                />
              </div>
            </div>

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
                  {lang === 'bn' ? 'ক্রমিক নম্বর (0–1000)' : 'Display Order (0–1000)'}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="proj-platform"
                label={lang === 'bn' ? 'প্ল্যাটফর্ম' : 'Platform'}
                value={editing.platform}
                maxLength={36}
                required
                placeholder="Web & Mobile App"
                onChange={(v) => setEditing({ ...editing, platform: v })}
              />
              <LimitedInput
                id="proj-client"
                label={lang === 'bn' ? 'ক্লায়েন্ট / লেবেল' : 'Client / Label'}
                value={editing.client}
                maxLength={36}
                required
                onChange={(v) => setEditing({ ...editing, client: v })}
              />
              <LimitedInput
                id="proj-role"
                label={lang === 'bn' ? 'আপনার ভূমিকা' : 'Your Role'}
                value={editing.role}
                maxLength={64}
                required
                onChange={(v) => setEditing({ ...editing, role: v })}
              />
              <LimitedInput
                id="proj-dims"
                label={lang === 'bn' ? 'ব্যাজ সাইজ' : 'Viewport Badge Dimensions'}
                value={editing.dimensions}
                maxLength={20}
                required
                placeholder="1440 × 900"
                onChange={(v) => setEditing({ ...editing, dimensions: v })}
              />
            </div>

            <LimitedTextarea
              id="proj-summary"
              label={lang === 'bn' ? 'প্রজেক্টের সংক্ষিপ্ত বিবরণ' : 'Project Summary'}
              value={editing.summary}
              maxLength={280}
              rows={3}
              required
              placeholder="Concise summary of what you built and the outcome..."
              onChange={(v) => setEditing({ ...editing, summary: v })}
            />

            <LimitedTextarea
              id="proj-arch"
              label={lang === 'bn' ? 'টেকনিক্যাল নোটস' : 'Architecture & Craft Notes'}
              value={editing.architectureNotes}
              maxLength={300}
              rows={2}
              required
              placeholder="Technical highlights shown inside the inspection modal..."
              onChange={(v) => setEditing({ ...editing, architectureNotes: v })}
            />

            {/* Tech Stack Chips */}
            <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">
                  Tech Stack ({editing.stack.length}/6)
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
                    placeholder="Add technology (e.g. Next.js, Unity)"
                    className="min-h-[42px] flex-1 rounded-md border border-white/15 bg-[#070709] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addStackTag}
                    className="min-h-[42px] rounded-md border border-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                  >
                    + Tag
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
                    Test
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
                    onClick={() => {
                      setEditing({
                        ...editing,
                        coverImageUrl: '',
                        galleryUrls: [],
                        coverMediaType: undefined,
                      });
                      setMediaStatusNote(null);
                      setMediaError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/5 hover:text-[#EF4444]"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    {t.common.clear}
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

              {/* Reorderable Slideshow Thumbnails */}
              {gallerySlides.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {gallerySlides.map((slideUrl, idx) => (
                    <div
                      key={`${idx}-${slideUrl.slice(0, 32)}`}
                      className="group relative overflow-hidden rounded-lg border border-white/15 bg-[#050507]"
                    >
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
                            title="Make primary cover"
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white"
                          >
                            <Star className="h-2.5 w-2.5" />
                            #{idx + 1}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveGallerySlide(idx)}
                          aria-label={`Remove slide ${idx + 1}`}
                          className="rounded p-1 text-zinc-400 hover:bg-[#DC2626]/20 hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-3 w-3" />
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
                <label htmlFor="proj-theme" className="block text-xs font-medium text-zinc-200">
                  {t.projects.fallbackThemeLabel}
                </label>
                <select
                  id="proj-theme"
                  value={editing.previewTheme}
                  onChange={(e) =>
                    setEditing({ ...editing, previewTheme: e.target.value as PreviewTheme })
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                >
                  {THEMES.map((th) => (
                    <option key={th.id} value={th.id}>
                      {th.label}
                    </option>
                  ))}
                </select>
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

        {(formError || saveNotice) && (
          <div className="space-y-2">
            {formError && (
              <div
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
            {saveNotice && (
              <StatusNotice notice={saveNotice} onDismiss={() => onDismissNotice?.()} />
            )}
          </div>
        )}

        {/* Bottom Mobile Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t.projects.backToProjects}
          </button>
          <button
            type="submit"
            disabled={saving || Boolean(mediaBusyLabel)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent px-5 py-2 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
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
                          {proj.galleryUrls.length} photos
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
