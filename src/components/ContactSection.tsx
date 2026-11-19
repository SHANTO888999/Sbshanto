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
import {
  formatTelHref,
  formatWhatsappHref,
  type SocialPlatformKey,
} from '../data/contentSchema';
import { trackCvDownload } from '../firebaseViewer';
import { copyTextSafely } from '../utils/clipboard';
import { downloadPortfolioCv } from '../utils/cvPdfGenerator';
import { DesignBlock, TypedText } from './DesignCursorSystem';
import { SocialBrandLogo } from './SocialBrandLogo';

interface ContactSectionProps {
  onOpenInquiry: () => void;
}

interface SocialLinkEntry {
  id: SocialPlatformKey;
  platformName: string;
  displayName: string;
  href: string;
  hoverClass: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenInquiry }) => {
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | 'whatsapp' | null>(null);
  const portfolioContent = usePortfolioContent();
  const { profile, viewerControls } = portfolioContent;
  const email = profile.email;
  const telHref = formatTelHref(profile.phoneNumber);
  const whatsappHref = formatWhatsappHref(profile.whatsappNumber);
  const locationText = profile.location || 'Dhaka, Bangladesh';
  const names = profile.socialNames;

  const socialLinks: SocialLinkEntry[] = [
    profile.facebookUrl
      ? {
          id: 'facebook',
          platformName: 'Facebook',
          displayName: names.facebook.trim() || 'Facebook',
          href: profile.facebookUrl,
          hoverClass: 'hover:border-blue-500/50 hover:text-blue-300',
        }
      : null,
    whatsappHref
      ? {
          id: 'whatsapp',
          platformName: 'WhatsApp',
          displayName: names.whatsapp.trim() || 'WhatsApp',
          href: whatsappHref,
          hoverClass: 'hover:border-emerald-500/50 hover:text-emerald-300',
        }
      : null,
    profile.instagramUrl
      ? {
          id: 'instagram',
          platformName: 'Instagram',
          displayName: names.instagram.trim() || 'Instagram',
          href: profile.instagramUrl,
          hoverClass: 'hover:border-pink-400/50 hover:text-pink-300',
        }
      : null,
    profile.linkedinUrl
      ? {
          id: 'linkedin',
          platformName: 'LinkedIn',
          displayName: names.linkedin.trim() || 'LinkedIn',
          href: profile.linkedinUrl,
          hoverClass: 'hover:border-sky-400/50 hover:text-sky-300',
        }
      : null,
    profile.twitterUrl
      ? {
          id: 'twitter',
          platformName: 'Twitter / X',
          displayName: names.twitter.trim() || 'Twitter / X',
          href: profile.twitterUrl,
          hoverClass: 'hover:border-zinc-300/50 hover:text-white',
        }
      : null,
    profile.behanceUrl
      ? {
          id: 'behance',
          platformName: 'Behance',
          displayName: names.behance.trim() || 'Behance',
          href: profile.behanceUrl,
          hoverClass: 'hover:border-blue-400/50 hover:text-blue-300',
        }
      : null,
    profile.githubUrl
      ? {
          id: 'github',
          platformName: 'GitHub',
          displayName: names.github.trim() || profile.githubHandle.trim() || 'GitHub',
          href: profile.githubUrl,
          hoverClass: 'hover:border-zinc-400/50 hover:text-white',
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
                  {socialLinks.map((item) => {
                    const ariaText =
                      item.displayName !== item.platformName
                        ? `${item.platformName} — ${item.displayName}`
                        : item.platformName;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ariaText}
                        title={ariaText}
                        className={`group inline-flex min-h-[40px] items-center gap-2.5 rounded-lg border border-white/10 bg-[#111218] px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors ${item.hoverClass}`}
                      >
                        <SocialBrandLogo id={item.id} />
                        <span>{item.displayName}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-current" aria-hidden="true" />
                      </a>
                    );
                  })}
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
