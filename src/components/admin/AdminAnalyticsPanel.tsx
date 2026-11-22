import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Eye,
  FolderKanban,
  Globe2,
  MousePointerClick,
  Send,
  Users,
} from 'lucide-react';
import type {
  AdminProjectRecord,
  DailyAnalyticsRecord,
  DemographicRecord,
  InquiryRecord,
  PresenceSessionRecord,
  ProjectAnalyticsRecord,
} from '../../firebaseAdmin';
import { countryCodeToFlag } from '../../utils/visitorGeo';
import { getAdminCopy, type AdminLang } from './adminI18n';
import { AnimatedCounter } from './AnimatedCounter';

interface AdminAnalyticsPanelProps {
  dailyAnalytics: DailyAnalyticsRecord[];
  projectAnalytics: ProjectAnalyticsRecord[];
  inquiries: InquiryRecord[];
  projects: AdminProjectRecord[];
  presenceSessions?: PresenceSessionRecord[];
  demographics?: DemographicRecord[];
  analyticsError?: string | null;
  lang?: AdminLang;
}

const LIVE_ACTIVE_WINDOW_MS = 75_000;

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
  presenceSessions = [],
  demographics = [],
  analyticsError = null,
  lang = 'en',
}) => {
  const t = getAdminCopy(lang);
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  const [nowClockMs, setNowClockMs] = useState(() => Date.now());

  // Tick every 10s so stale sessions automatically expire out of "Live Right Now" without refresh
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowClockMs(Date.now());
    }, 10_000);
    return () => window.clearInterval(id);
  }, []);

  const liveSessions = useMemo(
    () => presenceSessions.filter((s) => nowClockMs - s.lastSeenAtMs <= LIVE_ACTIVE_WINDOW_MS),
    [presenceSessions, nowClockMs]
  );

  const liveCountries = useMemo(() => {
    const counts = new Map<string, { code: string; name: string; count: number }>();
    liveSessions.forEach((s) => {
      const key = s.countryCode || 'INTL';
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          code: key,
          name: s.countryName || key,
          count: 1,
        });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [liveSessions]);

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
      });
    }
    return rows;
  }, [dailyAnalytics]);

  const monthlyBars = useMemo(() => {
    const grouped = new Map<
      string,
      { visitors: number; interactions: number; pageViews: number }
    >();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      grouped.set(ym, { visitors: 0, interactions: 0, pageViews: 0 });
    }

    dailyAnalytics.forEach((rec) => {
      const cur = grouped.get(rec.month) ?? { visitors: 0, interactions: 0, pageViews: 0 };
      cur.visitors += rec.visitors;
      cur.interactions += rec.projectClicks + rec.hireOpens + rec.cvDownloads;
      cur.pageViews += rec.pageViews;
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
    () => Math.max(1, ...activeBars.map((b) => Math.max(b.visitors, b.interactions, b.pageViews))),
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

  const countryStats = useMemo(() => {
    const rows = demographics
      .filter((d) => d.bucketType === 'country' && d.count > 0)
      .sort((a, b) => b.count - a.count);
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return { rows: rows.slice(0, 10), total };
  }, [demographics]);

  const maxProjectClicks = Math.max(1, ...rankedProjects.map((p) => p.clicks));

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
          {t.analytics.heading}
        </h1>
      </div>

      {analyticsError && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200"
        >
          {analyticsError}
        </div>
      )}

      {/* Live Active Viewers Card */}
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#090A0F] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                liveSessions.length > 0 ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              {t.analytics.liveNowTitle}
            </p>
          </div>
          {liveCountries.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {liveCountries.map((c) => (
                <span
                  key={c.code}
                  className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#0D0F14] px-2 py-0.5 text-xs text-zinc-200"
                >
                  <span aria-hidden="true">{countryCodeToFlag(c.code)}</span>
                  <span>{c.name}</span>
                  <span className="font-mono text-emerald-300 tabular-nums">({c.count})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 font-mono text-[11px] text-zinc-500">
              {t.analytics.noActiveViewers}
            </p>
          )}
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="font-display text-3xl font-bold leading-none tabular-nums text-white">
            <AnimatedCounter value={liveSessions.length} />
          </div>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t.analytics.todayVisitors}</span>
            <Users className="h-4 w-4 text-accent-light" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            <AnimatedCounter value={summary.todayVisitors} />
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
            <AnimatedCounter value={summary.todayViews} /> {t.analytics.pageViewsToday}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t.analytics.monthVisitors}</span>
            <Eye className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            <AnimatedCounter value={summary.monthVisitors} />
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
            <AnimatedCounter value={summary.monthViews} /> {t.analytics.monthlyViewsAllTime}{' '}
            <AnimatedCounter value={summary.totalVisitors} /> {t.overview.totalSuffix}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t.analytics.projectClicks}</span>
            <MousePointerClick className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            <AnimatedCounter value={summary.totalProjectClicks} />
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
            {rankedProjects[0] && rankedProjects[0].clicks > 0
              ? `${rankedProjects[0].title} (${rankedProjects[0].clicks})`
              : t.analytics.noClicks}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t.analytics.hireSubmissions}</span>
            <Send className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            <AnimatedCounter value={summary.totalHireSubmits} />
            <span className="ml-1.5 text-sm font-normal text-zinc-400">
              / <AnimatedCounter value={summary.totalHireOpens} /> {t.analytics.opensSuffix}
            </span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
            {summary.hireConvRate}% {t.analytics.conversionCv}{' '}
            <AnimatedCounter value={summary.totalCvDownloads} />
          </p>
        </div>
      </div>

      {/* Visitor Countries */}
      <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">{t.analytics.countriesTitle}</h2>
          </div>
          <span className="font-mono text-xs text-zinc-400 tabular-nums">
            <AnimatedCounter value={countryStats.total} /> {t.overview.totalSuffix}
          </span>
        </div>

        {countryStats.rows.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500">{t.analytics.noCountryData}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
            {countryStats.rows.map((country) => {
              const pct =
                countryStats.total > 0
                  ? Math.round((country.count / countryStats.total) * 100)
                  : 0;
              return (
                <div key={country.bucketId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 font-medium text-zinc-100">
                      <span className="text-base leading-none" aria-hidden="true">
                        {countryCodeToFlag(country.code)}
                      </span>
                      <span>{country.label}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{country.code}</span>
                    </span>
                    <span className="font-mono text-xs text-[#38BDF8] tabular-nums">
                      <AnimatedCounter value={country.count} /> ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#38BDF8] transition-all duration-300"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Traffic Chart + Top Projects */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-light" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">
                {chartMode === 'daily'
                  ? t.analytics.dailyTrafficTitle
                  : t.analytics.monthlyTrafficTitle}
              </h2>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-[#050507] p-1">
              <button
                type="button"
                onClick={() => setChartMode('daily')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartMode === 'daily' ? 'bg-accent text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t.analytics.dailyBtn}
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
                {t.analytics.monthlyBtn}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
              {t.analytics.uniqueVisitors}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#38BDF8]" />
              {t.analytics.interactionsLabel}
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
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
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
              {t.analytics.emptyTraffic}
            </p>
          )}
        </div>

        {/* Top Clicked Projects Leaderboard */}
        <div className="rounded-lg border border-white/10 bg-[#090A0F] p-4 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-accent-light" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">{t.analytics.mostClickedTitle}</h2>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">Top {rankedProjects.length}</span>
          </div>

          {rankedProjects.length === 0 ? (
            <p className="mt-4 text-xs text-zinc-400">{t.analytics.noTrackedProjects}</p>
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
                        <AnimatedCounter value={proj.clicks} /> {t.analytics.clicksLabel}
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
    </div>
  );
};
