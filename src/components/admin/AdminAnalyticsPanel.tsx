import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Download,
  Eye,
  FolderKanban,
  MousePointerClick,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {
  AdminProjectRecord,
  DailyAnalyticsRecord,
  InquiryRecord,
  ProjectAnalyticsRecord,
} from '../../firebase';

interface AdminAnalyticsPanelProps {
  dailyAnalytics: DailyAnalyticsRecord[];
  projectAnalytics: ProjectAnalyticsRecord[];
  inquiries: InquiryRecord[];
  projects: AdminProjectRecord[];
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  if (!y || !m) return ym;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number.parseInt(m, 10) - 1;
  return `${monthNames[idx] ?? m} '${y.slice(2)}`;
}

export const AdminAnalyticsPanel: React.FC<AdminAnalyticsPanelProps> = ({
  dailyAnalytics,
  projectAnalytics,
  inquiries,
  projects,
}) => {
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const currentMonthKey = todayKey.slice(0, 7);

  const summary = useMemo(() => {
    const todayRec = dailyAnalytics.find((d) => d.date === todayKey);
    const monthRecords = dailyAnalytics.filter((d) => d.month === currentMonthKey);

    const monthVisitors = monthRecords.reduce((acc, r) => acc + r.visitors, 0);
    const monthViews = monthRecords.reduce((acc, r) => acc + r.pageViews, 0);

    const totalVisitors = dailyAnalytics.reduce((acc, r) => acc + r.visitors, 0);
    const totalViews = dailyAnalytics.reduce((acc, r) => acc + r.pageViews, 0);
    const totalProjectClicks = dailyAnalytics.reduce((acc, r) => acc + r.projectClicks, 0);
    const totalHireOpens = dailyAnalytics.reduce((acc, r) => acc + r.hireOpens, 0);
    const totalHireSubmits = dailyAnalytics.reduce((acc, r) => acc + r.hireSubmits, 0);
    const totalCvDownloads = dailyAnalytics.reduce((acc, r) => acc + r.cvDownloads, 0);

    const effectiveSubmits = Math.max(totalHireSubmits, inquiries.length);
    const hireConvRate =
      totalHireOpens > 0
        ? Math.min(100, Math.round((effectiveSubmits / totalHireOpens) * 100))
        : effectiveSubmits > 0
          ? 100
          : 0;

    return {
      todayVisitors: todayRec?.visitors ?? 0,
      todayViews: todayRec?.pageViews ?? 0,
      monthVisitors,
      monthViews,
      totalVisitors,
      totalViews,
      totalProjectClicks,
      totalHireOpens,
      totalHireSubmits: effectiveSubmits,
      hireConvRate,
      totalCvDownloads,
    };
  }, [dailyAnalytics, todayKey, currentMonthKey, inquiries.length]);

  const dailyBars = useMemo(() => {
    const byDate = new Map(dailyAnalytics.map((r) => [r.date, r]));
    const rows: Array<{
      key: string;
      label: string;
      visitors: number;
      interactions: number;
      pageViews: number;
      hireOpens: number;
      hireSubmits: number;
    }> = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const rec = byDate.get(iso);
      const visitors = rec?.visitors ?? 0;
      const interactions =
        (rec?.projectClicks ?? 0) + (rec?.hireOpens ?? 0) + (rec?.cvDownloads ?? 0);
      rows.push({
        key: iso,
        label: formatShortDate(iso),
        visitors,
        interactions,
        pageViews: rec?.pageViews ?? 0,
        hireOpens: rec?.hireOpens ?? 0,
        hireSubmits: rec?.hireSubmits ?? 0,
      });
    }
    return rows;
  }, [dailyAnalytics]);

  const monthlyBars = useMemo(() => {
    const grouped = new Map<
      string,
      {
        visitors: number;
        interactions: number;
        pageViews: number;
        hireOpens: number;
        hireSubmits: number;
      }
    >();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      grouped.set(ym, {
        visitors: 0,
        interactions: 0,
        pageViews: 0,
        hireOpens: 0,
        hireSubmits: 0,
      });
    }

    dailyAnalytics.forEach((rec) => {
      const cur = grouped.get(rec.month) ?? {
        visitors: 0,
        interactions: 0,
        pageViews: 0,
        hireOpens: 0,
        hireSubmits: 0,
      };
      cur.visitors += rec.visitors;
      cur.interactions += rec.projectClicks + rec.hireOpens + rec.cvDownloads;
      cur.pageViews += rec.pageViews;
      cur.hireOpens += rec.hireOpens;
      cur.hireSubmits += rec.hireSubmits;
      grouped.set(rec.month, cur);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, stats]) => ({
        key: ym,
        label: formatMonthLabel(ym),
        ...stats,
      }));
  }, [dailyAnalytics, now]);

  const activeBars = chartMode === 'daily' ? dailyBars : monthlyBars;
  const maxBarValue = useMemo(
    () =>
      Math.max(
        1,
        ...activeBars.map((b) => Math.max(b.visitors, b.interactions, b.pageViews))
      ),
    [activeBars]
  );

  const rankedProjects = useMemo(() => {
    const byId = new Map(projectAnalytics.map((p) => [p.projectId, p]));
    const merged = new Map<string, ProjectAnalyticsRecord>();

    projectAnalytics.forEach((p) => {
      merged.set(p.projectId, p);
    });
    projects.forEach((p) => {
      if (!merged.has(p.id)) {
        merged.set(p.id, {
          projectId: p.id,
          title: p.title,
          category: p.category,
          clicks: byId.get(p.id)?.clicks ?? 0,
        });
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 8);
  }, [projectAnalytics, projects]);

  const maxProjectClicks = Math.max(1, ...rankedProjects.map((p) => p.clicks));

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              LIVE VISITOR &amp; PROJECT ANALYTICS
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Real-time daily &amp; monthly traffic, most clicked project cards, and Hire Me
              conversion funnel.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] font-medium text-emerald-300">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Live Firestore Counters
          </span>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Today Visitors</span>
            <Users className="h-4 w-4 text-accent-light" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-white tabular-nums">
            {summary.todayVisitors}
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
            {summary.todayViews} page views today
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>This Month Visitors</span>
            <Eye className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-white tabular-nums">
            {summary.monthVisitors}
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
            {summary.monthViews} monthly views · {summary.totalVisitors} all-time
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Project Card Clicks</span>
            <MousePointerClick className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-white tabular-nums">
            {summary.totalProjectClicks}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
            {rankedProjects[0] && rankedProjects[0].clicks > 0
              ? `Top: ${rankedProjects[0].title} (${rankedProjects[0].clicks})`
              : 'Waiting for card clicks'}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Hire Me Submissions</span>
            <Send className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-white tabular-nums">
            {summary.totalHireSubmits}
            <span className="ml-1.5 text-sm font-normal text-zinc-400">
              / {summary.totalHireOpens} opens
            </span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
            {summary.hireConvRate}% conversion · {summary.totalCvDownloads} CV downloads
          </p>
        </div>
      </div>

      {/* Traffic Chart + Top Projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily / Monthly Traffic Chart */}
        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-light" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">
                {chartMode === 'daily' ? 'Daily Traffic (Last 14 Days)' : 'Monthly Traffic (6 Months)'}
              </h2>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-[#050507] p-1">
              <button
                type="button"
                onClick={() => setChartMode('daily')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartMode === 'daily'
                    ? 'bg-accent text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Daily (14d)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('monthly')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartMode === 'monthly'
                    ? 'bg-accent text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
              Unique Visitors
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#38BDF8]" />
              Card Clicks + Hire Opens + CV
            </span>
          </div>

          <div className="mt-5 flex h-56 items-end gap-1.5 sm:gap-2.5">
            {activeBars.map((bar) => {
              const vHeight = Math.round((bar.visitors / maxBarValue) * 100);
              const iHeight = Math.round((bar.interactions / maxBarValue) * 100);
              return (
                <div
                  key={bar.key}
                  title={`${bar.key}: ${bar.visitors} visitors, ${bar.pageViews} views, ${bar.interactions} interactions`}
                  className="group flex flex-1 flex-col items-center justify-end gap-1.5 h-full min-w-0"
                >
                  <div className="flex w-full flex-1 items-end justify-center gap-1 rounded-t bg-white/[0.02] px-0.5 pt-2">
                    <div
                      className="w-1/2 max-w-[14px] rounded-t bg-accent transition-all duration-300 group-hover:opacity-90"
                      style={{
                        height: `${bar.visitors > 0 ? Math.max(8, vHeight) : 2}%`,
                        opacity: bar.visitors > 0 ? 1 : 0.2,
                      }}
                    />
                    <div
                      className="w-1/2 max-w-[14px] rounded-t bg-[#38BDF8] transition-all duration-300 group-hover:opacity-90"
                      style={{
                        height: `${bar.interactions > 0 ? Math.max(8, iHeight) : 2}%`,
                        opacity: bar.interactions > 0 ? 0.9 : 0.18,
                      }}
                    />
                  </div>
                  <span className="truncate font-mono text-[10px] text-zinc-500 group-hover:text-zinc-200 tabular-nums">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>

          {dailyAnalytics.length === 0 && (
            <p className="mt-4 rounded-lg border border-white/10 bg-[#050507] px-3.5 py-2.5 text-xs text-zinc-400">
              Live traffic bars fill automatically as real visitors open your public website.
            </p>
          )}
        </div>

        {/* Top Clicked Projects Leaderboard */}
        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-accent-light" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">Most Clicked Projects</h2>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">Top {rankedProjects.length}</span>
          </div>

          {rankedProjects.length === 0 ? (
            <p className="mt-4 text-xs text-zinc-400">
              No projects tracked yet. Once visitors inspect project cards, rankings appear here.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {rankedProjects.map((proj, idx) => {
                const widthPct = Math.round((proj.clicks / maxProjectClicks) * 100);
                return (
                  <div key={proj.projectId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-zinc-500 tabular-nums">
                          #{idx + 1}
                        </span>
                        <span className="truncate font-medium text-zinc-100">{proj.title}</span>
                        <span className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400 sm:inline">
                          {proj.category}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-semibold text-accent-light tabular-nums">
                        {proj.clicks} clicks
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${proj.clicks > 0 ? Math.max(6, widthPct) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hire Me Funnel & CV Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>Hire Me Funnel</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xs text-zinc-300">Modal Opens</span>
            <span className="font-mono text-sm font-semibold text-white tabular-nums">
              {summary.totalHireOpens}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xs text-zinc-300">Submitted Briefs</span>
            <span className="font-mono text-sm font-semibold text-emerald-300 tabular-nums">
              {summary.totalHireSubmits}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${summary.hireConvRate}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Download className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
            <span>Resume / CV Downloads</span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-white tabular-nums">
            {summary.totalCvDownloads}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Counts visitor CV downloads whenever public CV download is switched ON.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#090A0F] p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Eye className="h-4 w-4 text-accent-light" aria-hidden="true" />
            <span>All-Time Page Views</span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-white tabular-nums">
            {summary.totalViews}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Across {dailyAnalytics.length} recorded day(s) of public traffic.
          </p>
        </div>
      </div>
    </div>
  );
};
