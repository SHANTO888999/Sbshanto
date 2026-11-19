import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  initializeFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore/lite';
import type {
  CvSettingsConfig,
  ExperienceItem,
  MilestoneItem,
  PortfolioContentBundle,
  ProjectItem,
  SiteProfile,
  ViewerControlsConfig,
} from './data/contentSchema';
import { clampText, sanitizePublicUrl } from './data/contentSchema';
import {
  app,
  firebaseConfig,
  isTransientOfflineError,
  OperationType,
  sanitizeFirestoreId,
  waitMs,
  type FirestoreErrorInfo,
} from './firebaseShared';
import { detectVisitorCountry } from './utils/visitorGeo';

const db: Firestore = (() => {
  try {
    return initializeFirestore(
      app,
      { ignoreUndefinedProperties: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();

export type VisitorAgeGroup = 'under18' | '18-24' | '25-34' | '35-44' | '45plus';

const AGE_GROUP_LABELS: Record<VisitorAgeGroup, string> = {
  under18: 'Under 18',
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45plus': '45+',
};

function handleViewerFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function fetchLivePortfolioContent(): Promise<Partial<PortfolioContentBundle> | null> {
  const override: Partial<PortfolioContentBundle> = {};
  let hasRemoteData = false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }

  const settingsPath = 'site_settings/main';
  const projectsPath = 'projects';
  const milestonesPath = 'milestones';
  const experiencePath = 'experience';

  const withOfflineRetry = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (firstErr) {
      if (!isTransientOfflineError(firstErr)) throw firstErr;
      await waitMs(1000);
      return await fn();
    }
  };

  const loadSettings = async () => {
    try {
      const settingsSnap = await withOfflineRetry(() => getDoc(doc(db, 'site_settings', 'main')));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        hasRemoteData = true;
        override.profile = {
          greeting: data.greeting,
          displayName: data.displayName,
          backdropName: data.backdropName,
          wordmark: data.wordmark,
          role: data.role,
          bio: data.bio,
          portraitUrl: data.portraitUrl,
          email: data.email,
          phoneNumber: data.phoneNumber,
          whatsappNumber: data.whatsappNumber,
          location: data.location,
          githubHandle: data.githubHandle,
          githubUrl: data.githubUrl,
          twitterUrl: data.twitterUrl,
          linkedinUrl: data.linkedinUrl,
          behanceUrl: data.behanceUrl,
          facebookUrl: data.facebookUrl,
          instagramUrl: data.instagramUrl,
          socialNames: data.socialNames,
          availability: data.availability,
          disciplineSummary: data.disciplineSummary,
          craftMetricValue: data.craftMetricValue,
          craftMetricSuffix: data.craftMetricSuffix,
          craftMetricLabel: data.craftMetricLabel,
          craftSummary: data.craftSummary,
          quoteText: data.quoteText,
          quoteAuthor: data.quoteAuthor,
          quoteRole: data.quoteRole,
          manifestoLead: data.manifestoLead,
          manifestoAvailability: data.manifestoAvailability,
          prototypeTurnaround: data.prototypeTurnaround,
        } as SiteProfile;
        if (Array.isArray(data.heroMetrics)) override.heroMetrics = data.heroMetrics;
        if (Array.isArray(data.wireframeScenes)) override.wireframeScenes = data.wireframeScenes;
        if (Array.isArray(data.techStack)) override.techStack = data.techStack;
        if (Array.isArray(data.services)) override.services = data.services;
        if (Array.isArray(data.techPartners)) override.techPartners = data.techPartners;
        if (data.viewerControls && typeof data.viewerControls === 'object') {
          override.viewerControls = data.viewerControls as ViewerControlsConfig;
        }
        if (data.cvSettings && typeof data.cvSettings === 'object') {
          override.cvSettings = data.cvSettings as CvSettingsConfig;
        }
      }
    } catch (error) {
      if (!isTransientOfflineError(error)) {
        handleViewerFirestoreError(error, OperationType.GET, settingsPath);
      }
    }
  };

  const loadProjects = async () => {
    try {
      const projSnap = await withOfflineRetry(() =>
        getDocs(query(collection(db, projectsPath), where('published', '==', true)))
      );
      if (!projSnap.empty) {
        hasRemoteData = true;
        const docsData: Array<Record<string, unknown> & { id: string }> = projSnap.docs.map((d) => ({
          ...(d.data() as Record<string, unknown>),
          id: d.id,
        }));
        const items: ProjectItem[] = docsData
          .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
          .map((d) => {
            const rawGallery = Array.isArray(d.galleryUrls)
              ? (d.galleryUrls as unknown[])
                  .map((u) => sanitizePublicUrl(u, '', true))
                  .filter(Boolean)
                  .slice(0, 5)
              : [];
            return {
              id: d.id,
              index: String(d.index ?? ''),
              title: String(d.title ?? ''),
              category: d.category as ProjectItem['category'],
              year: String(d.year ?? ''),
              platform: String(d.platform ?? ''),
              client: String(d.client ?? ''),
              role: String(d.role ?? ''),
              stack: Array.isArray(d.stack) ? (d.stack as string[]) : [],
              summary: String(d.summary ?? ''),
              architectureNotes: String(d.architectureNotes ?? ''),
              previewTheme: d.previewTheme as ProjectItem['previewTheme'],
              dimensions: String(d.dimensions ?? '1440 × 900'),
              coverImageUrl: sanitizePublicUrl(d.coverImageUrl, '', true) || undefined,
              galleryUrls: rawGallery.length > 0 ? rawGallery : undefined,
              coverMediaType:
                d.coverMediaType === 'video' || d.coverMediaType === 'image'
                  ? d.coverMediaType
                  : undefined,
              liveUrl: sanitizePublicUrl(d.liveUrl, '') || undefined,
              repoUrl: sanitizePublicUrl(d.repoUrl, '') || undefined,
              published: true,
            };
          });
        override.projects = items;
      }
    } catch (error) {
      if (!isTransientOfflineError(error)) {
        handleViewerFirestoreError(error, OperationType.LIST, projectsPath);
      }
    }
  };

  const loadMilestones = async () => {
    try {
      const msSnap = await withOfflineRetry(() =>
        getDocs(query(collection(db, milestonesPath), where('published', '==', true)))
      );
      if (!msSnap.empty) {
        hasRemoteData = true;
        const docsData: Array<Record<string, unknown> & { id: string }> = msSnap.docs.map((d) => ({
          ...(d.data() as Record<string, unknown>),
          id: d.id,
        }));
        const items: MilestoneItem[] = docsData
          .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
          .map((d) => ({
            id: d.id,
            title: String(d.title ?? ''),
            context: String(d.context ?? ''),
            project: String(d.project ?? ''),
            year: String(d.year ?? ''),
            outcome: String(d.outcome ?? ''),
            published: true,
          }));
        override.milestones = items;
      }
    } catch (error) {
      if (!isTransientOfflineError(error)) {
        handleViewerFirestoreError(error, OperationType.LIST, milestonesPath);
      }
    }
  };

  const loadExperience = async () => {
    try {
      const expSnap = await withOfflineRetry(() =>
        getDocs(query(collection(db, experiencePath), where('published', '==', true)))
      );
      if (!expSnap.empty) {
        hasRemoteData = true;
        const docsData: Array<Record<string, unknown> & { id: string }> = expSnap.docs.map((d) => ({
          ...(d.data() as Record<string, unknown>),
          id: d.id,
        }));
        const items: ExperienceItem[] = docsData
          .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
          .map((d) => ({
            id: d.id,
            period: String(d.period ?? ''),
            role: String(d.role ?? ''),
            org: String(d.org ?? ''),
            description: String(d.description ?? ''),
            published: true,
          }));
        override.experience = items;
      }
    } catch (error) {
      if (!isTransientOfflineError(error)) {
        handleViewerFirestoreError(error, OperationType.LIST, experiencePath);
      }
    }
  };

  await Promise.all([loadSettings(), loadProjects(), loadMilestones(), loadExperience()]);

  return hasRemoteData ? override : null;
}

export async function submitProjectInquiry(payload: {
  name: string;
  email: string;
  scope: string;
  brief: string;
}): Promise<void> {
  const safeId = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `inquiries/${safeId}`;
  try {
    await setDoc(doc(db, 'inquiries', safeId), {
      name: clampText(payload.name, 80, 'Visitor'),
      email: clampText(payload.email, 120, ''),
      scope: clampText(payload.scope, 80, 'Website Design & Development'),
      brief: clampText(payload.brief, 2000, ''),
      status: 'new',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleViewerFirestoreError(error, OperationType.CREATE, path);
  }
}

function getLocalDateKey(): { date: string; month: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const date = `${y}-${m}-${d}`;
  return { date, month: `${y}-${m}` };
}

type DailyAnalyticsCounter =
  | 'visitors'
  | 'pageViews'
  | 'projectClicks'
  | 'hireOpens'
  | 'hireSubmits'
  | 'cvDownloads';

function isMissingDocOrRuleEvalError(err: unknown): boolean {
  const code =
    typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code) : '';
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    code === 'not-found' ||
    code === 'permission-denied' ||
    code === 'failed-precondition' ||
    msg.includes('no document to update') ||
    msg.includes('missing or insufficient permissions')
  );
}

function safeGetStorage(storage: 'local' | 'session', key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(storage: 'local' | 'session', key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    store.setItem(key, value);
  } catch {
    // Ignore storage/privacy restrictions
  }
}

async function incrementDailyMetricOnce(
  deltas: Partial<Record<DailyAnalyticsCounter, 1>>
): Promise<'ok' | 'retry' | 'fail'> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'retry';
  const { date, month } = getLocalDateKey();
  const ref = doc(db, 'analytics_daily', date);

  const updatePayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  const counters: DailyAnalyticsCounter[] = [
    'visitors',
    'pageViews',
    'projectClicks',
    'hireOpens',
    'hireSubmits',
    'cvDownloads',
  ];

  let hasDelta = false;
  counters.forEach((key) => {
    if (deltas[key] === 1) {
      updatePayload[key] = increment(1);
      hasDelta = true;
    }
  });
  if (!hasDelta) return 'fail';

  try {
    await updateDoc(ref, updatePayload);
    return 'ok';
  } catch (err) {
    if (isTransientOfflineError(err)) return 'retry';
    if (!isMissingDocOrRuleEvalError(err)) return 'fail';

    try {
      await setDoc(ref, {
        date,
        month,
        visitors: deltas.visitors ?? 0,
        pageViews: deltas.pageViews ?? 0,
        projectClicks: deltas.projectClicks ?? 0,
        hireOpens: deltas.hireOpens ?? 0,
        hireSubmits: deltas.hireSubmits ?? 0,
        cvDownloads: deltas.cvDownloads ?? 0,
        updatedAt: serverTimestamp(),
      });
      return 'ok';
    } catch (setErr) {
      if (isTransientOfflineError(setErr)) return 'retry';
      try {
        await updateDoc(ref, updatePayload);
        return 'ok';
      } catch (retryErr) {
        return isTransientOfflineError(retryErr) ? 'retry' : 'fail';
      }
    }
  }
}

async function incrementDailyMetric(
  deltas: Partial<Record<DailyAnalyticsCounter, 1>>
): Promise<boolean> {
  const first = await incrementDailyMetricOnce(deltas);
  if (first === 'ok') return true;
  if (first === 'retry') {
    await waitMs(1200);
    const second = await incrementDailyMetricOnce(deltas);
    return second === 'ok';
  }
  return false;
}

async function incrementDemographicBucket(
  bucketId: string,
  bucketType: 'country' | 'age',
  code: string,
  label: string
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const safeBucketId = sanitizeFirestoreId(bucketId, 'bucket').slice(0, 48);
  const safeCode = code.trim().slice(0, 24) || 'UN';
  const safeLabel = clampText(label, 60, safeCode);
  const ref = doc(db, 'analytics_demographics', safeBucketId);

  try {
    await updateDoc(ref, {
      label: safeLabel,
      count: increment(1),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    if (!isTransientOfflineError(err) && !isMissingDocOrRuleEvalError(err)) return false;
    if (isTransientOfflineError(err)) {
      await waitMs(1000);
    }
    try {
      await setDoc(ref, {
        bucketId: safeBucketId,
        bucketType,
        code: safeCode,
        label: safeLabel,
        count: 1,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch {
      try {
        await updateDoc(ref, {
          label: safeLabel,
          count: increment(1),
          updatedAt: serverTimestamp(),
        });
        return true;
      } catch {
        return false;
      }
    }
  }
}

export async function trackVisitorSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { date } = getLocalDateKey();
  const visitKey = `shanto_uv_${date}`;
  const sessionKey = `shanto_pv_${date}`;
  const countryKey = `shanto_geo_rec_${date}`;

  const geoPromise = detectVisitorCountry();

  if (safeGetStorage('session', sessionKey) !== '1') {
    const isNewDailyVisitor = safeGetStorage('local', visitKey) !== '1';
    const recorded = await incrementDailyMetric({
      visitors: isNewDailyVisitor ? 1 : undefined,
      pageViews: 1,
    });
    if (recorded) {
      safeSetStorage('session', sessionKey, '1');
      if (isNewDailyVisitor) {
        safeSetStorage('local', visitKey, '1');
      }
    }
  }

  if (safeGetStorage('local', countryKey) !== '1') {
    const geo = await geoPromise;
    const savedGeo = await incrementDemographicBucket(
      `c_${geo.countryCode}`,
      'country',
      geo.countryCode,
      geo.countryName
    );
    if (savedGeo) {
      safeSetStorage('local', countryKey, '1');
    }
  }
}

export async function trackVisitorAgeGroup(ageGroup: VisitorAgeGroup): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const recordedKey = 'shanto_age_group_v1';
  if (safeGetStorage('local', recordedKey)) {
    return true;
  }
  const label = AGE_GROUP_LABELS[ageGroup] ?? ageGroup;
  const bucketId = `a_${ageGroup.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const ok = await incrementDemographicBucket(bucketId, 'age', ageGroup, label);
  if (ok) {
    safeSetStorage('local', recordedKey, ageGroup);
  }
  return ok;
}

export function hasReportedVisitorAgeGroup(): string | null {
  return safeGetStorage('local', 'shanto_age_group_v1');
}

export function startLivePresenceHeartbeat(): () => void {
  if (typeof window === 'undefined') return () => {};

  let stopped = false;
  let sessionId = safeGetStorage('session', 'shanto_presence_sid') ?? '';
  if (!sessionId) {
    sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    safeSetStorage('session', 'shanto_presence_sid', sessionId);
  }
  const safeSid = sanitizeFirestoreId(sessionId, 'sess').slice(0, 80);
  const ref = doc(db, 'analytics_presence', safeSid);

  const pushHeartbeat = async () => {
    if (stopped) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      const geo = await detectVisitorCountry();
      if (stopped) return;
      const cleanPath = (window.location.pathname || '/').slice(0, 64) || '/';
      await setDoc(ref, {
        sessionId: safeSid,
        countryCode: (geo.countryCode || 'UN').replace(/[^A-Z0-9_-]/g, '').slice(0, 8) || 'UN',
        countryName: clampText(geo.countryName, 60, 'International'),
        path: cleanPath,
        lastSeenAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal silent presence retry on next heartbeat
    }
  };

  void pushHeartbeat();
  const intervalId = window.setInterval(() => {
    void pushHeartbeat();
  }, 25_000);

  const onActive = () => {
    if (document.visibilityState === 'visible') {
      void pushHeartbeat();
    }
  };
  document.addEventListener('visibilitychange', onActive);
  window.addEventListener('focus', onActive);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onActive);
    window.removeEventListener('focus', onActive);
  };
}

export async function trackProjectCardClick(project: {
  id: string;
  title: string;
  category: string;
}): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  void incrementDailyMetric({ projectClicks: 1 });
  const safeId = sanitizeFirestoreId(project.id, 'proj');
  const safeCategory = ['Websites', 'Apps', 'Games', 'UI/UX Design'].includes(project.category)
    ? project.category
    : 'Websites';
  const safeTitle = clampText(project.title, 80, 'Portfolio Project');
  const ref = doc(db, 'analytics_projects', safeId);

  const updatePayload = {
    title: safeTitle,
    category: safeCategory,
    clicks: increment(1),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(ref, updatePayload);
  } catch (err) {
    if (isTransientOfflineError(err)) {
      await waitMs(1200);
      try {
        await updateDoc(ref, updatePayload);
        return;
      } catch {
        // Fall through if doc may not exist yet
      }
    } else if (!isMissingDocOrRuleEvalError(err)) {
      return;
    }
    try {
      await setDoc(ref, {
        projectId: safeId,
        title: safeTitle,
        category: safeCategory,
        clicks: 1,
        updatedAt: serverTimestamp(),
      });
    } catch {
      try {
        await updateDoc(ref, updatePayload);
      } catch {
        // Silent race/network fallback
      }
    }
  }
}

export async function trackHireModalOpen(): Promise<void> {
  await incrementDailyMetric({ hireOpens: 1 });
}

export async function trackHireInquirySubmit(): Promise<void> {
  await incrementDailyMetric({ hireSubmits: 1 });
}

export async function trackCvDownload(): Promise<void> {
  await incrementDailyMetric({ cvDownloads: 1 });
}
