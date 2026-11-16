import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Award,
  Briefcase,
  CloudUpload,
  ExternalLink,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useRefreshPortfolioContent } from '../../context/PortfolioContentContext';
import type { PortfolioContentBundle } from '../../data/contentSchema';
import { DEFAULT_PORTFOLIO_CONTENT } from '../../data/portfolioData';
import {
  deleteAdminExperience,
  deleteAdminInquiry,
  deleteAdminMilestone,
  deleteAdminProject,
  fetchAdminDashboardSnapshot,
  OWNER_ADMIN_EMAIL,
  saveAdminExperience,
  saveAdminMilestone,
  saveAdminProject,
  savePortfolioSettings,
  seedDefaultPortfolioToFirestore,
  signInAdminWithGoogle,
  signOutAdmin,
  subscribeAdminAuth,
  updateAdminInquiryStatus,
  verifyAdminAccess,
  type AdminDashboardSnapshot,
  type AdminExperienceRecord,
  type AdminMilestoneRecord,
  type AdminProjectRecord,
  type InquiryStatus,
} from '../../firebase';
import { AdminCareerEditor } from './AdminCareerEditor';
import { AdminInquiriesInbox } from './AdminInquiriesInbox';
import { AdminProfileEditor } from './AdminProfileEditor';
import { AdminProjectsEditor } from './AdminProjectsEditor';
import { ConfirmDialog, StatusNotice } from './FieldControls';

type AdminTab = 'overview' | 'profile' | 'projects' | 'career' | 'inquiries';

