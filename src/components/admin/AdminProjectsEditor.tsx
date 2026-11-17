import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Film,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { PreviewTheme, ProjectCategory } from '../../data/contentSchema';
import { isVideoMediaSource, sanitizePublicUrl } from '../../data/contentSchema';
import type { AdminProjectRecord } from '../../firebase';
import { handleFormEnterToNext } from '../../utils/formKeyboardNav';
import { processProjectPhotoFile, processProjectVideoFile } from '../../utils/mediaCompressor';
import { ProductPreviewCanvas } from '../ProductPreviewCanvas';
import { ConfirmDialog, LimitedInput, LimitedTextarea, SafeUrlInput } from './FieldControls';

interface AdminProjectsEditorProps {
  projects: AdminProjectRecord[];
  saving: boolean;
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
  onSaveProject,
  onDeleteProject,
  onSubViewChange,
  exitSubViewNonce = 0,
  closeDialogNonce = 0,
  onDialogOpenChange,
}) => {
  const [filterCategory, setFilterCategory] = useState<ProjectCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<AdminProjectRecord | null>(null);
  const [stackInput, setStackInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProjectRecord | null>(null);

  const [mediaBusyLabel, setMediaBusyLabel] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatusNote, setMediaStatusNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
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
    }
  }, [exitSubViewNonce]);

  useEffect(() => {
    if (!onSubViewChange) return;
    if (!editing) {
      onSubViewChange(null);
      return;
    }
    const isExisting = projects.some((p) => p.id === editing.id);
    onSubViewChange(isExisting ? 'Edit Project' : 'New Project');
  }, [editing, projects, onSubViewChange]);

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
    setEditing({ ...proj, stack: [...proj.stack] });
    setStackInput('');
    setMediaError(null);
    setMediaStatusNote(null);
    setFormError(null);
  };

  const startNew = () => {
    setEditing(createBlankProject(projects));
    setStackInput('');
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

  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    setMediaError(null);
    setMediaStatusNote(null);
    setMediaBusyLabel('Optimizing photo...');
    try {
      const result = await processProjectPhotoFile(file);
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              coverImageUrl: result.dataUrl,
              coverMediaType: 'image',
            }
          : prev
      );
      setMediaStatusNote(`Photo ready (${result.sizeKB} KB)`);
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to process selected photo.');
    } finally {
      setMediaBusyLabel(null);
    }
  };

  const handleVideoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    setMediaError(null);
    setMediaStatusNote(null);
    setMediaBusyLabel('Preparing video clip...');
    try {
      const result = await processProjectVideoFile(file, (label) => setMediaBusyLabel(label));
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              coverImageUrl: result.dataUrl,
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
    if (!editing || mediaBusyLabel || saving) return;

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
      setFormError('Fill in all required project details before saving.');
      return;
    }

    const coverTrimmed = (editing.coverImageUrl ?? '').trim();
    if (coverTrimmed && !coverTrimmed.startsWith('data:') && !sanitizePublicUrl(coverTrimmed, '')) {
      setFormError('Cover media URL must be a valid https:// link or /assets/... path.');
      return;
    }
    if ((editing.liveUrl ?? '').trim() && !sanitizePublicUrl(editing.liveUrl, '')) {
      setFormError('Live Demo URL must start with https:// or http://.');
      return;
    }
    if ((editing.repoUrl ?? '').trim() && !sanitizePublicUrl(editing.repoUrl, '')) {
      setFormError('Source Code URL must start with https:// or http://.');
      return;
    }

    setFormError(null);
    const ensuredStack = editing.stack.length > 0 ? editing.stack : ['React', 'TypeScript'];
    const ok = await onSaveProject({ ...editing, stack: ensuredStack });
    if (ok) {
      setEditing(null);
    }
  };

  if (editing) {
    const coverValue = editing.coverImageUrl ?? '';
    const isUploadedMedia = coverValue.startsWith('data:');
    const isVideoCover = Boolean(
      coverValue && isVideoMediaSource(coverValue, editing.coverMediaType)
    );

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
              Back to Projects
            </button>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                {projects.some((p) => p.id === editing.id) ? 'EDIT PROJECT' : 'NEW PROJECT'}
              </h2>
              <p className="text-xs text-zinc-400">
                Press Enter to jump to the next field. Attach a photo or short video clip below.
              </p>
            </div>
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
                  Published on Site
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Hidden Draft
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving || Boolean(mediaBusyLabel)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </div>

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
                  label="Project Title"
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
                  Category <span className="text-[#EF4444]">*</span>
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
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 text-sm text-white focus:border-[#DC2626] focus:outline-none"
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
                label="Year"
                value={editing.year}
                maxLength={12}
                required
                onChange={(v) => setEditing({ ...editing, year: v })}
              />

              <div>
                <label htmlFor="proj-order" className="block text-xs font-medium text-zinc-200">
                  Display Order (0–1000)
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
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3.5 py-2 font-mono text-sm tabular-nums text-white focus:border-[#DC2626] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LimitedInput
                id="proj-platform"
                label="Platform"
                value={editing.platform}
                maxLength={36}
                required
                placeholder="Web & Mobile App"
                onChange={(v) => setEditing({ ...editing, platform: v })}
              />
              <LimitedInput
                id="proj-client"
                label="Client / Label"
                value={editing.client}
                maxLength={36}
                required
                onChange={(v) => setEditing({ ...editing, client: v })}
              />
              <LimitedInput
                id="proj-role"
                label="Your Role"
                value={editing.role}
                maxLength={64}
                required
                onChange={(v) => setEditing({ ...editing, role: v })}
              />
              <LimitedInput
                id="proj-dims"
                label="Viewport Badge Dimensions"
                value={editing.dimensions}
                maxLength={20}
                required
                placeholder="1440 × 900"
                onChange={(v) => setEditing({ ...editing, dimensions: v })}
              />
            </div>

            <LimitedTextarea
              id="proj-summary"
              label="Project Summary"
              value={editing.summary}
              maxLength={280}
              rows={3}
              required
              placeholder="Concise summary of what you built and the outcome..."
              onChange={(v) => setEditing({ ...editing, summary: v })}
            />

            <LimitedTextarea
              id="proj-arch"
              label="Architecture & Craft Notes"
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
                  Tech Stack Tags ({editing.stack.length}/6)
                </span>
                <span className="text-[11px] text-zinc-500">Min 1, Max 6 tags</span>
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
                    className="min-h-[42px] flex-1 rounded-md border border-white/15 bg-[#070709] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addStackTag}
                    className="min-h-[42px] rounded-md border border-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                  >
                    Add Tag
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Project Photo, Short Video &amp; Links
              </p>

              {/* Upload Photo or Short Video from Phone */}
              <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-[#070709] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-200">
                    Cover Media (Photo or Short Clip)
                  </span>
                  {coverValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing({
                          ...editing,
                          coverImageUrl: '',
                          coverMediaType: undefined,
                        });
                        setMediaStatusNote(null);
                        setMediaError(null);
                      }}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/5 hover:text-[#EF4444]"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Clear
                    </button>
                  )}
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoPicked}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoPicked}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={Boolean(mediaBusyLabel)}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3 py-2 text-xs font-medium text-white hover:border-[#DC2626]/60 hover:bg-[#161922] disabled:opacity-50"
                  >
                    <ImagePlus className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                    Pick Photo
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(mediaBusyLabel)}
                    onClick={() => videoInputRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-white/15 bg-[#101218] px-3 py-2 text-xs font-medium text-white hover:border-[#DC2626]/60 hover:bg-[#161922] disabled:opacity-50"
                  >
                    <Film className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                    Short Video
                  </button>
                </div>

                {mediaBusyLabel && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
                    <span>{mediaBusyLabel}</span>
                  </div>
                )}

                {mediaError && (
                  <p className="rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-xs text-red-200">
                    {mediaError}
                  </p>
                )}

                {!mediaBusyLabel && (mediaStatusNote || isUploadedMedia) && (
                  <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {mediaStatusNote ??
                      (isVideoCover
                        ? 'Short video clip attached from device.'
                        : 'Compressed photo attached from device.')}
                  </p>
                )}

                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Photos auto-compress cleanly. Short videos (3–6 sec) auto-optimize into a silent
                  loop for fast mobile loading.
                </p>
              </div>

              <div className="mt-4">
                <label htmlFor="proj-theme" className="block text-xs font-medium text-zinc-200">
                  Fallback Vector Canvas Theme
                </label>
                <select
                  id="proj-theme"
                  value={editing.previewTheme}
                  onChange={(e) =>
                    setEditing({ ...editing, previewTheme: e.target.value as PreviewTheme })
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 text-sm text-white focus:border-[#DC2626] focus:outline-none"
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 aspect-[16/10] w-full overflow-hidden rounded-lg border border-white/10 bg-[#050507]">
                <ProductPreviewCanvas
                  theme={editing.previewTheme}
                  title={editing.title || 'Untitled Project'}
                  coverImageUrl={editing.coverImageUrl || undefined}
                  coverMediaType={editing.coverMediaType}
                  isAnimating
                />
              </div>

              <div className="mt-4 space-y-4">
                {!isUploadedMedia && (
                  <SafeUrlInput
                    id="proj-cover"
                    label="Or Paste Photo / Video URL"
                    value={coverValue}
                    maxLength={500}
                    placeholder="https://... (.jpg, .png, .webp, .mp4)"
                    hint="Optional external image or MP4 link if you didn't pick from phone."
                    onChange={(v) =>
                      setEditing({
                        ...editing,
                        coverImageUrl: v,
                        coverMediaType: v
                          ? isVideoMediaSource(v)
                            ? 'video'
                            : 'image'
                          : undefined,
                      })
                    }
                  />
                )}
                <SafeUrlInput
                  id="proj-live"
                  label="Optional Live Demo URL"
                  value={editing.liveUrl ?? ''}
                  maxLength={300}
                  placeholder="https://..."
                  onChange={(v) => setEditing({ ...editing, liveUrl: v })}
                />
                <SafeUrlInput
                  id="proj-repo"
                  label="Optional GitHub / Source URL"
                  value={editing.repoUrl ?? ''}
                  maxLength={300}
                  placeholder="https://github.com/..."
                  enterKeyHint="done"
                  onChange={(v) => setEditing({ ...editing, repoUrl: v })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Mobile Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Projects List
          </button>
          <button
            type="submit"
            disabled={saving || Boolean(mediaBusyLabel)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#DC2626] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {saving ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            PROJECTS SHOWCASE ({projects.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Add photos or short videos, reorder, hide drafts, or update projects shown in Works.
          </p>
        </div>

        <button
          type="button"
          onClick={startNew}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add New Project
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
                  ? 'bg-[#DC2626] text-white'
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
            placeholder="Filter projects..."
            aria-label="Filter projects"
            className="min-h-[40px] w-full rounded-md border border-white/15 bg-[#070709] py-2 pr-3 pl-9 text-xs text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#090A0F] p-10 text-center">
          <p className="text-sm font-medium text-zinc-200">
            {projects.length === 0
              ? 'No cloud projects saved yet.'
              : 'No projects match this filter.'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {projects.length === 0
              ? 'Create a new project or use "Sync Default Portfolio" from Overview.'
              : 'Try switching category or clearing the search box.'}
          </p>
          {projects.length === 0 && (
            <button
              type="button"
              onClick={startNew}
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#090A0F]">
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
                    coverMediaType={proj.coverMediaType}
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
                      {proj.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="mt-0.5 truncate text-base font-semibold text-white">
                    {proj.title}
                  </h3>
                  <p className="truncate text-xs text-zinc-400">
                    {proj.platform} · {proj.client}
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
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Publish
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => startEdit(proj)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
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
        title="Delete Project"
        description={
          deleteTarget
            ? `Remove "${deleteTarget.title}" permanently from your portfolio database?`
            : ''
        }
        confirmLabel="Delete Project"
        busy={saving}
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
