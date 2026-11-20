export type ProjectCategory =
  | 'All'
  | 'Websites'
  | 'Apps'
  | 'Games'
  | 'UI/UX Design';

export type PreviewTheme =
  | 'web-commerce'
  | 'app-workspace'
  | 'game-rift'
  | 'app-realtime'
  | 'game-drift'
  | 'ui-system';

export type SocialPlatformKey =
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'behance'
  | 'facebook'
  | 'whatsapp'
  | 'instagram';

export type SocialNamesConfig = Record<SocialPlatformKey, string>;

export const DEFAULT_SOCIAL_NAMES: SocialNamesConfig = {
  github: '',
  linkedin: '',
  twitter: '',
  behance: '',
  facebook: '',
  whatsapp: '',
  instagram: '',
};

export interface SiteProfile {
  greeting: string;
  displayName: string;
  backdropName: string;
  wordmark: string;
  role: string;
  bio: string;
  portraitUrl: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  location: string;
  githubHandle: string;
  githubUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  behanceUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  socialNames: SocialNamesConfig;
  availability: string;
  disciplineSummary: string;
  craftMetricValue: string;
  craftMetricSuffix: string;
  craftMetricLabel: string;
  craftSummary: string;
  quoteText: string;
  quoteAuthor: string;
  quoteRole: string;
  manifestoLead: string;
  manifestoAvailability: string;
  prototypeTurnaround: string;
}

export interface HeroMetricItem {
  value: string;
  label: string;
}

export interface ProjectItem {
  id: string;
  index: string;
  title: string;
  category: Exclude<ProjectCategory, 'All'>;
  year: string;
  platform: string;
  client: string;
  role: string;
  stack: string[];
  summary: string;
  architectureNotes: string;
  previewTheme: PreviewTheme;
  dimensions: string;
  coverImageUrl?: string;
  galleryUrls?: string[];
  coverMediaType?: 'image' | 'video';
  liveUrl?: string;
  repoUrl?: string;
  published?: boolean;
}

export interface MilestoneItem {
  id: string;
  title: string;
  context: string;
  project: string;
  year: string;
  outcome: string;
  published?: boolean;
}

export interface WireframeRealScene {
  id: string;
  label: string;
  specs: string;
  notes: string;
  theme: 'web-build' | 'app-ui' | 'game-engine';
}

export interface TechStackItem {
  name: string;
  role: string;
}

export interface ServiceItem {
  index: string;
  title: string;
  detail: string;
}

export interface ExperienceItem {
  id: string;
  period: string;
  role: string;
  org: string;
  description: string;
  published?: boolean;
}

export type CursorSpeed = 'slow' | 'normal' | 'fast';
export type CvSourceMode = 'auto' | 'custom';

export interface ViewerControlsConfig {
  showTopScrollBar: boolean;
  showBottomHud: boolean;
  showHudProgress: boolean;
  showHudCursors: boolean;
  showHudAutoScroll: boolean;
  showHudReplay: boolean;
  showHudSound: boolean;
  showMultiBackBar: boolean;
  enableCursorsByDefault: boolean;
  enableAutoScrollByDefault: boolean;
  enableSoundByDefault: boolean;
  cursorSpeed: CursorSpeed;
  accentColor: string;
  showCvDownloadOnViewer: boolean;
  showStarterDemoProjects: boolean;
}

export interface CvSettingsConfig {
  mode: CvSourceMode;
  customUrl: string;
  headline: string;
}

export const DEFAULT_ACCENT_COLOR = '#DC2626';

export const DEFAULT_VIEWER_CONTROLS: ViewerControlsConfig = {
  showTopScrollBar: true,
  showBottomHud: false,
  showHudProgress: false,
  showHudCursors: false,
  showHudAutoScroll: false,
  showHudReplay: false,
  showHudSound: false,
  showMultiBackBar: true,
  enableCursorsByDefault: true,
  enableAutoScrollByDefault: true,
  enableSoundByDefault: true,
  cursorSpeed: 'normal',
  accentColor: DEFAULT_ACCENT_COLOR,
  showCvDownloadOnViewer: false,
  showStarterDemoProjects: true,
};

export const DEFAULT_CV_SETTINGS: CvSettingsConfig = {
  mode: 'auto',
  customUrl: '',
  headline: 'Full-Stack Web, Mobile App & Interactive Game Engineer',
};