interface AdminDashboardProps {
  onOpenViewerPreview: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenViewerPreview }) => {
  const refreshPublicPortfolio = useRefreshPortfolioContent();

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);

  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot>({
    hasRemoteSettings: false,
    settingsBundle: DEFAULT_PORTFOLIO_CONTENT,
    projects: [],
    milestones: [],
    experience: [],
    inquiries: [],
  });

  const [profileDraft, setProfileDraft] = useState<PortfolioContentBundle>(DEFAULT_PORTFOLIO_CONTENT);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'SHANTO Admin — Portfolio Studio';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await fetchAdminDashboardSnapshot();
      setSnapshot(data);
      setProfileDraft(data.settingsBundle);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load cloud portfolio data.';
      setNotice({ type: 'error', text: msg });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAdminAuth(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setAuthorized(false);
        setAuthReady(true);
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
  }, [loadDashboard]);

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInAdminWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in could not complete.';
      setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOutAdmin();
      await signInAdminWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account switch failed.';
      setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  };

  const runMutation = async (fn: () => Promise<void>, successText: string) => {
    setSaving(true);
    setNotice(null);
    try {
      await fn();
      await loadDashboard();
      await refreshPublicPortfolio();
      setNotice({ type: 'success', text: successText });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed. Please retry.';
      setNotice({ type: 'error', text: msg });
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

  // Loading Auth Gate
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

  // Signed-out or Unauthorized Gate
  if (!user || !authorized) {
    return (
      <div className="design-grid-bg flex min-h-screen flex-col justify-between bg-[#050507] px-6 py-10 text-[#F4F4F5]">
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <span className="font-display text-xl font-bold tracking-tight text-white">
            SHANTO<span className="text-[#DC2626]">.</span> ADMIN
          </span>
          <button
            type="button"
            onClick={onOpenViewerPreview}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            View Public Portfolio
          </button>
        </header>

        <main className="mx-auto my-auto w-full max-w-md rounded-2xl border border-white/12 bg-[#0B0C10] p-7 shadow-2xl sm:p-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 text-[#EF4444]">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-white">
            PORTFOLIO ADMIN ACCESS
          </h1>

          {user && !authorized ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-zinc-300">
                Signed in as <span className="font-mono text-white">{user.email}</span>, which does
                not have administrator permission.
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                Sign in with the verified owner account{' '}
                <span className="font-mono text-zinc-200">{OWNER_ADMIN_EMAIL}</span> to manage
                portfolio content and view client briefs.
              </p>
              {authError && (
                <p className="rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs text-red-200">
                  {authError}
                </p>
              )}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleSwitchAccount}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
                >
                  {authBusy ? 'Opening Google Sign-In...' : 'Switch Google Account'}
                </button>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signOutAdmin()}
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <p className="text-sm leading-relaxed text-zinc-300">
                Sign in with your verified Google account to edit personal details, publish
                websites, apps &amp; games, and reply to client inquiries.
              </p>

              <div className="rounded-lg border border-white/10 bg-[#070709] p-3.5 text-xs text-zinc-400">
                Owner email: <span className="font-mono text-zinc-200">{OWNER_ADMIN_EMAIL}</span>
              </div>

              {authError && (
                <p className="rounded-md border border-[#DC2626]/40 bg-[#DC2626]/10 p-3 text-xs text-red-200">
                  {authError}
                </p>
              )}

              <button
                type="button"
                disabled={authBusy}
                onClick={handleGoogleLogin}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-md bg-[#DC2626] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {authBusy ? 'Signing In...' : 'Continue with Google'}
              </button>
            </div>
          )}
        </main>

        <footer className="mx-auto w-full max-w-4xl text-center text-xs text-zinc-500">
          Protected by Firebase Authentication &amp; Zero-Trust Firestore Security Rules
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#F4F4F5] lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-[#08090D] p-5 lg:flex">
        <div>
          <div className="border-b border-white/10 pb-5">
            <span className="font-display text-xl font-bold tracking-tight text-white">
              SHANTO<span className="text-[#DC2626]">.</span> ADMIN
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
                  onClick={() => setActiveTab(item.id)}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-md px-3.5 py-2 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#DC2626] text-white'
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
          <button
            type="button"
            onClick={onOpenViewerPreview}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Preview Live Site
          </button>
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="font-display text-lg font-bold tracking-tight text-white lg:hidden">
                SHANTO<span className="text-[#DC2626]">.</span> ADMIN
              </span>
              <span className="hidden text-xs font-medium text-zinc-400 lg:inline">
                Portfolio Control Center /{' '}
                <span className="text-white">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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

              <button
                type="button"
                onClick={onOpenViewerPreview}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 lg:hidden whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Live Site
              </button>

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

          {/* Mobile Navigation Scroll Strip */}
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
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#DC2626] text-white'
                      : 'border border-white/10 bg-[#0B0C10] text-zinc-300'
                  }`}
                >
                  {item.label}
                  {typeof item.badge === 'number' ? ` (${item.badge})` : ''}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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

              {/* Metrics Row */}
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

              {/* Quick Actions */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <h2 className="text-sm font-semibold text-white">Quick Shortcuts</h2>
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <UserCog className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Edit Name, Photo &amp; Bio
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <FolderKanban className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Add / Update Projects
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('career')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <Briefcase className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Milestones &amp; Experience
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inquiries')}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-white/10 bg-[#0E1016] px-3.5 py-2 text-left text-xs font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      <Inbox className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
                      Open Inquiries ({snapshot.inquiries.length})
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
                  <h2 className="text-sm font-semibold text-white">Domain &amp; Layout Safety</h2>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                    <li>
                      Viewer Website:{' '}
                      <span className="font-mono text-zinc-200">sbshanto.web.app</span>
                    </li>
                    <li>
                      Admin Portal:{' '}
                      <span className="font-mono text-zinc-200">sbadminshanto.web.app</span>
                    </li>
                    <li>
                      Cloud Sync Status:{' '}
                      <span
                        className={
                          snapshot.hasRemoteSettings ? 'text-emerald-400' : 'text-zinc-300'
                        }
                      >
                        {snapshot.hasRemoteSettings ? 'Live Cloud Profile Active' : 'Using Built-in Defaults'}
                      </span>
                    </li>
                    <li>
                      Every text field, URL, and image slot is auto-validated so viewer cards and
                      mobile animations never overflow.
                    </li>
                  </ul>
                  {snapshot.hasRemoteSettings && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setSeedConfirmOpen(true)}
                      className="mt-4 inline-flex min-h-[38px] items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
                    >
                      <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                      Re-sync Default Items
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <AdminProfileEditor
              draft={profileDraft}
              saving={saving}
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
        title="Sync Default Portfolio to Cloud"
        description="This writes your current default profile, 6 projects, 6 milestones, and 4 timeline entries into Cloud Firestore so you can customize or toggle them anytime."
        confirmLabel="Sync to Firestore"
        busy={saving}
        onCancel={() => setSeedConfirmOpen(false)}
        onConfirm={async () => {
          await runMutation(
            () => seedDefaultPortfolioToFirestore(DEFAULT_PORTFOLIO_CONTENT),
            'Default portfolio synced to Firestore. Everything is now live-editable!'
          );
          setSeedConfirmOpen(false);
        }}
      />
    </div>
  );
};
