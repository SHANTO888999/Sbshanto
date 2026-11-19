import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { sanitizePublicUrl } from '../../data/contentSchema';
import { getAdminCopy, type AdminLang } from './adminI18n';

type EnterKeyHintValue = 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';

interface LimitedInputProps {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel';
  enterKeyHint?: EnterKeyHintValue;
}

export const LimitedInput: React.FC<LimitedInputProps> = ({
  id,
  label,
  value,
  maxLength,
  onChange,
  placeholder,
  hint,
  required = false,
  type = 'text',
  enterKeyHint = 'next',
}) => {
  const count = value.length;
  const nearLimit = count >= Math.floor(maxLength * 0.85);
  const atLimit = count >= maxLength;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-xs font-medium text-zinc-200">
          {label}
          {required && <span className="ml-1 text-accent-light">*</span>}
        </label>
        <span
          className={`font-mono text-[11px] tabular-nums ${
            atLimit ? 'text-[#EF4444]' : nearLimit ? 'text-amber-400' : 'text-zinc-500'
          }`}
        >
          {count}/{maxLength}
        </span>
      </div>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        required={required}
        enterKeyHint={enterKeyHint}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-accent focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
};

interface LimitedTextareaProps {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  rows?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  enterKeyHint?: EnterKeyHintValue;
}

export const LimitedTextarea: React.FC<LimitedTextareaProps> = ({
  id,
  label,
  value,
  maxLength,
  rows = 3,
  onChange,
  placeholder,
  hint,
  required = false,
  enterKeyHint = 'next',
}) => {
  const count = value.length;
  const nearLimit = count >= Math.floor(maxLength * 0.85);
  const atLimit = count >= maxLength;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-xs font-medium text-zinc-200">
          {label}
          {required && <span className="ml-1 text-accent-light">*</span>}
        </label>
        <span
          className={`font-mono text-[11px] tabular-nums ${
            atLimit ? 'text-[#EF4444]' : nearLimit ? 'text-amber-400' : 'text-zinc-500'
          }`}
        >
          {count}/{maxLength}
        </span>
      </div>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        required={required}
        enterKeyHint={enterKeyHint}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-md border border-white/15 bg-[#070709] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-zinc-500 transition-colors focus:border-accent focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
};

interface SafeUrlInputProps {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  enterKeyHint?: EnterKeyHintValue;
  autoPrefixHttps?: boolean;
  lang?: AdminLang;
}

export const SafeUrlInput: React.FC<SafeUrlInputProps> = ({
  id,
  label,
  value,
  maxLength,
  onChange,
  placeholder,
  hint,
  required = false,
  enterKeyHint = 'next',
  autoPrefixHttps = false,
  lang = 'en',
}) => {
  const trimmed = value.trim();
  const isValid = !trimmed || Boolean(sanitizePublicUrl(trimmed, ''));

  const handleBlur = () => {
    if (!autoPrefixHttps) return;
    const raw = value.trim();
    if (!raw || raw.startsWith('/') || raw.includes('://') || raw.startsWith('mailto:') || raw.startsWith('data:')) {
      return;
    }
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
      onChange(`https://${raw}`.slice(0, maxLength));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-xs font-medium text-zinc-200">
          {label}
          {required && <span className="ml-1 text-accent-light">*</span>}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">
          {value.length}/{maxLength}
        </span>
      </div>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        required={required}
        enterKeyHint={enterKeyHint}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`mt-1.5 min-h-[44px] w-full rounded-md border bg-[#070709] px-3.5 py-2 font-mono text-xs text-white placeholder:text-zinc-500 transition-colors focus:outline-none ${
          isValid ? 'border-white/15 focus:border-accent' : 'border-[#EF4444]'
        }`}
      />
      {!isValid ? (
        <p className="mt-1 text-xs text-[#EF4444]">
          {lang === 'bn'
            ? 'সঠিক https:// লিংক বা /assets/... পাথ লিখুন।'
            : 'Enter a valid https:// URL or relative /assets/... path.'}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  lang?: AdminLang;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  lang = 'en',
  onCancel,
  onConfirm,
}) => {
  const t = getAdminCopy(lang);
  const resolvedConfirmLabel = confirmLabel ?? t.common.delete;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/15 bg-[#0D0E12] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[#EF4444]">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[40px] rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-[40px] rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
          >
            {busy ? t.common.working : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface StatusNoticeProps {
  notice: { type: 'success' | 'error'; text: string } | null;
  onDismiss: () => void;
}

export const StatusNotice: React.FC<StatusNoticeProps> = ({ notice, onDismiss }) => {
  if (!notice) return null;
  const isSuccess = notice.type === 'success';
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
        isSuccess
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          : 'border-[#DC2626]/40 bg-[#DC2626]/10 text-red-200'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
        )}
        <span>{notice.text}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-zinc-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
