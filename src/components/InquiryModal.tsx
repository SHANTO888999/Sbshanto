import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Mail, X } from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { submitProjectInquiry } from '../firebase';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({ isOpen, onClose }) => {
  const { profile } = usePortfolioContent();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState('Website Design & Development');
  const [brief, setBrief] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formattedBrief = `Project Inquiry from ${name} (${email})\nDiscipline: ${scope}\n\n${brief}`;
  const mailtoHref = `mailto:${profile.email}?subject=${encodeURIComponent(
    `[Project Brief] ${scope} — ${name}`
  )}&body=${encodeURIComponent(formattedBrief)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !brief.trim() || submitting) return;

    setSubmitting(true);

    try {
      const existing = JSON.parse(window.localStorage.getItem('shanto_project_briefs') || '[]');
      const next = [
        ...existing,
        {
          id: Date.now(),
          name: name.trim(),
          email: email.trim(),
          scope,
          brief: brief.trim(),
          createdAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem('shanto_project_briefs', JSON.stringify(next));
    } catch {
      // ignore storage failure
    }

    try {
      await submitProjectInquiry({
        name: name.trim(),
        email: email.trim(),
        scope,
        brief: brief.trim(),
      });
    } catch (err) {
      console.warn('Firestore inquiry save fallback used:', err);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(formattedBrief);
    } catch {
      // fallback ignored
    }
    setCopiedBrief(true);
    window.setTimeout(() => setCopiedBrief(false), 2000);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setCopiedBrief(false);
    setName('');
    setEmail('');
    setBrief('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Project inquiry form"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0D0D11] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#EF4444]">Work With Shanto</p>
            <h3 className="mt-1 font-display text-3xl font-bold text-white">
              START A PROJECT BRIEF
            </h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close inquiry modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
            <h4 className="mt-3 text-lg font-semibold text-white">Brief Saved &amp; Ready</h4>
            <p className="mt-2 text-sm text-zinc-300">
              Thanks, {name}. Your {scope.toLowerCase()} brief is saved. Send it directly via your
              email app or copy it below.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C]"
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
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="inq-name" className="block text-xs font-medium text-zinc-300">
                Your Name
              </label>
              <input
                id="inq-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arif Rahman"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-[#08080A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-[#08080A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="inq-scope" className="block text-xs font-medium text-zinc-300">
                What Are We Building?
              </label>
              <select
                id="inq-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/15 bg-[#08080A] px-3.5 py-2.5 text-sm text-white focus:border-[#DC2626] focus:outline-none"
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
                rows={3}
                required
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Tell Shanto about your website, app, or game idea..."
                className="mt-1.5 w-full rounded-md border border-white/15 bg-[#08080A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-[#DC2626] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60"
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
