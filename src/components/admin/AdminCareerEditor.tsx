import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import type { AdminExperienceRecord, AdminMilestoneRecord } from '../../firebase';
import { ConfirmDialog, LimitedInput, LimitedTextarea } from './FieldControls';

interface AdminCareerEditorProps {
  milestones: AdminMilestoneRecord[];
  experience: AdminExperienceRecord[];
  saving: boolean;
  onSaveMilestone: (item: AdminMilestoneRecord) => Promise<void>;
  onDeleteMilestone: (id: string) => Promise<void>;
  onSaveExperience: (item: AdminExperienceRecord) => Promise<void>;
  onDeleteExperience: (id: string) => Promise<void>;
}

export const AdminCareerEditor: React.FC<AdminCareerEditorProps> = ({
  milestones,
  experience,
  saving,
  onSaveMilestone,
  onDeleteMilestone,
  onSaveExperience,
  onDeleteExperience,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'milestones' | 'experience'>('milestones');
  const [editingMilestone, setEditingMilestone] = useState<AdminMilestoneRecord | null>(null);
  const [editingExp, setEditingExp] = useState<AdminExperienceRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { kind: 'milestone'; id: string; label: string }
    | { kind: 'experience'; id: string; label: string }
    | null
  >(null);

  if (editingMilestone) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSaveMilestone(editingMilestone);
          setEditingMilestone(null);
        }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingMilestone(null)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>
            <h2 className="font-display text-2xl font-bold text-white">
              {milestones.some((m) => m.id === editingMilestone.id)
                ? 'EDIT MILESTONE'
                : 'NEW MILESTONE'}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                setEditingMilestone({
                  ...editingMilestone,
                  published: !editingMilestone.published,
                })
              }
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
                editingMilestone.published
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {editingMilestone.published ? 'Published' : 'Hidden Draft'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? 'Saving...' : 'Save Milestone'}
            </button>
          </div>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-4">
          <LimitedInput
            id="ms-title"
            label="Milestone Headline"
            value={editingMilestone.title}
            maxLength={88}
            required
            onChange={(v) => setEditingMilestone({ ...editingMilestone, title: v })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LimitedInput
              id="ms-context"
              label="Discipline Context"
              value={editingMilestone.context}
              maxLength={52}
              required
              onChange={(v) => setEditingMilestone({ ...editingMilestone, context: v })}
            />
            <LimitedInput
              id="ms-project"
              label="Related Project"
              value={editingMilestone.project}
              maxLength={44}
              required
              onChange={(v) => setEditingMilestone({ ...editingMilestone, project: v })}
            />
            <LimitedInput
              id="ms-year"
              label="Year"
              value={editingMilestone.year}
              maxLength={10}
              required
              onChange={(v) => setEditingMilestone({ ...editingMilestone, year: v })}
            />
          </div>
          <LimitedTextarea
            id="ms-outcome"
            label="Measurable Outcome"
            value={editingMilestone.outcome}
            maxLength={220}
            rows={3}
            required
            onChange={(v) => setEditingMilestone({ ...editingMilestone, outcome: v })}
          />
          <div className="w-40">
            <label htmlFor="ms-order" className="block text-xs font-medium text-zinc-200">
              Sort Order
            </label>
            <input
              id="ms-order"
              type="number"
              min={0}
              max={1000}
              value={editingMilestone.sortOrder}
              onChange={(e) =>
                setEditingMilestone({
                  ...editingMilestone,
                  sortOrder: Math.max(0, Math.min(1000, Number(e.target.value) || 0)),
                })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 font-mono text-sm tabular-nums text-white focus:border-[#DC2626] focus:outline-none"
            />
          </div>
        </div>
      </form>
    );
  }

  if (editingExp) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSaveExperience(editingExp);
          setEditingExp(null);
        }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingExp(null)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>
            <h2 className="font-display text-2xl font-bold text-white">
              {experience.some((ex) => ex.id === editingExp.id)
                ? 'EDIT EXPERIENCE'
                : 'NEW EXPERIENCE'}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setEditingExp({ ...editingExp, published: !editingExp.published })}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
                editingExp.published
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {editingExp.published ? 'Published' : 'Hidden Draft'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LimitedInput
              id="exp-period"
              label="Time Period"
              value={editingExp.period}
              maxLength={24}
              required
              placeholder="2024 — Present"
              onChange={(v) => setEditingExp({ ...editingExp, period: v })}
            />
            <div className="sm:col-span-2">
              <LimitedInput
                id="exp-role"
                label="Role / Title"
                value={editingExp.role}
                maxLength={64}
                required
                onChange={(v) => setEditingExp({ ...editingExp, role: v })}
              />
            </div>
          </div>

          <LimitedInput
            id="exp-org"
            label="Studio / Organization"
            value={editingExp.org}
            maxLength={64}
            required
            onChange={(v) => setEditingExp({ ...editingExp, org: v })}
          />

          <LimitedTextarea
            id="exp-desc"
            label="Summary"
            value={editingExp.description}
            maxLength={240}
            rows={3}
            required
            onChange={(v) => setEditingExp({ ...editingExp, description: v })}
          />

          <div className="w-40">
            <label htmlFor="exp-order" className="block text-xs font-medium text-zinc-200">
              Sort Order
            </label>
            <input
              id="exp-order"
              type="number"
              min={0}
              max={1000}
              value={editingExp.sortOrder}
              onChange={(e) =>
                setEditingExp({
                  ...editingExp,
                  sortOrder: Math.max(0, Math.min(1000, Number(e.target.value) || 0)),
                })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3 py-2 font-mono text-sm tabular-nums text-white focus:border-[#DC2626] focus:outline-none"
            />
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            MILESTONES &amp; EXPERIENCE
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Control your shipped build milestones and studio timeline entries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeSubTab === 'milestones') {
              setEditingMilestone({
                id: `ms-${Date.now().toString(36)}`,
                title: '',
                context: 'Engineering & Craft',
                project: '',
                year: String(new Date().getFullYear()),
                outcome: '',
                published: true,
                sortOrder: milestones.length,
              });
            } else {
              setEditingExp({
                id: `exp-${Date.now().toString(36)}`,
                period: `${new Date().getFullYear()} — Present`,
                role: '',
                org: '',
                description: '',
                published: true,
                sortOrder: experience.length,
              });
            }
          }}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {activeSubTab === 'milestones' ? 'Add Milestone' : 'Add Experience'}
        </button>
      </div>

      <div className="inline-flex gap-1.5 rounded-lg border border-white/10 bg-[#08090D] p-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('milestones')}
          className={`min-h-[38px] rounded-md px-4 py-1.5 text-xs font-medium whitespace-nowrap ${
            activeSubTab === 'milestones'
              ? 'bg-[#DC2626] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Milestones ({milestones.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('experience')}
          className={`min-h-[38px] rounded-md px-4 py-1.5 text-xs font-medium whitespace-nowrap ${
            activeSubTab === 'experience'
              ? 'bg-[#DC2626] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Career Timeline ({experience.length})
        </button>
      </div>

      {activeSubTab === 'milestones' ? (
        milestones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-[#090A0F] p-10 text-center text-sm text-zinc-400">
            No cloud milestones saved yet. Add one or sync defaults from Overview.
          </div>
        ) : (
          <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#090A0F]">
            {milestones.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span className="font-mono tabular-nums">{item.year}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.project}</span>
                    <span aria-hidden="true">·</span>
                    <span className={item.published ? 'text-emerald-400' : 'text-amber-400'}>
                      {item.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="mt-0.5 truncate text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{item.outcome}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onSaveMilestone({ ...item, published: !item.published })}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    {item.published ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {item.published ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMilestone({ ...item })}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({ kind: 'milestone', id: item.id, label: item.title })
                    }
                    aria-label={`Delete ${item.title}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-[#EF4444]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : experience.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#090A0F] p-10 text-center text-sm text-zinc-400">
          No cloud experience entries saved yet. Add one or sync defaults from Overview.
        </div>
      ) : (
        <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#090A0F]">
          {experience.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="font-mono tabular-nums">{item.period}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.org}</span>
                  <span aria-hidden="true">·</span>
                  <span className={item.published ? 'text-emerald-400' : 'text-amber-400'}>
                    {item.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h3 className="mt-0.5 truncate text-sm font-semibold text-white">{item.role}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{item.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSaveExperience({ ...item, published: !item.published })}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                >
                  {item.published ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {item.published ? 'Hide' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExp({ ...item })}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirm({ kind: 'experience', id: item.id, label: item.role })
                  }
                  aria-label={`Delete ${item.role}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-[#EF4444]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === 'milestone' ? 'Delete Milestone' : 'Delete Experience'}
        description={
          deleteConfirm ? `Remove "${deleteConfirm.label}" from your cloud database?` : ''
        }
        busy={saving}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          if (deleteConfirm.kind === 'milestone') {
            await onDeleteMilestone(deleteConfirm.id);
          } else {
            await onDeleteExperience(deleteConfirm.id);
          }
          setDeleteConfirm(null);
        }}
      />
    </div>
  );
};
