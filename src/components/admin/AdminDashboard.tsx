import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Briefcase,
  ChevronRight,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MailCheck,
  RefreshCw,
  UserCog,
} from 'lucide-react';
import { ADMIN_INITIAL_BUNDLE } from '../../data/adminDefaults';
import type { PortfolioContentBundle } from '../../data/contentSchema';
import {
  deleteAdminExperience,
  deleteAdminInquiry,
  deleteAdminMilestone,
  deleteAdminProject,
  fetchAdminDashboardSnapshot,
  OWNER_ADMIN_EMAIL,
  OWNER_ADMIN_UID,
  reloadCurrentUser,
  saveAdminExperience,
  saveAdminMilestone,
  saveAdminProject,
  savePortfolioSettings,
  seedDefaultPortfolioToFirestore,
  sendAdminVerificationEmail,
  signInAdminWithEmail,
  signOutAdmin,
  subscribeAdminAuth,
  updateAdminInquiryStatus,
  verifyAdminAccess,
  type AdminDashboardSnapshot,
  type AdminExperienceRecord,
  type AdminMilestoneRecord,
  type AdminProjectRecord,
  type InquiryStatus,
} from '../../firebaseAdmin';
import { downloadPortfolioCv } from '../../utils/cvPdfGenerator';
import { handleFormEnterToNext } from '../../utils/formKeyboardNav';
import { applyDocumentAccentTheme } from '../../utils/themeAccent';
import { OfflineIndicator, PWAInstallButton } from '../PWAInstallButton';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import { AdminCareerEditor } from './AdminCareerEditor';
import { AdminInquiriesInbox } from './AdminInquiriesInbox';
import { AdminProfileEditor, type ProfileSubTab } from './AdminProfileEditor';
import { AdminProjectsEditor } from './AdminProjectsEditor';
import { ConfirmDialog, StatusNotice } from './FieldControls';

type AdminTab = 'overview' | 'analytics' | 'profile' | 'projects' | 'career' | 'inquiries';

const PROFILE_SUB_LABELS: Record<ProfileSubTab, string> = {
  identity: 'Hero & Portrait',
  contact: 'Contact & Quote',
  metrics: 'Metrics & Partners',
  process: 'Services & Stack',
  viewer: 'Viewer Controls',
  cv: 'Resume / CV',
};

const CAREER_SUB_LABELS: Record<'milestones' | 'experience', string> = {
  milestones: 'Milestones',
  experience: 'Career Timeline',
};

interface AdminDashboardProps {
  onOpenViewerPreview?: () => void;
  onContentSaved?: () => Promise<void> | void;
}

function formatDashboardError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string | null };
    if (parsed && typeof parsed.error === 'string') {
      const inner = parsed.error;
      if (inner.includes('Missing or insufficient permissions')) {
        return 'Permission denied by Firestore security rules. Confirm your admin email is verified and rules are deployed.';
      }
      if (inner.includes('Quota exceeded')) {
        return 'Firestore daily quota exceeded. Please try again later or upgrade your Firebase plan.';
      }
      if (inner.includes('client is offline') || inner.includes('unavailable')) {
        return 'Network or Firestore connection unavailable. Check your internet connection and retry.';
      }
      return parsed.path ? `${inner} (${parsed.path})` : inner;
    }
  } catch {
    // plain non-JSON error message
  }
  return raw || 'Something went wrong. Please retry.';
}

function formatAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is disabled. Enable Email/Password in Firebase Console → Authentication → Sign-in method.';
  }
  if (
    raw.includes('auth/invalid-credential') ||
    raw.includes('auth/wrong-password') ||
    raw.includes('auth/user-not-found')
  ) {
    return 'Invalid email or password. Verify the credentials created in Firebase Console → Authentication → Users.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Too many failed attempts. Please wait a minute and try again.';
  }
  return raw;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenViewerPreview,
  onContentSaved,
}) => {

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [tabHistory, setTabHistory] = useState<AdminTab[]>(['overview']);
  const activeTab = tabHistory[tabHistory.length - 1] ?? 'overview';

  const [profileSubHistory, setProfileSubHistory] = useState<ProfileSubTab[]>(['identity']);
  const activeProfileSubTab = profileSubHistory[profileSubHistory.length - 1] ?? 'identity';

  const [careerSubHistory, setCareerSubHistory] = useState<Array<'milestones' | 'experience'>>([
    'milestones',
  ]);
  const activeCareerSubTab = careerSubHistory[careerSubHistory.length - 1] ?? 'milestones';

  const [subViewLabel, setSubViewLabel] = useState<string | null>(null);
  const [exitSubViewNonce, setExitSubViewNonce] = useState(0);
  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [closeChildDialogNonce, setCloseChildDialogNonce] = useState(0);
  const [keyboardOffsetPx, setKeyboardOffsetPx] = useState(0);

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);

  const pushedStepsRef = useRef(0);
  const suppressPopCountRef = useRef(0);
  const closingViaBackRef = useRef(false);
  const closingDialogViaBackRef = useRef(false);
  const prevSubViewRef = useRef<string | null>(null);
  const prevDialogOpenRef = useRef(false);
  const stepBackRef = useRef<() => boolean>(() => false);

  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot>({
    hasRemoteSettings: false,
    settingsBundle: ADMIN_INITIAL_BUNDLE,
    projects: [],
    milestones: [],
    experience: [],
    inquiries: [],
    dailyAnalytics: [],
    projectAnalytics: [],
  });

  const [profileDraft, setProfileDraft] = useState<PortfolioContentBundle>(ADMIN_INITIAL_BUNDLE);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'SHANTO Admin — Portfolio Studio';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Track mobile virtual keyboard height so admin forms always scroll smoothly above keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const updateOffset = () => {
      const hiddenBottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKeyboardOffsetPx(hiddenBottom > 60 ? hiddenBottom : 0);
    };
    updateOffset();
    vv.addEventListener('resize', updateOffset);
    vv.addEventListener('scroll', updateOffset);
    return () => {
      vv.removeEventListener('resize', updateOffset);
      vv.removeEventListener('scroll', updateOffset);
    };
  }, []);

  const pushHistoryStep = useCallback(() => {
    pushedStepsRef.current += 1;
    window.history.pushState({ adminStep: pushedStepsRef.current }, '');
  }, []);

  const popHistorySteps = useCallback((count = 1) => {
    const toPop = Math.min(Math.max(0, count), pushedStepsRef.current);
    if (toPop <= 0) return;
    pushedStepsRef.current -= toPop;
    suppressPopCountRef.current += 1;
    window.history.go(-toPop);
  }, []);

  const popHistoryStep = useCallback(() => {
    popHistorySteps(1);
  }, [popHistorySteps]);

  const clearHistorySteps = useCallback(() => {
    if (pushedStepsRef.current > 0) {
      popHistorySteps(pushedStepsRef.current);
    }
  }, [popHistorySteps]);

  const navigateToTab = useCallback(
    (nextTab: AdminTab) => {
      setNotice(null);
      if (subViewLabel) {
        closingViaBackRef.current = true;
        setExitSubViewNonce((n) => n + 1);
        setSubViewLabel(null);
        prevSubViewRef.current = null;
      }
      if (nextTab === 'overview') {
        clearHistorySteps();
        setTabHistory(['overview']);
        setProfileSubHistory(['identity']);
        setCareerSubHistory(['milestones']);
        return;
      }
      setTabHistory((prev) => {
        if (prev[prev.length - 1] === nextTab) return prev;
        pushHistoryStep();
        return [...prev.slice(-9), nextTab];
      });
    },
    [clearHistorySteps, pushHistoryStep, subViewLabel]
  );

  const navigateProfileSubTab = useCallback(
    (nextSub: ProfileSubTab) => {
      setProfileSubHistory((prev) => {
        if (prev[prev.length - 1] === nextSub) return prev;
        pushHistoryStep();
        return [...prev.slice(-7), nextSub];
      });
    },
    [pushHistoryStep]
  );

  const navigateCareerSubTab = useCallback(
    (nextSub: 'milestones' | 'experience') => {
      setCareerSubHistory((prev) => {
        if (prev[prev.length - 1] === nextSub) return prev;
        pushHistoryStep();
        return [...prev.slice(-7), nextSub];
      });
    },
    [pushHistoryStep]
  );

  const handleSubViewChange = useCallback(
    (nextLabel: string | null) => {
      const hadSubView = prevSubViewRef.current !== null;
      if (nextLabel !== null && !hadSubView) {
        prevSubViewRef.current = nextLabel;
        setSubViewLabel(nextLabel);
        pushHistoryStep();
      } else if (nextLabel === null && hadSubView) {
        prevSubViewRef.current = null;
        setSubViewLabel(null);
        if (closingViaBackRef.current) {
          closingViaBackRef.current = false;
        } else {
          popHistoryStep();
        }
      } else if (nextLabel !== prevSubViewRef.current) {
        prevSubViewRef.current = nextLabel;
        setSubViewLabel(nextLabel);
      }
    },
    [popHistoryStep, pushHistoryStep]
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setChildDialogOpen(open);
      if (open && !prevDialogOpenRef.current) {
        prevDialogOpenRef.current = true;
        pushHistoryStep();
      } else if (!open && prevDialogOpenRef.current) {
        prevDialogOpenRef.current = false;
        if (closingDialogViaBackRef.current) {
          closingDialogViaBackRef.current = false;
        } else {
          popHistoryStep();
        }
      }
    },
    [popHistoryStep, pushHistoryStep]
  );

  const performStepBack = useCallback((): boolean => {
    if (seedConfirmOpen) {
      setSeedConfirmOpen(false);
      return true;
    }
    if (childDialogOpen) {
      closingDialogViaBackRef.current = true;
      prevDialogOpenRef.current = false;
      setChildDialogOpen(false);
      setCloseChildDialogNonce((n) => n + 1);
      return true;
    }
    if (subViewLabel) {
      closingViaBackRef.current = true;
      prevSubViewRef.current = null;
      setSubViewLabel(null);
      setExitSubViewNonce((n) => n + 1);
      return true;
    }
    if (activeTab === 'profile' && profileSubHistory.length > 1) {
      setProfileSubHistory((prev) => prev.slice(0, -1));
      return true;
    }
    if (activeTab === 'career' && careerSubHistory.length > 1) {
      setCareerSubHistory((prev) => prev.slice(0, -1));
      return true;
    }
    if (tabHistory.length > 1) {
      setTabHistory((prev) => prev.slice(0, -1));
      return true;
    }
    if (activeTab !== 'overview') {
      setTabHistory(['overview']);
      return true;
    }
    return false;
  }, [
    seedConfirmOpen,
    childDialogOpen,
    subViewLabel,
    activeTab,
    profileSubHistory.length,
    careerSubHistory.length,
    tabHistory.length,
  ]);

  useEffect(() => {
    stepBackRef.current = performStepBack;
  }, [performStepBack]);

  useEffect(() => {
    const onPopState = () => {
      if (suppressPopCountRef.current > 0) {
        suppressPopCountRef.current -= 1;
        return;
      }
      if (pushedStepsRef.current > 0) {
        pushedStepsRef.current -= 1;
      }
      stepBackRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleUiBack = useCallback(() => {
    const stepped = performStepBack();
    if (stepped) {
      popHistoryStep();
    }
  }, [performStepBack, popHistoryStep]);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    setNotice(null);
    try {
      const data = await fetchAdminDashboardSnapshot();
      setSnapshot(data);
      setProfileDraft(data.settingsBundle);
      applyDocumentAccentTheme(data.settingsBundle.viewerControls.accentColor);
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : '';
      if (rawMsg.includes('Missing or insufficient permissions')) {
        try {
          await reloadCurrentUser();
          const retryData = await fetchAdminDashboardSnapshot();
          setSnapshot(retryData);
          setProfileDraft(retryData.settingsBundle);
          applyDocumentAccentTheme(retryData.settingsBundle.viewerControls.accentColor);
          return;
        } catch (retryErr) {
          setNotice({ type: 'error', text: formatDashboardError(retryErr) });
          return;
        }
      }
      setNotice({ type: 'error', text: formatDashboardError(err) });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAdminAuth(async (nextUser) => {
      setUser(nextUser);
      setVerificationSent(false);
      if (!nextUser) {
        setAuthorized(false);
        setAuthReady(true);
        setNotice(null);
        setSubViewLabel(null);
        prevSubViewRef.current = null;
        setTabHistory(['overview']);
        setProfileSubHistory(['identity']);
        setCareerSubHistory(['milestones']);
        setSnapshot({
          hasRemoteSettings: false,
          settingsBundle: ADMIN_INITIAL_BUNDLE,
          projects: [],
          milestones: [],
          experience: [],
          inquiries: [],
          dailyAnalytics: [],
          projectAnalytics: [],
        });
        setProfileDraft(ADMIN_INITIAL_BUNDLE);
        clearHistorySteps();
        return;
      }
      const isOk = await verifyAdminAccess(nextUser);
      setAuthorized(isOk);
      setAuthReady(true);
      if (isOk) {
        void loadDashboard();
      }
    });
    return unsub;
  }, [clearHistorySteps, loadDashboard]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInAdminWithEmail(loginEmail, loginPassword);
      setLoginPassword('');
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await sendAdminVerificationEmail(user);
      setVerificationSent(true);
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCheckVerification = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const refreshed = await reloadCurrentUser();
      setUser(refreshed);
      const isOk = await verifyAdminAccess(refreshed);
      setAuthorized(isOk);
      if (isOk) {
        void loadDashboard();
      } else {
        setAuthError('Email is not verified yet. Open the link in your inbox, then tap Unlock.');
      }
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOutAdmin();
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const runMutation = async (fn: () => Promise<void>, successText: string): Promise<boolean> => {
    setSaving(true);
    setNotice(null);
    try {
      await fn();
      await loadDashboard();
      if (onContentSaved) {
        await onContentSaved();
      }
      setNotice({ type: 'success', text: successText });
      return true;
    } catch (err) {
      setNotice({ type: 'error', text: formatDashboardError(err) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const newInquiriesCount = snapshot.inquiries.filter((i) => i.status === 'new').length;
  const publishedProjectsCount = snapshot.projects.filter((p) => p.published).length;

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile & Copy', icon: UserCog },
    { id: 'projects', label: 'Projects', icon: FolderKanban, badge: snapshot.projects.length },
    {
      id: 'career',
      label: 'Milestones & Bio',
      icon: Award,
      badge: snapshot.milestones.length + snapshot.experience.length,
    },
    { id: 'inquiries', label: 'Inquiries', icon: Inbox, badge: newInquiriesCount },
  ];

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507] px-6 text-[#F4F4F5]">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#DC2626]" />
          <p className="text-xs font-medium text-zinc-400">Checking admin session...</p>
        </div>
      </div>
    );
  }

  if (!user || !authorized) {
    const isOwnerUnverified =
      Boolean(user) &&
      !user?.emailVerified &&
      (user?.uid === OWNER_ADMIN_UID ||
        user?.email?.toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase());

    return (
      <div
        data-admin-workspace="true"
        className="design-grid-bg flex min-h-[100dvh] flex-col justify-between gap-6 bg-[#050507] px-6 py-8 pb-20 text-[#F4F4F5]"
      >
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-white">
            SHANTO<span className="text-accent">.</span> ADMIN
          </span>
          <div className="flex items-center gap-2">
            <PWAInstallButton label="Install App" />
            {onOpenViewerPreview ? (
              <button
                type="button"
                onClick={onOpenViewerPreview}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Live Site
              </button>
            ) : (
              <a
                href="https://sbshanto.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Live Site
              </a>
            )}
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-md rounded-2xl border border-white/12 bg-[#0B0C10] p-7 shadow-2xl sm:p-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 text-[#EF4444]">
            {isOwnerUnverified ? (
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Lock className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-white">
            {isOwnerUnverified ? 'VERIFY YOUR EMAIL' : 'ADMIN SIGN IN'}
          </h1>

          {isOwnerUnverified && user ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-zinc-300">
                Signed in as <span className="font-mono text-white">{user.email}</span>. Verify
                this email address once so Firestore Security Rules unlock database writes.
              </p>

              {verificationSent && (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                  Verification link sent to {user.email}. Click the link in your inbox (check spam
                  too), then tap &ldquo;I&rsquo;ve Verified&rdquo; below.
                </p>
              )}

              {authError && (
                <p className="rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs leading-relaxed text-red-200">
                  {authError}
                </p>
              )}

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleSendVerification}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
                >
                  {authBusy ? 'Sending...' : 'Send Verification Email'}
                </button>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleCheckVerification}
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-md border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5"
                >
                  I&rsquo;ve Verified — Unlock Dashboard
                </button>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleSignOut}
                  className="inline-flex min-h-[40px] w-full items-center justify-center rounded-md px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : user && !authorized ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-zinc-300">
                The account <span className="font-mono text-white">{user.email}</span> is not
                authorized as an administrator.
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                Sign in with your verified administrator email and password configured in Firebase
                Authentication.
              </p>
              {authError && (
                <p className="rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs leading-relaxed text-red-200">
                  {authError}
                </p>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleSignOut}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
                >
                  Try Another Account
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleEmailLogin}
              onKeyDown={handleFormEnterToNext}
              className="mt-4 space-y-4"
            >
              <p className="text-sm leading-relaxed text-zinc-300">
                Enter your administrator email and password to manage portfolio content and client
                inquiries.
              </p>

              {authError && (
                <p className="rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs leading-relaxed text-red-200">
                  {authError}
                </p>
              )}

              <div>
                <label htmlFor="admin-email" className="block text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  enterKeyHint="next"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter admin email"
                  className="mt-1.5 min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-pass" className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="admin-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    enterKeyHint="go"
                    data-enter-submit="true"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="min-h-[44px] w-full rounded-md border border-white/15 bg-[#070709] py-2 pr-11 pl-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#DC2626] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-md bg-[#DC2626] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {authBusy ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}
        </main>

        <footer className="mx-auto w-full max-w-4xl text-center text-xs text-zinc-500">
          Session-Only Security · Closing browser or app automatically locks Admin access
        </footer>
      </div>
    );
  }

  const adminBackStepCount =
    (seedConfirmOpen ? 1 : 0) +
    (childDialogOpen ? 1 : 0) +
    (subViewLabel ? 1 : 0) +
    (activeTab === 'profile' ? Math.max(0, profileSubHistory.length - 1) : 0) +
    (activeTab === 'career' ? Math.max(0, careerSubHistory.length - 1) : 0) +
    Math.max(0, tabHistory.length - 1) +
    (tabHistory.length === 1 && activeTab !== 'overview' ? 1 : 0);

  const canGoBack = adminBackStepCount > 0;

  const currentTabLabel = navItems.find((n) => n.id === activeTab)?.label ?? 'Overview';

  return (
    <div
      data-admin-workspace="true"
      className="min-h-[100dvh] bg-[#050507] text-[#F4F4F5] lg:flex"
    >
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-[#08090D] p-5 lg:flex">
        <div>
          <div className="border-b border-white/10 pb-5">
            <span className="font-display text-xl font-bold tracking-tight text-white">
              SHANTO<span className="text-accent">.</span> ADMIN
            </span>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">{user.email}</p>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Admin sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToTab(item.id)}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-md px-3.5 py-2 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-accent text-white'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        active ? 'text-white/90' : 'text-zinc-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <PWAInstallButton label="Install Admin App" className="min-h-[40px] w-full" />
          {onOpenViewerPreview ? (
            <button
              type="button"
              onClick={onOpenViewerPreview}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Preview Live Site
            </button>
          ) : (
            <a
              href="https://sbshanto.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open Live Site
            </a>
          )}
          <button
            type="button"
            onClick={() => void signOutAdmin()}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050507]/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {canGoBack && (
                <button
                  type="button"
                  onClick={handleUiBack}
                  aria-label="Go back one step"
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 bg-[#0E1016] px-3 py-1.5 text-xs font-semibold text-white hover:border-[#DC2626]/60 hover:bg-white/5 shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
                  <span>Back</span>
                  {adminBackStepCount > 1 && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-200">
                      {adminBackStepCount}
                    </span>
                  )}
                </button>
              )}

              <span className="truncate font-display text-lg font-bold tracking-tight text-white lg:hidden">
                SHANTO<span className="text-[#DC2626]">.</span> ADMIN
              </span>

              <span className="hidden text-xs font-medium text-zinc-400 lg:inline">
                Portfolio Control Center /{' '}
                <span className="text-white">{currentTabLabel}</span>
                {subViewLabel && (
                  <>
                    {' / '}
                    <span className="text-[#EF4444]">{subViewLabel}</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton compact className="min-h-[38px] lg:hidden" />

              <button
                type="button"
                disabled={loadingData || saving}
                onClick={() => void loadDashboard()}
                aria-label="Refresh cloud data"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {onOpenViewerPreview ? (
                <button
                  type="button"
                  onClick={onOpenViewerPreview}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 lg:hidden whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Live Site
                </button>
              ) : (
                <a
                  href="https://sbshanto.web.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 lg:hidden whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Live Site
                </a>
              )}

              <button
                type="button"
                onClick={() => void signOutAdmin()}
                aria-label="Sign out"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-md border border-white/15 text-zinc-300 hover:bg-white/5 lg:hidden"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <nav
            className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden"
            aria-label="Mobile admin navigation"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToTab(item.id)}
                  className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-accent text-white'
                      : 'border border-white/10 bg-[#0B0C10] text-zinc-300'
                  }`}
                >
                  {item.label}
                  {typeof item.badge === 'number' ? ` (${item.badge})` : ''}
                </button>
              );
            })}
          </nav>

          {/* Multi-Level Clickable Breadcrumb Back Bar */}
          {canGoBack && (
            <div
              aria-label="Back navigation trail"
              className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2.5 text-xs"
            >
              <button
                type="button"
                onClick={() => navigateToTab('overview')}
                className="inline-flex min-h-[30px] items-center gap-1 rounded border border-white/10 bg-[#0B0C10] px-2.5 py-1 text-zinc-300 hover:border-white/25 hover:text-white"
              >
                <Home className="h-3 w-3 text-[#EF4444]" aria-hidden="true" />
                Overview
              </button>

              {activeTab !== 'overview' && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => {
                      if (subViewLabel) {
                        closingViaBackRef.current = true;
                        prevSubViewRef.current = null;
                        setSubViewLabel(null);
                        setExitSubViewNonce((n) => n + 1);
                        popHistoryStep();
                      } else if (activeTab === 'profile' && profileSubHistory.length > 1) {
                        const steps = profileSubHistory.length - 1;
                        setProfileSubHistory(['identity']);
                        popHistorySteps(steps);
                      } else if (activeTab === 'career' && careerSubHistory.length > 1) {
                        const steps = careerSubHistory.length - 1;
                        setCareerSubHistory(['milestones']);
                        popHistorySteps(steps);
                      }
                    }}
                    className={`inline-flex min-h-[30px] items-center gap-1 rounded px-2.5 py-1 ${
                      subViewLabel ||
                      (activeTab === 'profile' && activeProfileSubTab !== 'identity') ||
                      (activeTab === 'career' && activeCareerSubTab !== 'milestones')
                        ? 'border border-white/10 bg-[#0B0C10] text-zinc-200 hover:border-white/25 hover:text-white'
                        : 'bg-white/10 font-semibold text-white'
                    }`}
                  >
                    {currentTabLabel}
                  </button>
                </>
              )}

              {activeTab === 'profile' && activeProfileSubTab !== 'identity' && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                  <span className="rounded bg-white/10 px-2.5 py-1 font-semibold text-white">
                    {PROFILE_SUB_LABELS[activeProfileSubTab]}
                  </span>
                </>
              )}

              {activeTab === 'career' && activeCareerSubTab !== 'milestones' && !subViewLabel && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                  <span className="rounded bg-white/10 px-2.5 py-1 font-semibold text-white">
                    {CAREER_SUB_LABELS[activeCareerSubTab]}
                  </span>
                </>
              )}

              {subViewLabel && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                  <span className="rounded bg-[#DC2626]/20 px-2.5 py-1 font-semibold text-red-200">
                    {subViewLabel}
                  </span>
                </>
              )}
            </div>
          )}
        </header>

        <main
          style={{ paddingBottom: `${Math.max(112, keyboardOffsetPx + 72)}px` }}
          className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8"
        >
          <StatusNotice notice={notice} onDismiss={() => setNotice(null)} />

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="border-b border-white/10 pb-5">
                <h1 className="font-display text-3xl font-bold tracking-tight text-white">
                  STUDIO OVERVIEW
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Manage everything displayed on your public portfolio website with automatic
                  character bounds and safe fallbacks.
                </p>
              </div>

              {(!snapshot.hasRemoteSettings || snapshot.projects.length === 0) && (
                <div className="flex flex-col gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-amber-200">
                      Cloud Database Ready to Initialize
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                      Right now your viewer site is showing built-in defaults. Sync those defaults
                      into Cloud Firestore in one click so you can edit every item directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setSeedConfirmOpen(true)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    <CloudUpload className="h-4 w-4" aria-hidden="true" />
                    Sync Default Portfolio to Cloud
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <p className="text-xs text-zinc-400">Published Projects</p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-white">
                    {publishedProjectsCount}
                    <span className="ml-1.5 text-sm font-normal text-zinc-500">
                      / {snapshot.projects.length}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <p className="text-xs text-zinc-400">Milestones</p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-white">
                    {snapshot.milestones.length}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <p className="text-xs text-zinc-400">Timeline Entries</p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-white">
                    {snapshot.experience.length}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <p className="text-xs text-zinc-400">New Client Inquiries</p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums text-[#EF4444]">
                    {newInquiriesCount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <h2 className="text-sm font-semibold text-white">Quick Shortcuts</h2>
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => navigateToTab('profile')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <UserCog className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Edit Name, Photo &amp; Bio
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('projects')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <FolderKanban className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Add / Update Projects
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('career')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <Briefcase className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Milestones &amp; Experience
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('inquiries')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <Inbox className="h-4 w-4 text-accent-light" aria-hidden="true" />
                      Open Inquiries ({snapshot.inquiries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('analytics')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white sm:col-span-2"
                    >
                      <BarChart3 className="h-4 w-4 text-accent-light" aria-hidden="true" />
                      View Visitor &amp; Project Analytics
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <FileText className="h-4 w-4 text-accent-light" aria-hidden="true" />
                        Resume / CV &amp; Cloud Status
                      </h2>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          profileDraft.viewerControls.showCvDownloadOnViewer
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {profileDraft.viewerControls.showCvDownloadOnViewer
                          ? 'Public CV: ON'
                          : 'Public CV: OFF (Admin Only)'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      Generate and download your latest portfolio PDF CV here anytime, or configure
                      whether visitors can see the CV button on{' '}
                      <span className="font-mono text-zinc-200">sbshanto.web.app</span>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => downloadPortfolioCv(profileDraft)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download My CV (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigateToTab('profile');
                        navigateProfileSubTab('cv');
                      }}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 bg-[#0E1016] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/30 hover:text-white"
                    >
                      CV Toggle &amp; Settings
                    </button>
                    {snapshot.hasRemoteSettings && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setSeedConfirmOpen(true)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
                      >
                        <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                        Re-sync Defaults
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AdminAnalyticsPanel
              dailyAnalytics={snapshot.dailyAnalytics}
              projectAnalytics={snapshot.projectAnalytics}
              inquiries={snapshot.inquiries}
              projects={snapshot.projects}
            />
          )}

          {activeTab === 'profile' && (
            <AdminProfileEditor
              draft={profileDraft}
              saving={saving}
              subTab={activeProfileSubTab}
              onChangeSubTab={navigateProfileSubTab}
              onBack={handleUiBack}
              onChange={setProfileDraft}
              onSave={() =>
                runMutation(
                  () => savePortfolioSettings(profileDraft),
                  'Profile and site copy saved live to Firestore.'
                )
              }
            />
          )}

          {activeTab === 'projects' && (
            <AdminProjectsEditor
              projects={snapshot.projects}
              saving={saving}
              onSubViewChange={handleSubViewChange}
              exitSubViewNonce={exitSubViewNonce}
              closeDialogNonce={closeChildDialogNonce}
              onDialogOpenChange={handleDialogOpenChange}
              onSaveProject={(proj: AdminProjectRecord) =>
                runMutation(
                  () => saveAdminProject(proj).then(() => undefined),
                  `Project "${proj.title}" saved.`
                )
              }
              onDeleteProject={(id: string) =>
                runMutation(() => deleteAdminProject(id), 'Project removed from cloud database.')
              }
            />
          )}

          {activeTab === 'career' && (
            <AdminCareerEditor
              milestones={snapshot.milestones}
              experience={snapshot.experience}
              saving={saving}
              activeSubTab={activeCareerSubTab}
              onChangeSubTab={navigateCareerSubTab}
              onSubViewChange={handleSubViewChange}
              exitSubViewNonce={exitSubViewNonce}
              closeDialogNonce={closeChildDialogNonce}
              onDialogOpenChange={handleDialogOpenChange}
              onSaveMilestone={(item: AdminMilestoneRecord) =>
                runMutation(
                  () => saveAdminMilestone(item).then(() => undefined),
                  `Milestone "${item.title}" saved.`
                )
              }
              onDeleteMilestone={(id: string) =>
                runMutation(() => deleteAdminMilestone(id), 'Milestone deleted.')
              }
              onSaveExperience={(item: AdminExperienceRecord) =>
                runMutation(
                  () => saveAdminExperience(item).then(() => undefined),
                  `Experience "${item.role}" saved.`
                )
              }
              onDeleteExperience={(id: string) =>
                runMutation(() => deleteAdminExperience(id), 'Experience entry deleted.')
              }
            />
          )}

          {activeTab === 'inquiries' && (
            <AdminInquiriesInbox
              inquiries={snapshot.inquiries}
              saving={saving}
              onBack={handleUiBack}
              closeDialogNonce={closeChildDialogNonce}
              onDialogOpenChange={handleDialogOpenChange}
              onUpdateStatus={(id: string, status: InquiryStatus) =>
                runMutation(
                  () => updateAdminInquiryStatus(id, status),
                  `Inquiry marked as "${status}".`
                )
              }
              onDelete={(id: string) =>
                runMutation(() => deleteAdminInquiry(id), 'Inquiry deleted.')
              }
            />
          )}
        </main>
      </div>

      <ConfirmDialog
        open={seedConfirmOpen}
        title="Initialize Cloud Settings Document"
        description="Creates the starter cloud settings record in Firestore so your site profile, theme controls, and analytics can be customized anytime."
        confirmLabel="Initialize Cloud"
        busy={saving}
        onCancel={() => setSeedConfirmOpen(false)}
        onConfirm={async () => {
          await runMutation(
            () => seedDefaultPortfolioToFirestore(profileDraft),
            'Cloud settings initialized cleanly in Firestore!'
          );
          setSeedConfirmOpen(false);
        }}
      />

      <OfflineIndicator />
    </div>
  );
};
