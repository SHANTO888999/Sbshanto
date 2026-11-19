import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { usePortfolioContent } from '../context/PortfolioContentContext';
import { formatTelHref, formatWhatsappHref } from '../data/contentSchema';
import { trackCvDownload } from '../firebaseViewer';
import { copyTextSafely } from '../utils/clipboard';
import { downloadPortfolioCv } from '../utils/cvPdfGenerator';
import { DesignBlock, TypedText } from './DesignCursorSystem';

interface ContactSectionProps {
  onOpenInquiry: () => void;
}

type SocialPlatformId =
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'behance'
  | 'facebook'
  | 'whatsapp'
  | 'instagram';

interface SocialLinkEntry {
  id: SocialPlatformId;
  label: string;
  sublabel?: string;
  href: string;
  hoverClass: string;
}

const SocialLogo: React.FC<{ id: SocialPlatformId }> = ({ id }) => {
  switch (id) {
    case 'github':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.29l13.32 17.41Z" />
        </svg>
      );
    case 'behance':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M22 7h-7V5h7v2Zm1.73 10c-.45 1.3-2.02 3-5.11 3-3.1 0-5.62-1.73-5.62-5.67 0-3.9 2.35-5.94 5.52-5.94 3.1 0 4.98 1.8 5.39 4.44.08.5.11 1.19.09 2.15h-8.02c.13 3.2 3.49 3.31 4.6 2.02h3.15Zm-7.68-4h4.96c-.11-1.55-1.15-2.22-2.48-2.22-1.45 0-2.27.77-2.48 2.22ZM6.47 20H0V4h7.02c5.48.08 5.58 5.44 2.72 6.91 3.46 1.26 3.57 9.09-3.27 9.09ZM3 10.67h3.58c2.52 0 2.91-3.34-.31-3.34H3v3.34Zm3.39 2.66H3v3.34h3.34c3.05 0 2.86-3.34.05-3.34Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.09 24 12.07Z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M12.04 2C6.51 2 2.02 6.49 2.02 12.02c0 1.77.46 3.5 1.34 5.02L2 22l5.1-1.34a9.98 9.98 0 0 0 4.94 1.3c5.53 0 10.02-4.49 10.02-10.02C22.06 6.49 17.57 2 12.04 2Zm5.83 14.17c-.25.7-1.44 1.34-2 1.42-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.85 2.06.92 2.21.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.45.54-.15.15-.31.31-.13.61.18.3.79 1.3 1.7 2.11 1.17 1.04 2.15 1.36 2.45 1.51.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.96.3.15.5.22.57.34.08.12.08.7-.17 1.4Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.87 5.87 0 0 0-2.12 1.39A5.87 5.87 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.48 1.39 2.15.67.67 1.35 1.08 2.15 1.39.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.87 5.87 0 0 0 2.15-1.39 5.87 5.87 0 0 0 1.39-2.15c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.87 5.87 0 0 0-1.39-2.15A5.87 5.87 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z" />
        </svg>
      );
  }
};

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenInquiry }) => {
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | 'whatsapp' | null>(null);
  const portfolioContent = usePortfolioContent();
  const { profile, viewerControls } = portfolioContent;
  const email = profile.email;
  const telHref = formatTelHref(profile.phoneNumber);
  const whatsappHref = formatWhatsappHref(profile.whatsappNumber);
  const locationText = profile.location || 'Dhaka, Bangladesh';

  const socialLinks: SocialLinkEntry[] = [
    profile.githubUrl
      ? {
          id: 'github',
          label: 'GitHub',
          sublabel: profile.githubHandle,
          href: profile.githubUrl,
          hoverClass: 'hover:border-zinc-400/50 hover:text-white',
        }
      : null,
    profile.linkedinUrl
      ? {
          id: 'linkedin',
          label: 'LinkedIn',
          href: profile.linkedinUrl,
          hoverClass: 'hover:border-sky-400/50 hover:text-sky-300',
        }
      : null,
    profile.twitterUrl
      ? {
          id: 'twitter',
          label: 'Twitter / X',
          href: profile.twitterUrl,
          hoverClass: 'hover:border-zinc-300/50 hover:text-white',
        }
      : null,
    profile.behanceUrl
      ? {
          id: 'behance',
          label: 'Behance',
          href: profile.behanceUrl,
          hoverClass: 'hover:border-blue-400/50 hover:text-blue-300',
        }
      : null,
    profile.facebookUrl
      ? {
          id: 'facebook',
          label: 'Facebook',
          href: profile.facebookUrl,
          hoverClass: 'hover:border-blue-500/50 hover:text-blue-300',
        }
      : null,
    whatsappHref
      ? {
          id: 'whatsapp',
          label: 'WhatsApp',
          href: whatsappHref,
          hoverClass: 'hover:border-emerald-500/50 hover:text-emerald-300',
        }
      : null,
    profile.instagramUrl
      ? {
          id: 'instagram',
          label: 'Instagram',
          href: profile.instagramUrl,
          hoverClass: 'hover:border-pink-400/50 hover:text-pink-300',
        }
      : null,
  ].filter((entry): entry is SocialLinkEntry => entry !== null);

  const handleCopyField = async (field: 'email' | 'phone' | 'whatsapp', value: string) => {
    const ok = await copyTextSafely(value);
    if (ok) {
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 2200);
    }
  };

  return (
    <footer id="contact" className="bg-[#08080A] pt-20 pb-12 lg:pt-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <DesignBlock shape="panel" slotIndex={0} label="Section / Contact">
          <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium text-zinc-400">
                <TypedText text="New Builds & Collaborations" />
              </p>
              <h2 className="mt-2 font-display text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-6xl [text-wrap:balance]">
                <TypedText
                  text="LET'S BUILD"
                  accentText="TOGETHER."
                  accentBreak
                  accentClassName="text-accent"
                />
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                <TypedText text="Need a custom website, full-stack web or mobile application, or an interactive game built from scratch? Send your project idea and get a build plan within 24 hours." />
              </p>
            </div>

            <div className="flex flex-col justify-between gap-6 lg:col-span-5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenInquiry}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-dark whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Start a Project Brief
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>

                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20 whitespace-nowrap shrink-0"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>WhatsApp Chat</span>
                  </a>
                )}

                {viewerControls.showCvDownloadOnViewer && (
                  <button
                    type="button"
                    onClick={() => {
                      downloadPortfolioCv(portfolioContent);
                      void trackCvDownload();
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-accent/45 bg-accent/10 px-4 py-3 text-xs font-semibold text-white transition-colors hover:border-accent hover:bg-accent/20 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-4 w-4 text-accent-light" aria-hidden="true" />
                    <span>Download CV (PDF)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-5">
                <div>
                  <div className="text-xs text-zinc-500">Discipline</div>
                  <p className="mt-1 text-xs font-medium text-zinc-200">
                    <TypedText text={profile.disciplineSummary} />
                  </p>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Availability</div>
                  <p className="mt-1 text-xs font-medium text-zinc-200">
                    <TypedText text={profile.availability} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DesignBlock>

        {/* Dedicated Bottom Owner Contact Details & Social Media Section */}
        <DesignBlock shape="panel" slotIndex={1} label="Contact Details" delay={120}>
          <div className="mt-12 rounded-2xl border border-white/10 bg-[#0D0D12] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-accent-light">
                  Direct Contact Details
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
                  {profile.displayName} — Reach Out Directly
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#121319] px-3 py-1.5 text-zinc-300">
                  <MapPin className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
                  {locationText}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                  {profile.availability}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Email Card */}
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#111218] p-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Mail className="h-4 w-4 text-accent-light" aria-hidden="true" />
                    <span>Email</span>
                  </div>
                  <a
                    href={`mailto:${email}`}
                    className="mt-2 block truncate text-sm font-medium text-white transition-colors hover:text-accent-light"
                    title={email}
                  >
                    {email}
                  </a>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-white/30 hover:text-white"
                  >
                    Send Mail
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyField('email', email)}
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* WhatsApp Card */}
              {whatsappHref && (
                <div className="flex flex-col justify-between rounded-xl border border-emerald-500/25 bg-[#111218] p-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-emerald-300">
                      <MessageCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <span>WhatsApp</span>
                    </div>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block font-mono text-sm font-medium tabular-nums text-white transition-colors hover:text-emerald-300"
                    >
                      {profile.whatsappNumber}
                    </a>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/25"
                    >
                      Message
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopyField('whatsapp', profile.whatsappNumber)}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white"
                    >
                      {copiedField === 'whatsapp' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact / Phone Card */}
              {telHref && (
                <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#111218] p-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Phone className="h-4 w-4 text-accent-light" aria-hidden="true" />
                      <span>Contact Number</span>
                    </div>
                    <a
                      href={telHref}
                      className="mt-2 block font-mono text-sm font-medium tabular-nums text-white transition-colors hover:text-accent-light"
                    >
                      {profile.phoneNumber}
                    </a>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={telHref}
                      className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-white/30 hover:text-white"
                    >
                      Call Now
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopyField('phone', profile.phoneNumber)}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white"
                    >
                      {copiedField === 'phone' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Social Media Links Bar with Brand Logos */}
            {socialLinks.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    Social Media &amp; Profiles
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    First Prototype: <span className="font-mono text-zinc-300">{profile.prototypeTurnaround}</span>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {socialLinks.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className={`group inline-flex min-h-[40px] items-center gap-2.5 rounded-lg border border-white/10 bg-[#111218] px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors ${item.hoverClass}`}
                    >
                      <SocialLogo id={item.id} />
                      <span>{item.label}</span>
                      {item.sublabel && (
                        <span className="hidden font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300 sm:inline">
                          {item.sublabel}
                        </span>
                      )}
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-current" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DesignBlock>

        {/* Bottom Copyright Row */}
        <DesignBlock shape="row" slotIndex={2} label="Footer Bar">
          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
            <p>
              &copy; {new Date().getFullYear()} <TypedText text={`${profile.backdropName}. All rights reserved.`} />
            </p>
            <p className="font-mono text-[11px] text-zinc-500">
              {locationText}
            </p>
          </div>
        </DesignBlock>
      </div>
    </footer>
  );
};
