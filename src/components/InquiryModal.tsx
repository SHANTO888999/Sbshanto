import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Copy, Mail, X } from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { isValidEmailAddress } from '../data/contentSchema';
import {
  submitProjectInquiry,
  trackHireInquirySubmit,
} from '../firebaseViewer';
import { copyTextSafely } from '../utils/clipboard';
import { handleViewerFormEnterToSubmit } from '../utils/formKeyboardNav';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  submitted?: boolean;
  onSubmittedChange?: (submitted: boolean) => void;
  trackAnalytics?: boolean;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  onBack,
  submitted: controlledSubmitted,
  onSubmittedChange,
  trackAnalytics = true,
}) => {
  const { profile } = usePortfolioContent();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState('Website Design & Development');
  const [brief, setBrief] = useState('');
  const [internalSubmitted, setInternalSubmitted] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitted = controlledSubmitted ?? internalSubmitted;
  const setSubmitted = (next: boolean) => {
    setInternalSubmitted(next);
    onSubmittedChange?.(next);
  };

  useEffect(() => {
    if (!isOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formattedBrief = `Project Inquiry from ${name} (${email})\nDiscipline: ${scope}\n\n${brief}`;
  const mailtoHref = `mailto:${profile.email}?subject=${encodeURIComponent(
    `[Project Brief] ${scope} — ${name}`
  )}&body=${encodeURIComponent(formattedBrief)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanBrief = brief.trim();

    if (!cleanName || !cleanBrief) {
      setFormError('Please enter your name and project details.');
      return;
    }
    if (!isValidEmailAddress(cleanEmail)) {
      setFormError('Please enter a valid email address so Shanto can reply.');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const existing = JSON.parse(window.localStorage.getItem('shanto_project_briefs') || '[]');
      const next = [
        ...existing,
        {
          id: Date.now(),
          name: cleanName,
          email: cleanEmail,
          scope,
          brief: cleanBrief,
          createdAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem('shanto_project_briefs', JSON.stringify(next));
    } catch {
      // ignore storage failure
    }

    try {
      await submitProjectInquiry({
        name: cleanName,
        email: cleanEmail,
        scope,
        brief: cleanBrief,
      });
      setCloudSaved(true);
      if (trackAnalytics) {
        void trackHireInquirySubmit();
      }
    } catch (err) {
      console.warn('Firestore inquiry save fallback used:', err);
      setCloudSaved(false);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const handleCopyBrief = async () => {
    const ok = await copyTextSafely(formattedBrief);
    if (ok) {
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 2000);
    }
  };

  const resetAndClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSubmitted(false);
    setCloudSaved(true);
    setFormError(null);
    setCopiedBrief(false);
    setName('');
    setEmail('');
    setBrief('');
    onClose();
  };

  const handleBackAction = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (submitted) {
      setSubmitted(false);
      return;
    }
    resetAndClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Project inquiry form"
      onClick={resetAndClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0D0D11] p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <button
              type="button"
              onClick={handleBackAction}
              aria-label="Go back"
              className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-[#121319] px-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-accent/60 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent-light">Work With Shanto</p>
              <h3 className="mt-0.5 truncate font-display text-2xl font-bold text-white sm:text-3xl">
                START A PROJECT BRIEF
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close inquiry modal"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center sm:p-6">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
            <h4 className="mt-3 text-lg font-semibold text-white">
              {cloudSaved ? 'Brief Delivered & Saved' : 'Brief Ready to Send'}
            </h4>
            <p className="mt-2 text-sm text-zinc-300">
              {cloudSaved
                ? `Thanks, ${name}. Your ${scope.toLowerCase()} brief is delivered to Shanto's inbox. You can also send via email or copy it below.`
                : `Cloud inbox could not be reached right now, so your brief is saved locally. Tap Open in Email App or Copy Brief below to send it to ${profile.email}.`}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Open in Email App
              </a>
              <button
                type="button"
                onClick={handleCopyBrief}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-[#111115] px-4 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white"
              >
                {copiedBrief ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    Copied Brief
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy Brief
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-md px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit}
            onKeyDown={handleViewerFormEnterToSubmit}
            className="mt-4 space-y-3"
          >
            {formError && (
              <p
                role="alert"
                className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-red-200"
              >
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="inq-name" className="block text-xs font-medium text-zinc-300">
                  Your Name
                </label>
                <input
                  id="inq-name"
                  type="text"
                  required
                  maxLength={80}
                  enterKeyHint="next"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arif Rahman"
                  className="mt-1 w-full rounded-md border border-white/15 bg-[#08080A] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="inq-email" className="block text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <input
                  id="inq-email"
                  type="email"
                  required
                  maxLength={120}
                  enterKeyHint="next"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1 w-full rounded-md border border-white/15 bg-[#08080A] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inq-scope" className="block text-xs font-medium text-zinc-300">
                What Are We Building?
              </label>
              <select
                id="inq-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/15 bg-[#08080A] px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
              >
                <option>Website Design &amp; Development</option>
                <option>Full-Stack Web / Mobile Application</option>
                <option>2D / 3D Game Design &amp; Development</option>
                <option>UI/UX Design System &amp; Prototype</option>
              </select>
            </div>

            <div>
              <label htmlFor="inq-brief" className="block text-xs font-medium text-zinc-300">
                Project Goals &amp; Timeline
              </label>
              <textarea
                id="inq-brief"
                rows={2}
                required
                maxLength={2000}
                enterKeyHint="send"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Tell Shanto about your website, app, or game idea..."
                className="mt-1 w-full rounded-md border border-white/15 bg-[#08080A] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
              >
                {submitting ? 'Sending Brief...' : 'Send Project Brief'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
