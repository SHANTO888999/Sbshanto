import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Mail, Trash2 } from 'lucide-react';
import type { InquiryRecord, InquiryStatus } from '../../firebaseAdmin';
import { copyTextSafely } from '../../utils/clipboard';
import { getAdminCopy, type AdminLang } from './adminI18n';
import { ConfirmDialog } from './FieldControls';

interface AdminInquiriesInboxProps {
  inquiries: InquiryRecord[];
  saving: boolean;
  lang?: AdminLang;
  onUpdateStatus: (id: string, status: InquiryStatus) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  closeDialogNonce?: number;
  onDialogOpenChange?: (open: boolean) => void;
}

const STATUS_FILTERS: ReadonlyArray<'all' | InquiryStatus> = [
  'all',
  'new',
  'read',
  'replied',
  'archived',
];

export const AdminInquiriesInbox: React.FC<AdminInquiriesInboxProps> = ({
  inquiries,
  saving,
  lang = 'en',
  onUpdateStatus,
  onDelete,
  closeDialogNonce = 0,
  onDialogOpenChange,
}) => {
  const t = getAdminCopy(lang);
  const [filter, setFilter] = useState<'all' | InquiryStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InquiryRecord | null>(null);
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

  const visible = useMemo(() => {
    if (filter === 'all') return inquiries;
    return inquiries.filter((i) => i.status === filter);
  }, [inquiries, filter]);

  const handleCopyEmail = async (inq: InquiryRecord) => {
    const ok = await copyTextSafely(inq.email);
    if (ok) {
      setCopiedId(inq.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
          {t.inquiries.heading} ({inquiries.length})
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-[#08090D] p-1">
        {STATUS_FILTERS.map((st) => {
          const count =
            st === 'all' ? inquiries.length : inquiries.filter((i) => i.status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                filter === st
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.inquiries.statuses[st]} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-[#090A0F] p-10 text-center">
          <p className="text-sm font-medium text-zinc-400">{t.inquiries.emptyTitle}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((inq) => {
            const dateLabel = new Date(inq.createdAtMs).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const statusTone =
              inq.status === 'new'
                ? 'text-accent-light'
                : inq.status === 'replied'
                  ? 'text-emerald-400'
                  : 'text-zinc-400';

            return (
              <article
                key={inq.id}
                className="rounded-lg border border-white/10 bg-[#090A0F] p-4"
              >
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className={`font-semibold uppercase ${statusTone}`}>
                        {t.inquiries.statuses[inq.status]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{inq.scope}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{dateLabel}</span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-white">{inq.name}</h3>
                    <p className="font-mono text-xs text-zinc-400">{inq.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label={`Status for ${inq.name}`}
                      value={inq.status}
                      disabled={saving}
                      onChange={(e) => onUpdateStatus(inq.id, e.target.value as InquiryStatus)}
                      className="min-h-[38px] rounded-md border border-white/15 bg-[#070709] px-3 py-1.5 text-xs font-medium text-white focus:border-accent focus:outline-none"
                    >
                      <option value="new">{t.inquiries.statuses.new}</option>
                      <option value="read">{t.inquiries.statuses.read}</option>
                      <option value="replied">{t.inquiries.statuses.replied}</option>
                      <option value="archived">{t.inquiries.statuses.archived}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleCopyEmail(inq)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                    >
                      {copiedId === inq.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                          {t.inquiries.copied}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          {t.inquiries.copyEmail}
                        </>
                      )}
                    </button>

                    <a
                      href={`mailto:${inq.email}?subject=${encodeURIComponent(
                        `Re: ${inq.scope} Inquiry — SHANTO Studio`
                      )}`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.inquiries.reply}
                    </a>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(inq)}
                      aria-label={`Delete inquiry from ${inq.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {inq.brief}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t.inquiries.deleteTitle}
        description={
          deleteTarget
            ? lang === 'bn'
              ? `${deleteTarget.name} (${deleteTarget.email})-এর এই মেসেজটি চিরতরে মুছে ফেলবেন?`
              : `Delete this message from ${deleteTarget.name} (${deleteTarget.email}) permanently?`
            : ''
        }
        busy={saving}
        lang={lang}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const ok = await onDelete(deleteTarget.id);
          if (ok) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