export interface PortfolioContentBundle {
  profile: SiteProfile;
  viewerControls: ViewerControlsConfig;
  cvSettings: CvSettingsConfig;
  heroMetrics: HeroMetricItem[];
  projects: ProjectItem[];
  milestones: MilestoneItem[];
  wireframeScenes: WireframeRealScene[];
  techStack: TechStackItem[];
  services: ServiceItem[];
  experience: ExperienceItem[];
  techPartners: string[];
}

const VALID_CATEGORIES: ReadonlyArray<Exclude<ProjectCategory, 'All'>> = [
  'Websites',
  'Apps',
  'Games',
  'UI/UX Design',
];

const VALID_THEMES: ReadonlyArray<PreviewTheme> = [
  'web-commerce',
  'app-workspace',
  'game-rift',
  'app-realtime',
  'game-drift',
  'ui-system',
];

const VALID_WIREFRAME_THEMES: ReadonlyArray<WireframeRealScene['theme']> = [
  'web-build',
  'app-ui',
  'game-engine',
];

export function clampText(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function clampExact(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

const SAFE_MEDIA_DATA_URL_RE =
  /^data:(image\/(png|jpeg|jpg|webp|gif)|video\/(mp4|webm|quicktime|ogg));base64,[A-Za-z0-9+/=]+$/i;

export function isValidEmailAddress(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 3 && trimmed.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function sanitizePhoneInput(value: unknown, maxLength = 24): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^0-9+\-\s()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function isValidPhoneIfPresent(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^[0-9+\-\s()]{3,28}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 18;
}

export function formatTelHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6) return '';
  return `tel:${hasPlus ? '+' : ''}${digits}`;
}

export function formatWhatsappHref(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return '';
  if (digits.length === 11 && digits.startsWith('01')) {
    digits = `88${digits}`;
  }
  return `https://wa.me/${digits}`;
}

export function isVideoMediaSource(
  url?: string,
  mediaType?: 'image' | 'video'
): boolean {
  if (mediaType === 'video') return true;
  if (mediaType === 'image') return false;
  if (!url) return false;
  const normalized = url.trim().toLowerCase();
  if (normalized.startsWith('data:video/')) return true;
  const withoutHashOrQuery = normalized.split(/[?#]/)[0] ?? '';
  return /\.(mp4|webm|mov|m4v|ogv|ogg)$/.test(withoutHashOrQuery);
}

const SAFE_PDF_DATA_URL_RE = /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i;
const VALID_HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function sanitizeHexColor(value: unknown, fallback = DEFAULT_ACCENT_COLOR): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (VALID_HEX_COLOR_RE.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return fallback;
}

export function sanitizeCvSourceUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) {
    if (trimmed.length <= 540_000 && SAFE_PDF_DATA_URL_RE.test(trimmed)) {
      return trimmed;
    }
    return '';
  }
  return sanitizePublicUrl(trimmed, '', false);
}

export function normalizeUserUrlInput(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  if (/^assets\//i.test(trimmed)) {
    return `/${trimmed}`;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  if (!trimmed.includes('://') && /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function sanitizePublicUrl(
  value: unknown,
  fallback = '',
  allowMediaDataUrl = false
): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = normalizeUserUrlInput(value);
  if (!trimmed) return fallback;

  if (allowMediaDataUrl && trimmed.startsWith('data:')) {
    if (trimmed.length <= 780_000 && SAFE_MEDIA_DATA_URL_RE.test(trimmed)) {
      return trimmed;
    }
    return fallback;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function sanitizeId(value: unknown, prefix: string, idx: number): string {
  if (typeof value === 'string') {
    const slug = value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
    if (slug) return slug;
  }
  return `${prefix}-${idx + 1}`;
}

export function normalizePortfolioContent(
  input: Partial<PortfolioContentBundle> | null | undefined,
  defaults: PortfolioContentBundle
): PortfolioContentBundle {
  const raw = input ?? {};
  const rawProfile = raw.profile ?? ({} as Partial<SiteProfile>);
  const dp = defaults.profile;

  const hasPortraitProp = Object.prototype.hasOwnProperty.call(rawProfile, 'portraitUrl');
  const portraitFallback = hasPortraitProp ? '' : dp.portraitUrl;
  const candidatePortrait = sanitizePublicUrl(rawProfile.portraitUrl, portraitFallback, true);
  const safePortraitUrl =
    candidatePortrait.startsWith('data:') &&
    (!candidatePortrait.startsWith('data:image/') || candidatePortrait.length > 320_000)
      ? dp.portraitUrl
      : candidatePortrait;

  const rawSocialNames = (rawProfile.socialNames ?? {}) as Partial<SocialNamesConfig>;
  const dsn = dp.socialNames ?? DEFAULT_SOCIAL_NAMES;
  const socialNames: SocialNamesConfig = {
    github: clampText(rawSocialNames.github, 40, dsn.github),
    linkedin: clampText(rawSocialNames.linkedin, 40, dsn.linkedin),
    twitter: clampText(rawSocialNames.twitter, 40, dsn.twitter),
    behance: clampText(rawSocialNames.behance, 40, dsn.behance),
    facebook: clampText(rawSocialNames.facebook, 40, dsn.facebook),
    whatsapp: clampText(rawSocialNames.whatsapp, 40, dsn.whatsapp),
    instagram: clampText(rawSocialNames.instagram, 40, dsn.instagram),
  };

  const profile: SiteProfile = {
    greeting: clampText(rawProfile.greeting, 32, dp.greeting),
    displayName: clampExact(rawProfile.displayName, 18, dp.displayName),
    backdropName: clampExact(rawProfile.backdropName, 10, dp.backdropName).toUpperCase(),
    wordmark: clampExact(rawProfile.wordmark, 16, dp.wordmark),
    role: clampText(rawProfile.role, 64, dp.role),
    bio: clampText(rawProfile.bio, 260, dp.bio),
    portraitUrl: safePortraitUrl,
    email: clampExact(rawProfile.email, 80, dp.email),
    phoneNumber: sanitizePhoneInput(rawProfile.phoneNumber ?? dp.phoneNumber, 24),
    whatsappNumber: sanitizePhoneInput(rawProfile.whatsappNumber ?? dp.whatsappNumber, 24),
    location: clampText(rawProfile.location, 60, dp.location),
    githubHandle: clampExact(rawProfile.githubHandle, 40, dp.githubHandle),
    githubUrl: sanitizePublicUrl(rawProfile.githubUrl, dp.githubUrl),
    twitterUrl: sanitizePublicUrl(rawProfile.twitterUrl, dp.twitterUrl),
    linkedinUrl: sanitizePublicUrl(rawProfile.linkedinUrl, dp.linkedinUrl),
    behanceUrl: sanitizePublicUrl(rawProfile.behanceUrl, dp.behanceUrl),
    facebookUrl: sanitizePublicUrl(rawProfile.facebookUrl, dp.facebookUrl),
    instagramUrl: sanitizePublicUrl(rawProfile.instagramUrl, dp.instagramUrl),
    socialNames,
    availability: clampText(rawProfile.availability, 40, dp.availability),
    disciplineSummary: clampText(rawProfile.disciplineSummary, 40, dp.disciplineSummary),
    craftMetricValue: clampExact(rawProfile.craftMetricValue, 8, dp.craftMetricValue),
    craftMetricSuffix: clampExact(rawProfile.craftMetricSuffix, 4, dp.craftMetricSuffix),
    craftMetricLabel: clampText(rawProfile.craftMetricLabel, 48, dp.craftMetricLabel),
    craftSummary: clampText(rawProfile.craftSummary, 220, dp.craftSummary),
    quoteText: clampText(rawProfile.quoteText, 180, dp.quoteText),
    quoteAuthor: clampText(rawProfile.quoteAuthor, 32, dp.quoteAuthor),
    quoteRole: clampText(rawProfile.quoteRole, 60, dp.quoteRole),
    manifestoLead: clampText(rawProfile.manifestoLead, 200, dp.manifestoLead),
    manifestoAvailability: clampText(rawProfile.manifestoAvailability, 160, dp.manifestoAvailability),
    prototypeTurnaround: clampExact(rawProfile.prototypeTurnaround, 24, dp.prototypeTurnaround),
  };

  const rawMetrics = Array.isArray(raw.heroMetrics) ? raw.heroMetrics : defaults.heroMetrics;
  const heroMetrics = rawMetrics
    .slice(0, 4)
    .map((m, idx) => {
      const fb = defaults.heroMetrics[idx] ?? { value: '10+', label: 'Delivered Builds' };
      return {
        value: clampExact(m?.value, 10, fb.value),
        label: clampText(m?.label, 52, fb.label),
      };
    });
  if (heroMetrics.length === 0) {
    heroMetrics.push(...defaults.heroMetrics);
  }

  const rawProjects = Array.isArray(raw.projects) ? raw.projects : defaults.projects;
  const projects: ProjectItem[] = rawProjects
    .filter((p) => p && p.published !== false)
    .slice(0, 200)
    .map((p, idx) => {
      const category = VALID_CATEGORIES.includes(p.category)
        ? p.category
        : 'Websites';
      const previewTheme = VALID_THEMES.includes(p.previewTheme)
        ? p.previewTheme
        : 'web-commerce';
      const stack = Array.isArray(p.stack)
        ? p.stack
            .map((s) => clampExact(s, 24, ''))
            .filter(Boolean)
            .slice(0, 6)
        : [];
      const rawIndex = clampExact(p.index, 4, '');
      const formattedIndex = rawIndex || String(idx + 1).padStart(2, '0');

      const coverUrl = sanitizePublicUrl(p.coverImageUrl, '', true) || undefined;
      const rawGallery = Array.isArray(p.galleryUrls) ? p.galleryUrls : [];
      const galleryUrls = rawGallery
        .map((url) => sanitizePublicUrl(url, '', true))
        .filter((url) => Boolean(url) && !isVideoMediaSource(url) && url.length <= 165_000)
        .slice(0, 5);
      const effectiveCover = coverUrl || galleryUrls[0] || undefined;
      const mediaType: 'image' | 'video' | undefined = effectiveCover
        ? p.coverMediaType === 'video' || p.coverMediaType === 'image'
          ? p.coverMediaType
          : isVideoMediaSource(effectiveCover)
            ? 'video'
            : 'image'
        : undefined;

      return {
        id: sanitizeId(p.id, 'proj', idx),
        index: formattedIndex,
        title: clampText(p.title, 56, 'Untitled Project'),
        category,
        year: clampExact(p.year, 12, String(new Date().getFullYear())),
        platform: clampText(p.platform, 36, 'Web Build'),
        client: clampText(p.client, 36, 'Independent Build'),
        role: clampText(p.role, 64, 'Creator & Engineer'),
        stack: stack.length > 0 ? stack : ['TypeScript', 'React'],
        summary: clampText(p.summary, 280, 'Interactive digital build crafted from wireframe to production.'),
        architectureNotes: clampText(
          p.architectureNotes,
          300,
          'Structured component architecture with responsive performance.'
        ),
        previewTheme,
        dimensions: clampExact(p.dimensions, 20, '1440 × 900'),
        coverImageUrl: effectiveCover,
        galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
        coverMediaType: mediaType,
        liveUrl: sanitizePublicUrl(p.liveUrl, '') || undefined,
        repoUrl: sanitizePublicUrl(p.repoUrl, '') || undefined,
        published: true,
      };
    });

  const rawMilestones = Array.isArray(raw.milestones) ? raw.milestones : defaults.milestones;
  const milestones: MilestoneItem[] = rawMilestones
    .filter((m) => m && m.published !== false)
    .slice(0, 100)
    .map((m, idx) => ({
      id: sanitizeId(m.id, 'ms', idx),
      title: clampText(m.title, 88, 'Studio Milestone'),
      context: clampText(m.context, 52, 'Engineering & Craft'),
      project: clampText(m.project, 44, 'Selected Build'),
      year: clampExact(m.year, 10, String(new Date().getFullYear())),
      outcome: clampText(m.outcome, 220, 'Delivered with high performance and visual polish.'),
      published: true,
    }));

  const rawScenes = Array.isArray(raw.wireframeScenes)
    ? raw.wireframeScenes
    : defaults.wireframeScenes;
  const wireframeScenes: WireframeRealScene[] = rawScenes.slice(0, 6).map((s, idx) => ({
    id: sanitizeId(s?.id, 'scene', idx),
    label: clampText(s?.label, 64, `0${idx + 1} · Build Stage`),
    specs: clampText(s?.specs, 72, 'Wireframe · Architecture · Shipped'),
    notes: clampText(s?.notes, 200, 'From wireframe structure to interactive live build.'),
    theme: VALID_WIREFRAME_THEMES.includes(s?.theme) ? s.theme : 'web-build',
  }));
  if (wireframeScenes.length === 0) {
    wireframeScenes.push(...defaults.wireframeScenes);
  }

  const rawTechStack = Array.isArray(raw.techStack) ? raw.techStack : defaults.techStack;
  const techStack: TechStackItem[] = rawTechStack.slice(0, 8).map((t) => ({
    name: clampText(t?.name, 40, 'TypeScript'),
    role: clampText(t?.role, 56, 'Core Engineering'),
  }));
  if (techStack.length === 0) {
    techStack.push(...defaults.techStack);
  }

  const rawServices = Array.isArray(raw.services) ? raw.services : defaults.services;
  const services: ServiceItem[] = rawServices.slice(0, 6).map((s, idx) => ({
    index: clampExact(s?.index, 4, String(idx + 1).padStart(2, '0')),
    title: clampText(s?.title, 48, 'Custom Engineering'),
    detail: clampText(s?.detail, 140, 'Full lifecycle design and build.'),
  }));
  if (services.length === 0) {
    services.push(...defaults.services);
  }

  const rawExperience = Array.isArray(raw.experience) ? raw.experience : defaults.experience;
  const experience: ExperienceItem[] = rawExperience
    .filter((e) => e && e.published !== false)
    .slice(0, 100)
    .map((e, idx) => ({
      id: sanitizeId(e.id, 'exp', idx),
      period: clampExact(e.period, 24, '2024 — Present'),
      role: clampText(e.role, 64, 'Developer & Designer'),
      org: clampText(e.org, 64, 'Independent Studio'),
      description: clampText(e.description, 240, 'Designing and shipping interactive web, app, and game experiences.'),
      published: true,
    }));

  const rawPartners = Array.isArray(raw.techPartners) ? raw.techPartners : defaults.techPartners;
  const techPartners = rawPartners
    .map((p) => clampExact(p, 24, '').toUpperCase())
    .filter(Boolean)
    .slice(0, 8);

  const rawVc = (raw.viewerControls ?? {}) as Partial<ViewerControlsConfig>;
  const dv = defaults.viewerControls ?? DEFAULT_VIEWER_CONTROLS;
  const pickBool = (val: unknown, fb: boolean): boolean =>
    typeof val === 'boolean' ? val : fb;
  const validSpeed: CursorSpeed =
    rawVc.cursorSpeed === 'slow' || rawVc.cursorSpeed === 'normal' || rawVc.cursorSpeed === 'fast'
      ? rawVc.cursorSpeed
      : dv.cursorSpeed ?? 'normal';

  const viewerControls: ViewerControlsConfig = {
    showTopScrollBar: pickBool(rawVc.showTopScrollBar, dv.showTopScrollBar),
    showBottomHud: pickBool(rawVc.showBottomHud, dv.showBottomHud),
    showHudProgress: pickBool(rawVc.showHudProgress, dv.showHudProgress),
    showHudCursors: pickBool(rawVc.showHudCursors, dv.showHudCursors),
    showHudAutoScroll: pickBool(rawVc.showHudAutoScroll, dv.showHudAutoScroll),
    showHudReplay: pickBool(rawVc.showHudReplay, dv.showHudReplay),
    showHudSound: pickBool(rawVc.showHudSound, dv.showHudSound),
    showMultiBackBar: pickBool(rawVc.showMultiBackBar, dv.showMultiBackBar),
    enableCursorsByDefault: pickBool(rawVc.enableCursorsByDefault, dv.enableCursorsByDefault),
    enableAutoScrollByDefault: pickBool(
      rawVc.enableAutoScrollByDefault,
      dv.enableAutoScrollByDefault
    ),
    enableSoundByDefault: pickBool(rawVc.enableSoundByDefault, dv.enableSoundByDefault),
    cursorSpeed: validSpeed,
    accentColor: sanitizeHexColor(rawVc.accentColor, dv.accentColor ?? DEFAULT_ACCENT_COLOR),
    showCvDownloadOnViewer: pickBool(
      rawVc.showCvDownloadOnViewer,
      dv.showCvDownloadOnViewer ?? false
    ),
    showStarterDemoProjects: pickBool(
      rawVc.showStarterDemoProjects,
      dv.showStarterDemoProjects ?? true
    ),
  };

  const rawCv = (raw.cvSettings ?? {}) as Partial<CvSettingsConfig>;
  const dCv = defaults.cvSettings ?? DEFAULT_CV_SETTINGS;
  const cvSettings: CvSettingsConfig = {
    mode: rawCv.mode === 'custom' || rawCv.mode === 'auto' ? rawCv.mode : dCv.mode,
    customUrl: sanitizeCvSourceUrl(rawCv.customUrl),
    headline: clampText(rawCv.headline, 96, dCv.headline),
  };

  return {
    profile,
    viewerControls,
    cvSettings,
    heroMetrics,
    projects,
    milestones,
    wireframeScenes,
    techStack,
    services,
    experience,
    techPartners: techPartners.length > 0 ? techPartners : defaults.techPartners,
  };
}
