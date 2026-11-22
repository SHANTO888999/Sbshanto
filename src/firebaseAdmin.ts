import {
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { ADMIN_INITIAL_BUNDLE } from './data/adminDefaults';
import type {
  CvSettingsConfig,
  ExperienceItem,
  MilestoneItem,
  PortfolioContentBundle,
  ProjectItem,
  SiteProfile,
  ViewerControlsConfig,
} from './data/contentSchema';
import {
  clampExact,
  clampText,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CV_SETTINGS,
  isValidEmailAddress,
  isVideoMediaSource,
  normalizePortfolioContent,
  normalizeUserUrlInput,
  sanitizeCvSourceUrl,
  sanitizeHexColor,
  sanitizePhoneInput,
  sanitizePublicUrl,
} from './data/contentSchema';
import {
  app,
  db,
  OperationType,
  sanitizeFirestoreId,
  type FirestoreErrorInfo,
} from './firebaseClientBase';

export const OWNER_ADMIN_EMAIL = 'sbgang01recovery@gmail.com';
export const OWNER_ADMIN_UID = '7uGlVyZQVLSofZlGXTVceJnfCg23';

// Strictly enforce browserSessionPersistence so closing browser tab/app locks Admin
export const auth: Auth = (() => {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: browserSessionPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    const existing = getAuth(app);
    void setPersistence(existing, browserSessionPersistence).catch(() => {});
    return existing;
  }
})();

function handleAdminFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type InquiryStatus = 'new' | 'read' | 'replied' | 'archived';

export interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  scope: string;
  brief: string;
  status: InquiryStatus;
  createdAtMs: number;
}

export interface AdminProjectRecord extends ProjectItem {
  sortOrder: number;
  published: boolean;
}

export interface AdminMilestoneRecord extends MilestoneItem {
  sortOrder: number;
  published: boolean;
}

export interface AdminExperienceRecord extends ExperienceItem {
  sortOrder: number;
  published: boolean;
}

export interface DailyAnalyticsRecord {
  date: string;
  month: string;
  visitors: number;
  pageViews: number;
  projectClicks: number;
  hireOpens: number;
  hireSubmits: number;
  cvDownloads: number;
}

export interface ProjectAnalyticsRecord {
  projectId: string;
  title: string;
  category: string;
  clicks: number;
}

export interface PresenceSessionRecord {
  sessionId: string;
  countryCode: string;
  countryName: string;
  path: string;
  lastSeenAtMs: number;
}

export interface DemographicRecord {
  bucketId: string;
  bucketType: 'country' | 'age';
  code: string;
  label: string;
  count: number;
}

export interface AdminDashboardSnapshot {
  hasRemoteSettings: boolean;
  settingsBundle: PortfolioContentBundle;
  projects: AdminProjectRecord[];
  milestones: AdminMilestoneRecord[];
  experience: AdminExperienceRecord[];
  inquiries: InquiryRecord[];
  dailyAnalytics: DailyAnalyticsRecord[];
  projectAnalytics: ProjectAnalyticsRecord[];
  presenceSessions: PresenceSessionRecord[];
  demographics: DemographicRecord[];
  analyticsError?: string | null;
}

function toMillis(val: unknown): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toMillis' in val) {
    try {
      return (val as Timestamp).toMillis();
    } catch {
      return Date.now();
    }
  }
  return Date.now();
}

function preserveValidFirestoreId(
  rawId: string | undefined,
  fallbackInput: string,
  fallbackPrefix: string
): string {
  const trimmed = typeof rawId === 'string' ? rawId.trim() : '';
  if (trimmed && /^[a-zA-Z0-9_-]{1,128}$/.test(trimmed)) {
    return trimmed;
  }
  return sanitizeFirestoreId(fallbackInput, fallbackPrefix);
}

