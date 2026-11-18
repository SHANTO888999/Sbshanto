import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
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
  db,
  isTransientOfflineError,
  OperationType,
  sanitizeFirestoreId,
  waitMs,
  type FirestoreErrorInfo,
} from './firebaseClientBase';

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
  try {
    let settingsSnap;
    try {
      settingsSnap = await getDoc(doc(db, 'site_settings', 'main'));
    } catch (firstErr) {
      if (!isTransientOfflineError(firstErr)) throw firstErr;
      await waitMs(1000);
      settingsSnap = await getDoc(doc(db, 'site_settings', 'main'));
    }
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
        githubHandle: data.githubHandle,
        githubUrl: data.githubUrl,
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
    handleViewerFirestoreError(error, OperationType.GET, settingsPath);
  }

  const projectsPath = 'projects';
  try {
    const projSnap = await getDocs(
      query(collection(db, projectsPath), where('published', '==', true))
    );
    if (!projSnap.empty) {
      hasRemoteData = true;
      const docsData: Array<Record<string, unknown> & { id: string }> = projSnap.docs.map((d) => ({
        ...(d.data() as Record<string, unknown>),
        id: d.id,
      }));
      const items: ProjectItem[] = docsData
        .sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999))
        .map((d) => ({
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
          coverMediaType:
            d.coverMediaType === 'video' || d.coverMediaType === 'image'
              ? d.coverMediaType
              : undefined,
          liveUrl: sanitizePublicUrl(d.liveUrl, '') || undefined,
          repoUrl: sanitizePublicUrl(d.repoUrl, '') || undefined,
          published: true,
        }));
      override.projects = items;
    }
  } catch (error) {
    handleViewerFirestoreError(error, OperationType.LIST, projectsPath);
  }

  const milestonesPath = 'milestones';
  try {
    const msSnap = await getDocs(
      query(collection(db, milestonesPath), where('published', '==', true))
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
    handleViewerFirestoreError(error, OperationType.LIST, milestonesPath);
  }

  const experiencePath = 'experience';
  try {
    const expSnap = await getDocs(
      query(collection(db, experiencePath), where('published', '==', true))
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
    handleViewerFirestoreError(error, OperationType.LIST, experiencePath);
  }

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

async function incrementDailyMetric(
  deltas: Partial<Record<DailyAnalyticsCounter, 1>>
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
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
  if (!hasDelta) return false;

  try {
    await updateDoc(ref, updatePayload);
    return true;
  } catch (err) {
    if (!isMissingDocOrRuleEvalError(err)) {
      return false;
    }
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
      return true;
    } catch {
      // Another concurrent visitor may have just created today's doc; retry atomic increment
      try {
        await updateDoc(ref, updatePayload);
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

  try {
    if (window.sessionStorage.getItem(sessionKey) === '1') return;
    const isNewDailyVisitor = window.localStorage.getItem(visitKey) !== '1';
    const recorded = await incrementDailyMetric({
      visitors: isNewDailyVisitor ? 1 : undefined,
      pageViews: 1,
    });
    if (recorded) {
      window.sessionStorage.setItem(sessionKey, '1');
      if (isNewDailyVisitor) {
        window.localStorage.setItem(visitKey, '1');
      }
    }
  } catch {
    // Ignore storage/privacy restrictions
  }
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
    if (!isMissingDocOrRuleEvalError(err)) return;
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
