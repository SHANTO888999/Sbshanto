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
import { DesignBlock, TypedText, useCursorBuildPhase } from './DesignCursorSystem';
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

interface ContactCardConfig {
  id: 'email' | 'whatsapp' | 'phone';
  label: string;
  value: string;
  href: string;
  actionLabel: string;
  copyValue: string;
  external?: boolean;
  tone: 'accent' | 'emerald';
}

const ContactHeroContent: React.FC<{
  disciplineSummary: string;
  availability: string;
  showCvDownload: boolean;
  onOpenInquiry: () => void;
  onDownloadCv: () => void;
}> = ({
  disciplineSummary,
  availability,
  showCvDownload,
  onOpenInquiry,
  onDownloadCv,
}) => {
  const { isWireframe, isMonochrome } = useCursorBuildPhase();

  return (
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
            resizeScale
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
            data-cursor-color-target="true"
            className={`inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-300 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isWireframe
                ? 'border border-dashed border-white/30 bg-transparent text-zinc-400'
                : isMonochrome
                  ? 'border border-white/25 bg-white/10 text-zinc-200'
                  : 'bg-accent text-white hover:bg-accent-dark'
            }`}
          >
            <TypedText text="Start a Project Brief" />
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>

          {showCvDownload && (
            <button
              type="button"
              onClick={onDownloadCv}
              data-cursor-color-target="true"
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-3 text-xs font-semibold transition-colors duration-300 whitespace-nowrap shrink-0 ${
                isWireframe
                  ? 'border-dashed border-white/25 bg-transparent text-zinc-400'
                  : isMonochrome
                    ? 'border-white/20 bg-white/5 text-zinc-300'
                    : 'border-accent/45 bg-accent/10 text-white hover:border-accent hover:bg-accent/20'
              }`}
            >
              <Download
                className={`h-4 w-4 transition-colors duration-300 ${
                  isMonochrome ? 'text-zinc-400' : 'text-accent-light'
                }`}
                aria-hidden="true"
              />
              <TypedText text="Download CV (PDF)" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-5">
          <div>
            <div className="text-xs text-zinc-500">
              <TypedText text="Discipline" />
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-200">
              <TypedText text={disciplineSummary} />
            </p>
          </div>
          <div>
            <div className="text-xs text-zinc-500">
              <TypedText text="Availability" />
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-200">
              <TypedText text={availability} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DirectContactHeader: React.FC<{
  displayName: string;
  locationText: string;
}> = ({ displayName, locationText }) => {
  const { isMonochrome } = useCursorBuildPhase();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
      <div>
        <p
          data-cursor-color-target="true"
          className={`font-mono text-[11px] uppercase tracking-wider transition-colors duration-300 ${
            isMonochrome ? 'text-zinc-400' : 'text-accent-light'
          }`}
        >
          <TypedText text="Direct Contact Details" />
        </p>
        <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
          <TypedText text={`${displayName} — Reach Out Directly`} />
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span
          data-cursor-color-target="true"
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-colors duration-300 ${
            isMonochrome
              ? 'border-white/20 bg-white/5 text-zinc-300'
              : 'border-white/10 bg-[#121319] text-zinc-300'
          }`}
        >
          <MapPin
            className={`h-3.5 w-3.5 transition-colors duration-300 ${
              isMonochrome ? 'text-zinc-400' : 'text-accent-light'
            }`}
            aria-hidden="true"
          />
          <TypedText text={locationText} />
        </span>
      </div>
    </div>
  );
};

const ContactCardContent: React.FC<{
  card: ContactCardConfig;
  templateCard: ContactCardConfig;
  isClone: boolean;
  copiedField: 'email' | 'phone' | 'whatsapp' | null;
  onCopy: (field: 'email' | 'phone' | 'whatsapp', value: string) => void;
}> = ({ card, templateCard, isClone, copiedField, onCopy }) => {
  const { isWireframe, isMonochrome } = useCursorBuildPhase();
  const isEmerald = card.tone === 'emerald';
  const isCopied = copiedField === card.id;

  return (
    <div
      data-cursor-color-target="true"
      className={`flex h-full flex-col justify-between rounded-xl border p-4 transition-colors duration-300 ${
        isWireframe
          ? 'border-dashed border-white/20 bg-[#0D0D12]'
          : isMonochrome
            ? 'border-white/20 bg-[#111218]'
            : isEmerald
              ? 'border-emerald-500/25 bg-[#111218]'
              : 'border-white/10 bg-[#111218]'
      }`}
    >
      <div>
        <div
          className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
            isMonochrome
              ? 'text-zinc-400'
              : isEmerald
                ? 'text-emerald-300'
                : 'text-zinc-400'
          }`}
        >
          {card.id === 'email' && (
            <Mail
              className={`h-4 w-4 transition-colors duration-300 ${
                isMonochrome ? 'text-zinc-400' : 'text-accent-light'
              }`}
              aria-hidden="true"
            />
          )}
          {card.id === 'whatsapp' && (
            <MessageCircle
              className={`h-4 w-4 transition-colors duration-300 ${
                isMonochrome ? 'text-zinc-400' : 'text-emerald-400'
              }`}
              aria-hidden="true"
            />
          )}
          {card.id === 'phone' && (
            <Phone
              className={`h-4 w-4 transition-colors duration-300 ${
                isMonochrome ? 'text-zinc-400' : 'text-accent-light'
              }`}
              aria-hidden="true"
            />
          )}
          <TypedText
            text={card.label}
            cloneFrom={isClone ? templateCard.label : undefined}
          />
        </div>
        <a
          href={card.href}
          target={card.external ? '_blank' : undefined}
          rel={card.external ? 'noopener noreferrer' : undefined}
          className={`mt-2 block truncate text-sm font-medium text-white transition-colors ${
            card.id !== 'email' ? 'font-mono tabular-nums' : ''
          } ${isEmerald ? 'hover:text-emerald-300' : 'hover:text-accent-light'}`}
          title={card.value}
        >
          <TypedText
            text={card.value}
            cloneFrom={isClone ? templateCard.value : undefined}
          />
        </a>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <a
          href={card.href}
          target={card.external ? '_blank' : undefined}
          rel={card.external ? 'noopener noreferrer' : undefined}
          data-cursor-color-target="true"
          className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 whitespace-nowrap shrink-0 ${
            isWireframe
              ? 'border-dashed border-white/25 bg-transparent text-zinc-400'
              : isMonochrome
                ? 'border-white/20 bg-white/5 text-zinc-200'
                : isEmerald
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'border-white/15 text-zinc-200 hover:border-white/30 hover:text-white'
          }`}
        >
          <TypedText
            text={card.actionLabel}
            cloneFrom={isClone ? templateCard.actionLabel : undefined}
          />
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={() => onCopy(card.id, card.copyValue)}
          data-cursor-color-target="true"
          className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] transition-colors duration-300 whitespace-nowrap shrink-0 ${
            isWireframe
              ? 'border-dashed border-white/20 bg-transparent text-zinc-400'
              : 'border-white/10 bg-white/5 text-zinc-300 hover:text-white'
          }`}
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              <TypedText text="Copy" cloneFrom={isClone ? 'Copy' : undefined} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const SocialLinksBar: React.FC<{
  socialLinks: SocialLinkEntry[];
}> = ({ socialLinks }) => {
  const { isWireframe, isMonochrome } = useCursorBuildPhase();

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
        <TypedText text="Social Media & Profiles" />
      </p>
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
              data-cursor-color-target="true"
              className={`group inline-flex min-h-[40px] items-center gap-2.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors duration-300 ${
                isWireframe
                  ? 'border-dashed border-white/25 bg-transparent text-zinc-400'
                  : isMonochrome
                    ? 'border-white/20 bg-white/5 text-zinc-300'
                    : `border-white/10 bg-[#111218] text-zinc-200 ${item.hoverClass}`
              }`}
            >
              <SocialBrandLogo id={item.id} />
              <TypedText text={item.displayName} />
              <ArrowUpRight
                className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-current"
                aria-hidden="true"
              />
            </a>
          );
        })}
      </div>
    </div>
  );
};

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenInquiry }) => {
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | 'whatsapp' | null>(null);
  const portfolioContent = usePortfolioContent();
  const { profile, viewerControls } = portfolioContent;
  const email = profile.email;
  const telHref = formatTelHref(profile.phoneNumber);
  const whatsappHref = formatWhatsappHref(profile.whatsappNumber);
  const locationText = profile.location || 'Dhaka, Bangladesh';
  const names = profile.socialNames;

  const contactCards: ContactCardConfig[] = [
    {
      id: 'email',
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
      actionLabel: 'Send Mail',
      copyValue: email,
      tone: 'accent',
    },
    ...(whatsappHref
      ? [
          {
            id: 'whatsapp' as const,
            label: 'WhatsApp',
            value: profile.whatsappNumber,
            href: whatsappHref,
            actionLabel: 'Message',
            copyValue: profile.whatsappNumber,
            external: true,
            tone: 'emerald' as const,
          },
        ]
      : []),
    ...(telHref
      ? [
          {
            id: 'phone' as const,
            label: 'Contact Number',
            value: profile.phoneNumber,
            href: telHref,
            actionLabel: 'Call Now',
            copyValue: profile.phoneNumber,
            tone: 'accent' as const,
          },
        ]
      : []),
  ];

  const templateCard = contactCards[0];

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
          <ContactHeroContent
            disciplineSummary={profile.disciplineSummary}
            availability={profile.availability}
            showCvDownload={viewerControls.showCvDownloadOnViewer}
            onOpenInquiry={onOpenInquiry}
            onDownloadCv={() => {
              downloadPortfolioCv(portfolioContent);
              void trackCvDownload();
            }}
          />
        </DesignBlock>

        {/* Dedicated Bottom Owner Contact Details & Social Media Section */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#0D0D12] p-6 sm:p-8">
          <DesignBlock shape="panel" slotIndex={1} label="Contact Header" delay={80}>
            <DirectContactHeader
              displayName={profile.displayName}
              locationText={locationText}
            />
          </DesignBlock>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contactCards.map((card, idx) => (
              <DesignBlock
                key={card.id}
                shape="card"
                slotIndex={idx + 2}
                cloneGroup="contact-cards"
                isCloneItem={idx > 0}
                label={card.label}
              >
                <ContactCardContent
                  card={card}
                  templateCard={templateCard}
                  isClone={idx > 0}
                  copiedField={copiedField}
                  onCopy={(field, val) => void handleCopyField(field, val)}
                />
              </DesignBlock>
            ))}
          </div>

          {socialLinks.length > 0 && (
            <DesignBlock shape="panel" slotIndex={5} label="Social Profiles">
              <SocialLinksBar socialLinks={socialLinks} />
            </DesignBlock>
          )}
        </div>

        {/* Bottom Copyright Row */}
        <DesignBlock shape="row" slotIndex={6} label="Footer Bar">
          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
            <p>
              <TypedText
                text={`© ${new Date().getFullYear()} ${profile.backdropName}. All rights reserved.`}
              />
            </p>
            <p className="font-mono text-[11px] text-zinc-500">
              <TypedText text={locationText} />
            </p>
          </div>
        </DesignBlock>
      </div>
    </footer>
  );
};