async function ensureFreshVerifiedToken(): Promise<void> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Your admin session expired. Please sign in again before saving.');
  }
  try {
    if (!current.emailVerified) {
      await current.reload();
    }
    let tokenResult = await current.getIdTokenResult();
    if (!tokenResult.claims.email_verified) {
      await current.getIdToken(true);
      tokenResult = await current.getIdTokenResult();
    }
    if (!tokenResult.claims.email_verified) {
      throw new Error(
        `Email verification is not active in your current auth token (${current.email ?? current.uid}). Verify your email, sign out, and sign back in.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Email verification is not active')) {
      throw err;
    }
    // Non-fatal network refresh error; proceed with existing token
  }
}

export function subscribeAdminAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInAdminWithEmail(email: string, password: string): Promise<User> {
  await setPersistence(auth, browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    await cred.user.reload();
    await cred.user.getIdToken(true);
  } catch {
    // Proceed cleanly
  }
  return cred.user;
}

export async function sendAdminVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function reloadCurrentUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

export async function verifyAdminAccess(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  try {
    const tokenResult = await user.getIdTokenResult();
    if (!tokenResult.claims.email_verified) {
      await user.getIdToken(true);
    }
  } catch {
    // Proceed cleanly
  }
  if (
    user.uid === OWNER_ADMIN_UID ||
    user.email?.toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase()
  ) {
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

export async function fetchAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  await ensureFreshVerifiedToken();

  let hasRemoteSettings = false;
  const partial: Partial<PortfolioContentBundle> = {};

  const tomorrowCutoff = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
      t.getDate()
    ).padStart(2, '0')}`;
  })();

  let projects: AdminProjectRecord[] = [];
  let milestones: AdminMilestoneRecord[] = [];
  let experience: AdminExperienceRecord[] = [];
  let inquiries: InquiryRecord[] = [];
  let dailyAnalytics: DailyAnalyticsRecord[] = [];
  let projectAnalytics: ProjectAnalyticsRecord[] = [];
  let presenceSessions: PresenceSessionRecord[] = [];
  let demographics: DemographicRecord[] = [];
  let analyticsError: string | null = null;

  const loadSettings = async () => {
    const settingsPath = 'site_settings/main';
    try {
      const settingsSnap = await getDoc(doc(db, 'site_settings', 'main'));
      if (settingsSnap.exists()) {
        hasRemoteSettings = true;
        const data = settingsSnap.data();
        partial.profile = data as unknown as SiteProfile;
        if (Array.isArray(data.heroMetrics)) partial.heroMetrics = data.heroMetrics;
        if (Array.isArray(data.wireframeScenes)) partial.wireframeScenes = data.wireframeScenes;
        if (Array.isArray(data.techStack)) partial.techStack = data.techStack;
        if (Array.isArray(data.services)) partial.services = data.services;
        if (Array.isArray(data.techPartners)) partial.techPartners = data.techPartners;
        if (data.viewerControls && typeof data.viewerControls === 'object') {
          partial.viewerControls = data.viewerControls as ViewerControlsConfig;
        }
        if (data.cvSettings && typeof data.cvSettings === 'object') {
          partial.cvSettings = data.cvSettings as CvSettingsConfig;
        }
      }
    } catch (error) {
      handleAdminFirestoreError(error, OperationType.GET, settingsPath);
    }
  };

  const loadProjects = async () => {
    try {
      const snap = await getDocs(collection(db, 'projects'));
      const docsData: Array<Record<string, unknown> & { id: string }> = snap.docs.map((d) => ({
        ...(d.data() as Record<string, unknown>),
        id: d.id,
      }));
      projects = docsData
        .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
        .map((d, idx) => ({
          id: d.id,
          index: String(d.index ?? String(idx + 1).padStart(2, '0')),
          title: String(d.title ?? 'Untitled Project'),
          category: (d.category as ProjectItem['category']) || 'Websites',
          year: String(d.year ?? '2026'),
          platform: String(d.platform ?? 'Web Build'),
          client: String(d.client ?? 'Independent Build'),
          role: String(d.role ?? 'Creator & Engineer'),
          stack: Array.isArray(d.stack) ? (d.stack as string[]) : ['React', 'TypeScript'],
          summary: String(d.summary ?? ''),
          architectureNotes: String(d.architectureNotes ?? ''),
          previewTheme: (d.previewTheme as ProjectItem['previewTheme']) || 'web-commerce',
          dimensions: String(d.dimensions ?? '1440 × 900'),
          coverImageUrl: sanitizePublicUrl(d.coverImageUrl, '', true) || undefined,
          galleryUrls: Array.isArray(d.galleryUrls)
            ? d.galleryUrls
                .map((u) => sanitizePublicUrl(u, '', true))
                .filter(Boolean)
                .slice(0, 5)
            : undefined,
          coverMediaType:
            d.coverMediaType === 'video' || d.coverMediaType === 'image'
              ? d.coverMediaType
              : undefined,
          liveUrl: sanitizePublicUrl(d.liveUrl, '') || undefined,
          repoUrl: sanitizePublicUrl(d.repoUrl, '') || undefined,
          published: d.published !== false,
          sortOrder: Number.isFinite(Number(d.sortOrder)) ? Math.trunc(Number(d.sortOrder)) : idx,
        }));
    } catch (error) {
      handleAdminFirestoreError(error, OperationType.LIST, 'projects');
    }
  };

  const loadMilestones = async () => {
    try {
      const snap = await getDocs(collection(db, 'milestones'));
      const docsData: Array<Record<string, unknown> & { id: string }> = snap.docs.map((d) => ({
        ...(d.data() as Record<string, unknown>),
        id: d.id,
      }));
      milestones = docsData
        .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
        .map((d, idx) => ({
          id: d.id,
          title: String(d.title ?? ''),
          context: String(d.context ?? ''),
          project: String(d.project ?? ''),
          year: String(d.year ?? '2026'),
          outcome: String(d.outcome ?? ''),
          published: d.published !== false,
          sortOrder: Number.isFinite(Number(d.sortOrder)) ? Math.trunc(Number(d.sortOrder)) : idx,
        }));
    } catch (error) {
      handleAdminFirestoreError(error, OperationType.LIST, 'milestones');
    }
  };

  const loadExperience = async () => {
    try {
      const snap = await getDocs(collection(db, 'experience'));
      const docsData: Array<Record<string, unknown> & { id: string }> = snap.docs.map((d) => ({
        ...(d.data() as Record<string, unknown>),
        id: d.id,
      }));
      experience = docsData
        .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
        .map((d, idx) => ({
          id: d.id,
          period: String(d.period ?? ''),
          role: String(d.role ?? ''),
          org: String(d.org ?? ''),
          description: String(d.description ?? ''),
          published: d.published !== false,
          sortOrder: Number.isFinite(Number(d.sortOrder)) ? Math.trunc(Number(d.sortOrder)) : idx,
        }));
    } catch (error) {
      handleAdminFirestoreError(error, OperationType.LIST, 'experience');
    }
  };

  const loadInquiries = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')));
      const docsData: Array<Record<string, unknown> & { id: string }> = snap.docs.map((d) => ({
        ...(d.data() as Record<string, unknown>),
        id: d.id,
      }));
      inquiries = docsData.map((d) => ({
        id: d.id,
        name: String(d.name ?? 'Visitor'),
        email: String(d.email ?? ''),
        scope: String(d.scope ?? 'Project Inquiry'),
        brief: String(d.brief ?? ''),
        status: (['new', 'read', 'replied', 'archived'].includes(String(d.status))
          ? String(d.status)
          : 'new') as InquiryStatus,
        createdAtMs: toMillis(d.createdAt),
      }));
    } catch (error) {
      handleAdminFirestoreError(error, OperationType.LIST, 'inquiries');
    }
  };

  const loadDailyAnalytics = async () => {
    try {
      const snap = await getDocs(collection(db, 'analytics_daily'));
      dailyAnalytics = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const dateStr = String(data.date ?? d.id);
          if (d.id === '2099-01-01') {
            void deleteDoc(doc(db, 'analytics_daily', d.id)).catch(() => {});
            return null;
          }
          if (dateStr > tomorrowCutoff) return null;
          return {
            date: dateStr,
            month: String(data.month ?? dateStr.slice(0, 7)),
            visitors: Number(data.visitors ?? 0) || 0,
            pageViews: Number(data.pageViews ?? 0) || 0,
            projectClicks: Number(data.projectClicks ?? 0) || 0,
            hireOpens: Number(data.hireOpens ?? 0) || 0,
            hireSubmits: Number(data.hireSubmits ?? 0) || 0,
            cvDownloads: Number(data.cvDownloads ?? 0) || 0,
          };
        })
        .filter((r): r is DailyAnalyticsRecord => r !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      analyticsError = err instanceof Error ? err.message : String(err);
    }
  };

  const loadProjectAnalytics = async () => {
    try {
      const snap = await getDocs(collection(db, 'analytics_projects'));
      projectAnalytics = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            projectId: String(data.projectId ?? d.id),
            title: String(data.title ?? d.id),
            category: String(data.category ?? 'Websites'),
            clicks: Number(data.clicks ?? 0) || 0,
          };
        })
        .sort((a, b) => b.clicks - a.clicks);
    } catch (err) {
      if (!analyticsError) {
        analyticsError = err instanceof Error ? err.message : String(err);
      }
    }
  };

  const loadPresence = async () => {
    try {
      const snap = await getDocs(collection(db, 'analytics_presence'));
      const cutoffPrune = Date.now() - 6 * 60 * 60 * 1000;
      presenceSessions = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const lastSeenAtMs = toMillis(data.lastSeenAt);
          if (lastSeenAtMs < cutoffPrune) {
            void deleteDoc(doc(db, 'analytics_presence', d.id)).catch(() => {});
            return null;
          }
          return {
            sessionId: String(data.sessionId ?? d.id),
            countryCode: String(data.countryCode ?? 'INTL').toUpperCase(),
            countryName: String(data.countryName ?? 'International'),
            path: String(data.path ?? '/'),
            lastSeenAtMs,
          };
        })
        .filter((r): r is PresenceSessionRecord => r !== null);
    } catch {
      // Non-fatal
    }
  };

  const loadDemographics = async () => {
    try {
      const snap = await getDocs(collection(db, 'analytics_demographics'));
      demographics = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            bucketId: d.id,
            bucketType: (data.bucketType === 'age' ? 'age' : 'country') as 'country' | 'age',
            code: String(data.code ?? d.id),
            label: String(data.label ?? d.id),
            count: Number(data.count ?? 0) || 0,
          };
        })
        .sort((a, b) => b.count - a.count);
    } catch {
      // Non-fatal
    }
  };

  await Promise.all([
    loadSettings(),
    loadProjects(),
    loadMilestones(),
    loadExperience(),
    loadInquiries(),
    loadDailyAnalytics(),
    loadProjectAnalytics(),
    loadPresence(),
    loadDemographics(),
  ]);

  const settingsBundle = normalizePortfolioContent(partial, ADMIN_INITIAL_BUNDLE);

  return {
    hasRemoteSettings,
    settingsBundle,
    projects,
    milestones,
    experience,
    inquiries,
    dailyAnalytics,
    projectAnalytics,
    presenceSessions,
    demographics,
    analyticsError,
  };
}

export function subscribeAdminAnalytics(
  onDailyUpdate: (rows: DailyAnalyticsRecord[]) => void,
  onProjectUpdate: (rows: ProjectAnalyticsRecord[]) => void,
  onError?: (message: string) => void,
  extra?: {
    onPresenceUpdate?: (rows: PresenceSessionRecord[]) => void;
    onDemographicsUpdate?: (rows: DemographicRecord[]) => void;
    onInquiriesUpdate?: (rows: InquiryRecord[]) => void;
  }
): () => void {
  const tomorrowCutoff = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
      t.getDate()
    ).padStart(2, '0')}`;
  })();

  const unsubDaily = onSnapshot(
    collection(db, 'analytics_daily'),
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const dateStr = String(data.date ?? d.id);
          if (d.id === '2099-01-01') {
            void deleteDoc(doc(db, 'analytics_daily', d.id)).catch(() => {});
            return null;
          }
          if (dateStr > tomorrowCutoff) return null;
          return {
            date: dateStr,
            month: String(data.month ?? dateStr.slice(0, 7)),
            visitors: Number(data.visitors ?? 0) || 0,
            pageViews: Number(data.pageViews ?? 0) || 0,
            projectClicks: Number(data.projectClicks ?? 0) || 0,
            hireOpens: Number(data.hireOpens ?? 0) || 0,
            hireSubmits: Number(data.hireSubmits ?? 0) || 0,
            cvDownloads: Number(data.cvDownloads ?? 0) || 0,
          };
        })
        .filter((r): r is DailyAnalyticsRecord => r !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
      onDailyUpdate(rows);
    },
    (err) => {
      if (onError) onError(err instanceof Error ? err.message : String(err));
    }
  );

  const unsubProj = onSnapshot(
    collection(db, 'analytics_projects'),
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            projectId: String(data.projectId ?? d.id),
            title: String(data.title ?? d.id),
            category: String(data.category ?? 'Websites'),
            clicks: Number(data.clicks ?? 0) || 0,
          };
        })
        .sort((a, b) => b.clicks - a.clicks);
      onProjectUpdate(rows);
    },
    (err) => {
      if (onError) onError(err instanceof Error ? err.message : String(err));
    }
  );

  const unsubPresence = extra?.onPresenceUpdate
    ? onSnapshot(
        collection(db, 'analytics_presence'),
        (snap) => {
          const cutoffPrune = Date.now() - 6 * 60 * 60 * 1000;
          const rows = snap.docs
            .map((d) => {
              const data = d.data() as Record<string, unknown>;
              const lastSeenAtMs = toMillis(data.lastSeenAt);
              if (lastSeenAtMs < cutoffPrune) {
                void deleteDoc(doc(db, 'analytics_presence', d.id)).catch(() => {});
                return null;
              }
              return {
                sessionId: String(data.sessionId ?? d.id),
                countryCode: String(data.countryCode ?? 'INTL').toUpperCase(),
                countryName: String(data.countryName ?? 'International'),
                path: String(data.path ?? '/'),
                lastSeenAtMs,
              };
            })
            .filter((r): r is PresenceSessionRecord => r !== null);
          extra.onPresenceUpdate?.(rows);
        },
        () => {}
      )
    : () => {};

  const unsubDemo = extra?.onDemographicsUpdate
    ? onSnapshot(
        collection(db, 'analytics_demographics'),
        (snap) => {
          const rows = snap.docs
            .map((d) => {
              const data = d.data() as Record<string, unknown>;
              return {
                bucketId: d.id,
                bucketType: (data.bucketType === 'age' ? 'age' : 'country') as 'country' | 'age',
                code: String(data.code ?? d.id),
                label: String(data.label ?? d.id),
                count: Number(data.count ?? 0) || 0,
              };
            })
            .sort((a, b) => b.count - a.count);
          extra.onDemographicsUpdate?.(rows);
        },
        () => {}
      )
    : () => {};

  const unsubInquiries = extra?.onInquiriesUpdate
    ? onSnapshot(
        query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')),
        (snap) => {
          const rows = snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              name: String(data.name ?? 'Visitor'),
              email: String(data.email ?? ''),
              scope: String(data.scope ?? 'Project Inquiry'),
              brief: String(data.brief ?? ''),
              status: (['new', 'read', 'replied', 'archived'].includes(String(data.status))
                ? String(data.status)
                : 'new') as InquiryStatus,
              createdAtMs: toMillis(data.createdAt),
            };
          });
          extra.onInquiriesUpdate?.(rows);
        },
        () => {}
      )
    : () => {};

  return () => {
    unsubDaily();
    unsubProj();
    unsubPresence();
    unsubDemo();
    unsubInquiries();
  };
}

function buildSettingsPayload(bundle: PortfolioContentBundle) {
  const dp = ADMIN_INITIAL_BUNDLE.profile;
  const safe = normalizePortfolioContent(bundle, ADMIN_INITIAL_BUNDLE);
  const p = safe.profile;

  const portraitCandidate = sanitizePublicUrl(p.portraitUrl, '', true);
  const portraitPayload =
    portraitCandidate.startsWith('data:image/') && portraitCandidate.length <= 320_000
      ? portraitCandidate
      : sanitizePublicUrl(p.portraitUrl, '', false).slice(0, 500);

  const normalizedPhone = sanitizePhoneInput(p.phoneNumber ?? '', 24);
  const normalizedWhatsapp = sanitizePhoneInput(p.whatsappNumber ?? '', 24);

  return {
    greeting: clampText(p.greeting, 40, dp.greeting),
    displayName: clampExact(p.displayName, 24, dp.displayName),
    backdropName: clampExact(p.backdropName, 14, dp.backdropName),
    wordmark: clampExact(p.wordmark, 20, dp.wordmark),
    role: clampText(p.role, 80, dp.role),
    bio: clampText(p.bio, 300, dp.bio),
    portraitUrl: portraitPayload,
    email: clampExact(isValidEmailAddress(p.email) ? p.email : dp.email, 100, dp.email),
    phoneNumber: normalizedPhone.length >= 3 ? normalizedPhone : '',
    whatsappNumber: normalizedWhatsapp.length >= 3 ? normalizedWhatsapp : '',
    location: clampText(p.location, 60, dp.location),
    githubHandle: clampExact(p.githubHandle, 48, dp.githubHandle),
    githubUrl: sanitizePublicUrl(p.githubUrl, '', false).slice(0, 300),
    twitterUrl: sanitizePublicUrl(p.twitterUrl, '', false).slice(0, 300),
    linkedinUrl: sanitizePublicUrl(p.linkedinUrl, '', false).slice(0, 300),
    behanceUrl: sanitizePublicUrl(p.behanceUrl, '', false).slice(0, 300),
    facebookUrl: sanitizePublicUrl(p.facebookUrl, '', false).slice(0, 300),
    instagramUrl: sanitizePublicUrl(p.instagramUrl, '', false).slice(0, 300),
    socialNames: {
      github: clampText(p.socialNames.github, 48, ''),
      linkedin: clampText(p.socialNames.linkedin, 48, ''),
      twitter: clampText(p.socialNames.twitter, 48, ''),
      behance: clampText(p.socialNames.behance, 48, ''),
      facebook: clampText(p.socialNames.facebook, 48, ''),
      whatsapp: clampText(p.socialNames.whatsapp, 48, ''),
      instagram: clampText(p.socialNames.instagram, 48, ''),
    },
    availability: clampText(p.availability, 48, dp.availability),
    disciplineSummary: clampText(p.disciplineSummary, 48, dp.disciplineSummary),
    craftMetricValue: clampExact(p.craftMetricValue, 12, dp.craftMetricValue),
    craftMetricSuffix: clampExact(p.craftMetricSuffix, 6, ''),
    craftMetricLabel: clampText(p.craftMetricLabel, 64, dp.craftMetricLabel),
    craftSummary: clampText(p.craftSummary, 260, dp.craftSummary),
    quoteText: clampText(p.quoteText, 220, dp.quoteText),
    quoteAuthor: clampText(p.quoteAuthor, 40, dp.quoteAuthor),
    quoteRole: clampText(p.quoteRole, 80, dp.quoteRole),
    manifestoLead: clampText(p.manifestoLead, 240, dp.manifestoLead),
    manifestoAvailability: clampText(p.manifestoAvailability, 200, dp.manifestoAvailability),
    prototypeTurnaround: clampExact(p.prototypeTurnaround, 32, dp.prototypeTurnaround),
    heroMetrics: safe.heroMetrics.slice(0, 4).map((m, idx) => ({
      value: clampExact(m.value, 12, `${idx + 1}+`),
      label: clampText(m.label, 52, 'Delivered Builds'),
    })),
    wireframeScenes: safe.wireframeScenes.slice(0, 6).map((s, idx) => ({
      id: sanitizeFirestoreId(s.id, `scene-${idx + 1}`),
      label: clampText(s.label, 64, `0${idx + 1} · Scene`),
      specs: clampText(s.specs, 72, 'Wireframe · Architecture'),
      notes: clampText(s.notes, 200, 'From wireframe to interactive build.'),
      theme: s.theme,
    })),
    techStack: safe.techStack.slice(0, 8).map((t) => ({
      name: clampText(t.name, 40, 'TypeScript'),
      role: clampText(t.role, 56, 'Core Stack'),
    })),
    services: safe.services.slice(0, 6).map((s, idx) => ({
      index: clampExact(s.index, 4, String(idx + 1).padStart(2, '0')),
      title: clampText(s.title, 48, 'Custom Build'),
      detail: clampText(s.detail, 140, 'Full lifecycle delivery.'),
    })),
    techPartners: (() => {
      const cleaned = safe.techPartners
        .slice(0, 8)
        .map((partner) => clampExact(partner, 24, '').toUpperCase())
        .filter(Boolean);
      return cleaned.length > 0 ? cleaned : ADMIN_INITIAL_BUNDLE.techPartners;
    })(),
    viewerControls: {
      showTopScrollBar: Boolean(safe.viewerControls.showTopScrollBar),
      showBottomHud: false,
      showHudProgress: false,
      showHudCursors: false,
      showHudAutoScroll: false,
      showHudReplay: false,
      showHudSound: false,
      showMultiBackBar: Boolean(safe.viewerControls.showMultiBackBar),
      enableCursorsByDefault: Boolean(safe.viewerControls.enableCursorsByDefault),
      enableAutoScrollByDefault: Boolean(safe.viewerControls.enableAutoScrollByDefault),
      enableSoundByDefault: Boolean(safe.viewerControls.enableSoundByDefault),
      cursorSpeed: safe.viewerControls.cursorSpeed,
      accentColor: sanitizeHexColor(safe.viewerControls.accentColor, DEFAULT_ACCENT_COLOR),
      showCvDownloadOnViewer: Boolean(safe.viewerControls.showCvDownloadOnViewer),
      showStarterDemoProjects: safe.viewerControls.showStarterDemoProjects !== false,
    },
    cvSettings: {
      mode: safe.cvSettings.mode === 'custom' ? 'custom' : 'auto',
      customUrl: sanitizeCvSourceUrl(safe.cvSettings.customUrl),
      headline: clampText(safe.cvSettings.headline, 96, DEFAULT_CV_SETTINGS.headline),
    },
    updatedAt: serverTimestamp(),
  };
}

export async function savePortfolioSettings(bundle: PortfolioContentBundle): Promise<void> {
  const path = 'site_settings/main';
  await ensureFreshVerifiedToken();
  try {
    await setDoc(doc(db, 'site_settings', 'main'), buildSettingsPayload(bundle));
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.WRITE, path);
  }
}

const VALID_PROJECT_CATEGORIES: ReadonlyArray<ProjectItem['category']> = [
  'Websites',
  'Apps',
  'Games',
  'UI/UX Design',
];

const VALID_PREVIEW_THEMES: ReadonlyArray<ProjectItem['previewTheme']> = [
  'web-commerce',
  'app-workspace',
  'game-rift',
  'app-realtime',
  'game-drift',
  'ui-system',
];

function buildProjectPayload(project: AdminProjectRecord) {
  const safeStack = (Array.isArray(project.stack) ? project.stack : [])
    .map((s) => clampExact(s, 32, ''))
    .filter(Boolean)
    .slice(0, 6);

  const safeCategory = VALID_PROJECT_CATEGORIES.includes(project.category)
    ? project.category
    : 'Websites';
  const safePreviewTheme = VALID_PREVIEW_THEMES.includes(project.previewTheme)
    ? project.previewTheme
    : 'web-commerce';

  const payload: Record<string, unknown> = {
    index: clampExact(project.index, 8, '01'),
    title: clampText(project.title, 80, 'Untitled Project'),
    category: safeCategory,
    year: clampExact(project.year, 16, String(new Date().getFullYear())),
    platform: clampText(project.platform, 48, 'Web Build'),
    client: clampText(project.client, 48, 'Independent Build'),
    role: clampText(project.role, 80, 'Developer & Designer'),
    stack: safeStack.length > 0 ? safeStack : ['React', 'TypeScript'],
    summary: clampText(project.summary, 340, 'Interactive digital build.'),
    architectureNotes: clampText(
      project.architectureNotes,
      360,
      'Modular frontend and responsive layout architecture.'
    ),
    previewTheme: safePreviewTheme,
    dimensions: clampExact(project.dimensions, 24, '1440 × 900'),
    published: Boolean(project.published),
    sortOrder: Math.max(0, Math.min(1000, Math.trunc(Number(project.sortOrder) || 0))),
    updatedAt: serverTimestamp(),
  };

  const cleanedGalleryRaw = Array.isArray(project.galleryUrls)
    ? project.galleryUrls
        .map((u) => sanitizePublicUrl(normalizeUserUrlInput(u), '', true))
        .filter((u) => u && !isVideoMediaSource(u) && u.length <= 165_000)
        .slice(0, 5)
    : [];

  // Keep cumulative gallery payload well inside Firestore's 1 MiB document size limit
  const cleanedGallery: string[] = [];
  let runningGalleryChars = 0;
  for (const slideUrl of cleanedGalleryRaw) {
    if (runningGalleryChars + slideUrl.length <= 720_000) {
      cleanedGallery.push(slideUrl);
      runningGalleryChars += slideUrl.length;
    }
  }

  const coverCandidate = sanitizePublicUrl(normalizeUserUrlInput(project.coverImageUrl), '', true);
  const isVideo = Boolean(coverCandidate && isVideoMediaSource(coverCandidate, project.coverMediaType));

  if (isVideo) {
    payload.coverImageUrl = coverCandidate.slice(0, 780_000);
    payload.coverMediaType = 'video';
  } else {
    if (cleanedGallery.length > 0) {
      payload.galleryUrls = cleanedGallery;
      // Only also store separate coverImageUrl if total payload stays safely well under 1 MiB
      const preferredCover =
        coverCandidate && !isVideoMediaSource(coverCandidate) ? coverCandidate : cleanedGallery[0];
      if (
        preferredCover &&
        preferredCover.length <= 320_000 &&
        runningGalleryChars + preferredCover.length <= 760_000
      ) {
        payload.coverImageUrl = preferredCover;
      }
      payload.coverMediaType = 'image';
    } else if (coverCandidate) {
      payload.coverImageUrl = coverCandidate.slice(0, 780_000);
      payload.coverMediaType = 'image';
    }
  }

  const live = sanitizePublicUrl(normalizeUserUrlInput(project.liveUrl), '');
  if (live) payload.liveUrl = live.slice(0, 300);

  const repo = sanitizePublicUrl(normalizeUserUrlInput(project.repoUrl), '');
  if (repo) payload.repoUrl = repo.slice(0, 300);

  return payload;
}

export async function saveAdminProject(project: AdminProjectRecord): Promise<string> {
  const safeId = preserveValidFirestoreId(project.id, project.title || 'project', 'proj');
  const path = `projects/${safeId}`;
  await ensureFreshVerifiedToken();
  try {
    await setDoc(doc(db, 'projects', safeId), buildProjectPayload(project));
    return safeId;
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminProject(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  await ensureFreshVerifiedToken();
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.DELETE, path);
  }
}

function buildMilestonePayload(item: AdminMilestoneRecord) {
  return {
    title: clampText(item.title, 110, 'Portfolio Milestone'),
    context: clampText(item.context, 64, 'Engineering & Craft'),
    project: clampText(item.project, 56, 'Selected Build'),
    year: clampExact(item.year, 12, String(new Date().getFullYear())),
    outcome: clampText(item.outcome, 260, 'Shipped with strong performance and craft.'),
    published: Boolean(item.published),
    sortOrder: Math.max(0, Math.min(1000, Math.trunc(Number(item.sortOrder) || 0))),
    updatedAt: serverTimestamp(),
  };
}

export async function saveAdminMilestone(item: AdminMilestoneRecord): Promise<string> {
  const safeId = preserveValidFirestoreId(item.id, item.title || 'milestone', 'ms');
  const path = `milestones/${safeId}`;
  await ensureFreshVerifiedToken();
  try {
    await setDoc(doc(db, 'milestones', safeId), buildMilestonePayload(item));
    return safeId;
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminMilestone(milestoneId: string): Promise<void> {
  const path = `milestones/${milestoneId}`;
  await ensureFreshVerifiedToken();
  try {
    await deleteDoc(doc(db, 'milestones', milestoneId));
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.DELETE, path);
  }
}

function buildExperiencePayload(item: AdminExperienceRecord) {
  return {
    period: clampExact(item.period, 32, '2024 — Present'),
    role: clampText(item.role, 80, 'Developer & Designer'),
    org: clampText(item.org, 80, 'Shanto Studio'),
    description: clampText(item.description, 280, 'Building web, app, and interactive experiences.'),
    published: Boolean(item.published),
    sortOrder: Math.max(0, Math.min(1000, Math.trunc(Number(item.sortOrder) || 0))),
    updatedAt: serverTimestamp(),
  };
}

export async function saveAdminExperience(item: AdminExperienceRecord): Promise<string> {
  const safeId = preserveValidFirestoreId(item.id, item.role || 'experience', 'exp');
  const path = `experience/${safeId}`;
  await ensureFreshVerifiedToken();
  try {
    await setDoc(doc(db, 'experience', safeId), buildExperiencePayload(item));
    return safeId;
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminExperience(expId: string): Promise<void> {
  const path = `experience/${expId}`;
  await ensureFreshVerifiedToken();
  try {
    await deleteDoc(doc(db, 'experience', expId));
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateAdminInquiryStatus(
  inquiryId: string,
  status: InquiryStatus
): Promise<void> {
  const path = `inquiries/${inquiryId}`;
  await ensureFreshVerifiedToken();
  try {
    await updateDoc(doc(db, 'inquiries', inquiryId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAdminInquiry(inquiryId: string): Promise<void> {
  const path = `inquiries/${inquiryId}`;
  await ensureFreshVerifiedToken();
  try {
    await deleteDoc(doc(db, 'inquiries', inquiryId));
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultPortfolioToFirestore(
  bundle: PortfolioContentBundle = ADMIN_INITIAL_BUNDLE
): Promise<void> {
  await ensureFreshVerifiedToken();
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'site_settings', 'main'), buildSettingsPayload(bundle));

    bundle.projects.forEach((proj, idx) => {
      const safeId = sanitizeFirestoreId(proj.id, `proj-${idx + 1}`);
      batch.set(
        doc(db, 'projects', safeId),
        buildProjectPayload({
          ...proj,
          id: safeId,
          published: true,
          sortOrder: idx,
        })
      );
    });

    bundle.milestones.forEach((ms, idx) => {
      const safeId = sanitizeFirestoreId(ms.id, `ms-${idx + 1}`);
      batch.set(
        doc(db, 'milestones', safeId),
        buildMilestonePayload({
          ...ms,
          id: safeId,
          published: true,
          sortOrder: idx,
        })
      );
    });

    bundle.experience.forEach((exp, idx) => {
      const safeId = sanitizeFirestoreId(exp.id, `exp-${idx + 1}`);
      batch.set(
        doc(db, 'experience', safeId),
        buildExperiencePayload({
          ...exp,
          id: safeId,
          published: true,
          sortOrder: idx,
        })
      );
    });

    await batch.commit();
  } catch (error) {
    handleAdminFirestoreError(error, OperationType.WRITE, 'batch_seed');
  }
}
