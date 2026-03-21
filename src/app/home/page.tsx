"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  IconLayoutDashboard, IconTrophy, IconUsers, IconChartBar,
  IconSettings, IconSearch, IconPlayerPlay, IconBolt, IconLogout,
  IconMedal, IconMessageCircle, IconFlame, IconArrowUpRight, IconChevronRight,
  IconMenu2, IconX, IconCode, IconBrandGithub, IconLoader2,
  IconExternalLink, IconCheck, IconClock,
} from "@tabler/icons-react";
import { NotificationBell } from "@/components/social-grind/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Leaderboard from "@/components/social-grind/Leaderboard";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

/* ── Types ──────────────────────────────────────────── */
interface ChallengeStats { totalPoints: number; completedCount: number }
interface GitHubStatus { hasUsername: boolean; githubUsername?: string; committedToday?: boolean; commitCount?: number; streak?: number }
interface WakaData { totalSecondsToday?: number; error?: string }
interface DsaDaily { title: string; difficulty: string; tags: string[]; acRate: number; leetcodeUrl: string; questionId: string }
interface OnlineUser { _id: string; name: string; image?: string }
interface Challenge { id: string; title: string; icon: string; points: number; difficulty: string }

/* ── Helpers ─────────────────────────────────────────── */
function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function getHour() { return new Date().getHours(); }
function greet(name: string) {
  const h = getHour();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${g}, ${name}`;
}

/* ── Live avatar ──────────────────────────────────────── */
function UserAvatar({ userId, sessionImage, userName }: { userId: string; sessionImage?: string | null; userName: string }) {
  const [src, setSrc] = useState<string | null>(sessionImage ?? null);
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/avatar`).then(r => r.json()).then(d => { if (d.image) setSrc(d.image); }).catch(() => {});
  }, [userId]);
  return (
    <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-[#0e0e13] hover:ring-primary/60 transition-all cursor-pointer flex-shrink-0">
      <AvatarImage src={src ?? undefined} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

const NAV_ITEMS = [
  { icon: IconLayoutDashboard, label: "Dashboard",  href: "/home" },
  { icon: IconTrophy,           label: "Challenges", href: "/challenges" },
  { icon: IconMessageCircle,    label: "Chat",       href: "/chat" },
  { icon: IconUsers,            label: "Discover",   href: "/users" },
  { icon: IconChartBar,         label: "Stats",      href: "/stats" },
  { icon: IconSettings,         label: "Settings",   href: "#" },
];
const MOBILE_NAV = [
  { icon: IconLayoutDashboard, label: "Home",       href: "/home" },
  { icon: IconTrophy,           label: "Challenges", href: "/challenges" },
  { icon: IconChartBar,         label: "Stats",      href: "/stats" },
  { icon: IconUsers,            label: "Discover",   href: "/users" },
];

/* ── Tier helper ─────────────────────────────────────── */
const TIERS = [
  { min: 5000, label: "Legend",   color: "#f59e0b" },
  { min: 2000, label: "Diamond",  color: "#22d3ee" },
  { min: 800,  label: "Platinum", color: "#a78bfa" },
  { min: 350,  label: "Gold",     color: "#fbbf24" },
  { min: 0,    label: "Grinder",  color: "#64748b" },
];
function getTier(xp: number) { return TIERS.find(t => xp >= t.min)!; }

/* ── KPI Card ─────────────────────────────────────────── */
function KpiCard({ label, value, chip, chipColor, loading = false }: {
  label: string; value: string; chip: string;
  chipColor: "blue" | "green" | "orange" | "purple"; loading?: boolean;
}) {
  const cls = {
    blue:   "bg-primary/70 text-primary bg-primary/10 border-primary/20",
    green:  "bg-emerald-500/70 text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    orange: "bg-orange-400/70 text-orange-400 bg-orange-400/10 border-orange-400/20",
    purple: "bg-violet-500/70 text-violet-400 bg-violet-500/10 border-violet-500/20",
  }[chipColor];
  const [bar, ...rest] = cls.split(" ");
  return (
    <div className="bg-[#1b1b20] rounded-xl p-3 sm:p-4 relative overflow-hidden hover:bg-[#1f1f26] transition-colors group">
      <div className={cn("absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full", bar)} />
      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-2 pl-2">{label}</p>
      <div className="pl-2 flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-2">
        {loading ? (
          <div className="h-7 w-20 bg-white/[0.07] rounded-lg animate-pulse" />
        ) : (
          <span className="text-lg sm:text-2xl font-black text-[#e4e1e9] tabular-nums tracking-tight leading-none">{value}</span>
        )}
        <span className={cn("text-[8px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-wider self-start sm:self-auto whitespace-nowrap border", rest.join(" "))}>
          {chip}
        </span>
      </div>
    </div>
  );
}

/* ── Global Cache (Client-side) ───────────────────────── */
let _dashboardCache: {
  challengeStats?: ChallengeStats;
  ghStatus?: GitHubStatus;
  waka?: WakaData | null;
  rank?: number | null;
  onlineCount?: number;
  dsaDaily?: DsaDaily | null;
  challenges?: Challenge[];
  recentActivity?: any[];
  focusData?: { day: string; h: number; count: number }[];
  weeklyCommits?: number;
  lastFetched?: number;
} | null = null;

/* ══ Main Page ══════════════════════════════════════════ */
export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  /* UI state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBar, setActiveBar] = useState(6); // default highlight today (index 6 = Sun placeholder)

  /* Data state (initialize from cache if available) */
  const [challengeStats, setChallengeStats] = useState<ChallengeStats | null>(_dashboardCache?.challengeStats ?? null);
  const [ghStatus, setGhStatus] = useState<GitHubStatus | null>(_dashboardCache?.ghStatus ?? null);
  const [waka, setWaka] = useState<WakaData | null>(_dashboardCache?.waka ?? null);
  const [rank, setRank] = useState<number | null>(_dashboardCache?.rank ?? null);
  const [onlineCount, setOnlineCount] = useState<number>(_dashboardCache?.onlineCount ?? 0);
  const [dsaDaily, setDsaDaily] = useState<DsaDaily | null>(_dashboardCache?.dsaDaily ?? null);
  const [challenges, setChallenges] = useState<Challenge[]>(_dashboardCache?.challenges ?? []);
  const [recentActivity, setRecentActivity] = useState<any[]>(_dashboardCache?.recentActivity ?? []);
  const [focusData, setFocusData] = useState<{ day: string; h: number; count: number }[]>(_dashboardCache?.focusData ?? []);
  const [weeklyCommits, setWeeklyCommits] = useState<number>(_dashboardCache?.weeklyCommits ?? 0);
  const [loading, setLoading] = useState(!_dashboardCache);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  /* Heartbeat + fetch data */
  const fetchAll = useCallback(async () => {
    if (!session?.user?.id) return;
    
    // Heartbeat every time we hit the page
    fetch("/api/users/heartbeat", { method: "POST" }).catch(() => {});

    // Cache hit: valid for 60 seconds
    // Bust early if: weekly commits are stale zeros, OR today's commitCount is 0 despite GitHub being linked
    const now = Date.now();
    const staleCommits = _dashboardCache?.weeklyCommits === 0 && _dashboardCache?.ghStatus?.hasUsername;
    const staleToday = _dashboardCache?.ghStatus?.hasUsername && !_dashboardCache?.ghStatus?.commitCount;
    if (_dashboardCache && now - (_dashboardCache.lastFetched ?? 0) < 60000 && !staleCommits && !staleToday) {
      setLoading(false);
      return; 
    }

    if (!_dashboardCache) setLoading(true);
    
    // Temporary object to build the new cache
    const newCache: typeof _dashboardCache = { lastFetched: Date.now() };

    await Promise.allSettled([
      // XP + completions
      fetch("/api/challenges/my-stats").then(r => r.json()).then(d => {
        const p = { totalPoints: d.totalPoints ?? 0, completedCount: d.completedCount ?? 0 };
        const act = d.recentCompletions?.slice(0, 3) ?? [];
        setChallengeStats(p); setRecentActivity(act);
        newCache.challengeStats = p; newCache.recentActivity = act;
      }),
      // GitHub status
      fetch("/api/github/commits").then(r => r.json()).then(d => {
        setGhStatus(d); newCache.ghStatus = d;
      }),
      // WakaTime
      fetch("/api/challenges/wakatime").then(r => r.json()).then(d => {
        setWaka(d); newCache.waka = d;
      }),
      // Leaderboard rank
      fetch("/api/leaderboard").then(r => r.json()).then(d => {
        const idx = d.leaderboard?.findIndex((e: any) => e.id === session.user.id);
        const rnk = (idx !== undefined && idx !== -1) ? idx + 1 : null;
        setRank(rnk); newCache.rank = rnk;
      }),
      // Online devs
      fetch("/api/users/heartbeat").then(r => r.json()).then(d => {
        const count = (d.users?.length ?? 0) + 1;
        setOnlineCount(count); newCache.onlineCount = count;
      }),
      // Daily DSA
      fetch("/api/dsa/daily").then(r => r.json()).then(d => {
        setDsaDaily(d); newCache.dsaDaily = d;
      }),
      // Challenges list
      fetch("/api/challenges").then(r => r.json()).then(d => {
        const ch = d.challenges?.slice(0, 3) ?? [];
        setChallenges(ch); newCache.challenges = ch;
      }),
      // Real weekly activity from GitHub contributions
      fetch(`/api/github/contributions?userId=${session.user.id}`).then(r => r.json()).then(d => {
        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        // Flatten all days from weeks
        const allDays: { date: string; count: number }[] = [];
        if (d.weeks) {
          for (const week of d.weeks) for (const day of week) allDays.push(day);
        }
        // Get last 7 calendar days (today = index 6)
        const today = new Date();
        const last7: { day: string; count: number }[] = [];
        // Helper: format date as YYYY-MM-DD in LOCAL timezone (not UTC)
        const localISO = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        };
        for (let i = 6; i >= 0; i--) {
          const d2 = new Date(today);
          d2.setDate(today.getDate() - i);
          const iso = localISO(d2);
          const found = allDays.find(a => a.date === iso);
          last7.push({ day: DAY_LABELS[d2.getDay()], count: found?.count ?? 0 });
        }
        const maxCount = Math.max(...last7.map(x => x.count), 1);
        const fd = last7.map(x => ({
          day: x.day,
          count: x.count,
          h: Math.max(4, Math.round((x.count / maxCount) * 100)), // minimum 4% height so bar is visible
        }));
        const total = last7.reduce((s, x) => s + x.count, 0);
        setFocusData(fd); newCache.focusData = fd;
        setWeeklyCommits(total); newCache.weeklyCommits = total;
      }).catch(() => {
        // If no GitHub linked, keep empty bars
        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date().getDay();
        const fd = Array.from({ length: 7 }, (_, i) => {
          const dayIdx = (today - 6 + i + 7) % 7;
          return { day: DAY_LABELS[dayIdx], count: 0, h: 4 };
        });
        setFocusData(fd); newCache.focusData = fd;
        setWeeklyCommits(0); newCache.weeklyCommits = 0;
      }),
    ]);

    setActiveBar(6);
    _dashboardCache = newCache;
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Heartbeat every 60s
  useEffect(() => {
    const t = setInterval(() => { fetch("/api/users/heartbeat", { method: "POST" }).catch(() => {}); }, 60_000);
    return () => clearInterval(t);
  }, []);

  if (status === "loading") return (
    <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;

  const firstName = session.user?.name?.split(" ")[0] || "Dev";
  const userId    = session.user?.id;
  const userName  = session.user?.name || "User";
  const userImage = session.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`;

  const xp      = challengeStats?.totalPoints ?? 0;
  const solved  = challengeStats?.completedCount ?? 0;
  const streak  = ghStatus?.streak ?? 0;
  const wakaOk  = waka && !waka.error && waka.totalSecondsToday !== undefined;
  const tier    = getTier(xp);

  return (
    <div className="flex min-h-screen bg-[#0e0e13] text-[#e4e1e9]">

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className={cn(
        "fixed lg:sticky top-0 h-screen z-50 flex-shrink-0 flex flex-col",
        "bg-[#0e0e13] border-r border-white/[0.06] w-64 lg:w-56 xl:w-60",
        "py-5 px-3 lg:px-4 transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
              <span className="font-black text-white text-sm">SG</span>
            </div>
            <span className="font-black text-base tracking-tighter">GrindSync</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#6b7a99] hover:text-[#e4e1e9] no-min-size p-1"><IconX size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href;
            return (
              <Link key={label} href={href} onClick={() => setSidebarOpen(false)}>
                <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
                  isActive ? "bg-primary text-white shadow-md shadow-primary/30" : "text-[#6b7a99] hover:text-[#e4e1e9] hover:bg-white/[0.05]")}>
                  <Icon size={18} className="flex-shrink-0 transition-transform group-hover:scale-110" />
                  <span className="text-[13px] font-bold tracking-tight">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4">
          {/* Tier card */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-2">Your Tier</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}40` }}>
                <IconTrophy size={14} style={{ color: tier.color }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: tier.color }}>{tier.label}</p>
                <p className="text-[9px] text-[#6b7a99]">{xp.toLocaleString()} XP{rank ? ` · #${rank}` : ""}</p>
              </div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-[#6b7a99] hover:text-red-400 hover:bg-red-500/[0.08] transition-all group">
            <IconLogout size={18} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">

        {/* Header */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-white/[0.04] bg-[#0e0e13]/80 backdrop-blur-xl sticky top-0 z-30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#6b7a99] hover:text-[#e4e1e9] transition-colors flex-shrink-0">
              <IconMenu2 size={20} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-base font-bold text-[#e4e1e9] truncate hidden xs:block">{greet(firstName)}</span>
              {streak > 0 && (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1 flex-shrink-0">
                  <IconFlame size={11} className="text-orange-400" />
                  <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 whitespace-nowrap">{streak}d streak</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 sm:px-4 py-2 cursor-pointer hover:border-primary/30 transition-all group" onClick={() => router.push("/users")}>
              <IconSearch size={13} className="text-[#6b7a99] group-hover:text-primary transition-colors" />
              <span className="text-[12px] sm:text-[13px] text-[#6b7a99] font-medium w-28 sm:w-40">Search devs…</span>
            </div>
            <NotificationBell />
            <Link href={`/profile/${userId}`}>
              <UserAvatar userId={userId} sessionImage={userImage} userName={userName} />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

          {/* ── KPI Row — real data ────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard label="XP Earned"  value={loading ? "…" : xp.toLocaleString()}
              chip={rank ? `Rank #${rank}` : "Tier: " + tier.label} chipColor="blue" loading={loading} />
            <KpiCard label="Challenges" value={loading ? "…" : String(solved)}
              chip="Completed" chipColor="orange" loading={loading} />
            <KpiCard label="GitHub Streak" value={loading ? "…" : `${streak} days`}
              chip={ghStatus?.committedToday ? "✅ Today done" : ghStatus?.hasUsername ? "No push today" : "Link GitHub"}
              chipColor="green" loading={loading} />
            <KpiCard label="Deep Work"
              value={loading ? "…" : wakaOk ? fmtTime(waka!.totalSecondsToday!) : "—"}
              chip={wakaOk ? "Today via WakaTime" : waka?.error === "NO_WAKATIME_KEY" ? "Link WakaTime" : "No data"}
              chipColor="purple" loading={loading && !waka} />
          </div>

          {/* ── Focus chart + Right Column ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Focus Chart */}
            <div className="lg:col-span-2 bg-[#1b1b20] rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-[#e4e1e9]">Activity This Week</h2>
                  {loading ? (
                    <div className="h-3 w-40 bg-white/[0.06] rounded-full animate-pulse mt-1" />
                  ) : weeklyCommits > 0 ? (
                    <p className="text-[10px] text-[#6b7a99] mt-0.5">
                      <span className="text-emerald-400 font-black">{weeklyCommits}</span> commits · {ghStatus?.githubUsername ? `@${ghStatus.githubUsername}` : "this week"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#6b7a99] mt-0.5">{solved} challenges · {xp.toLocaleString()} XP</p>
                  )}
                </div>
                <Link href="/stats">
                  <span className="text-[11px] font-bold text-[#6b7a99] bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1 hover:text-primary hover:border-primary/30 transition-colors">
                    Full Stats →
                  </span>
                </Link>
              </div>
              {/* Bars */}
              {(() => {
                const BAR_MAX_H = 148; // px, matches the container height minus day labels
                const maxCount = Math.max(...focusData.map(d => d.count), 1);
                return loading ? (
                  <div className="flex items-end gap-2 h-44 pb-6">
                    {[30, 55, 40, 72, 45, 88, 60].map((pct, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 justify-end h-full">
                        <div className="w-full rounded-t-md animate-pulse bg-white/[0.08]" style={{ height: `${pct}%` }} />
                        <div className="w-5 h-2 rounded bg-white/[0.05] animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : focusData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 gap-2 text-center">
                    <IconBrandGithub size={28} className="text-[#6b7a99] opacity-30" />
                    <p className="text-xs text-[#6b7a99]">Link GitHub in your profile to see commit activity here</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 pt-8 pb-0" style={{ height: "176px" }}>
                    {focusData.map((d, i) => {
                      const isActive = i === activeBar;
                      const isToday = i === focusData.length - 1;
                      // Always at least 6px for zero days, else proportional
                      const barH = d.count === 0 ? 6 : Math.max(18, Math.round((d.count / maxCount) * BAR_MAX_H));
                      return (
                        <div
                          key={d.day + i}
                          className="flex-1 flex flex-col items-center justify-end cursor-pointer select-none group"
                          style={{ height: `${BAR_MAX_H}px` }}
                          onMouseEnter={() => setActiveBar(i)}
                          onMouseLeave={() => setActiveBar(focusData.length - 1)}
                        >
                          {/* Tooltip */}
                          <div className={cn(
                            "mb-2 px-2 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap transition-all duration-150 border",
                            isActive ? "opacity-100 bg-[#111116] border-white/[0.12] text-[#e4e1e9] shadow-lg" : "opacity-0 pointer-events-none bg-transparent border-transparent text-transparent"
                          )}>
                            {d.count} commit{d.count !== 1 ? "s" : ""}
                          </div>

                          {/* Bar */}
                          <div
                            className="w-full rounded-t-md transition-all duration-200 relative overflow-hidden"
                            style={{ height: `${barH}px` }}
                          >
                            {/* Background fill */}
                            <div className="absolute inset-0 rounded-t-md" style={{
                              background: isActive
                                ? "linear-gradient(to top, #1d3bcc 0%, #3d5eff 100%)"
                                : isToday
                                  ? d.count > 0
                                    ? "linear-gradient(to top, rgba(16,185,129,0.25) 0%, rgba(52,211,153,0.5) 100%)"
                                    : "linear-gradient(to top, rgba(16,185,129,0.08) 0%, rgba(52,211,153,0.12) 100%)"
                                  : d.count > 0
                                    ? "linear-gradient(to top, rgba(37,71,244,0.25) 0%, rgba(99,120,255,0.55) 100%)"
                                    : "rgba(255,255,255,0.04)"
                            }} />
                            {/* Top glow line */}
                            {d.count > 0 && (
                              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                                background: isActive ? "#6380ff" : isToday ? "rgba(52,211,153,0.7)" : "rgba(99,120,255,0.4)",
                                boxShadow: isActive ? "0 0 8px #3d5eff" : "none"
                              }} />
                            )}
                          </div>

                          {/* Day label */}
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest mt-1.5 transition-colors",
                            isActive ? "text-primary" : isToday ? "text-emerald-400" : "text-[#6b7a99]"
                          )}>{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Right column */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">

              {/* Join the Grind — real online count */}
              <div className="flex-1 bg-[#1b1b20] rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-black text-[#e4e1e9]">Devs Online Now</h3>
                  </div>
                  <p className="text-xs text-[#6b7a99] leading-relaxed">
                    <span className="text-[#e4e1e9] font-black text-base">{loading ? "…" : onlineCount}</span>
                    {" "}grinders active right now
                  </p>
                </div>
                <Link href="/chat">
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#2547f4,#5b6cf9)" }}>
                    <IconMessageCircle size={15} />Join the Chat
                  </button>
                </Link>
              </div>

              {/* Today's DSA problem */}
              <div className="flex-1 bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <IconCode size={14} className="text-primary flex-shrink-0" />
                  <h3 className="text-sm font-black text-[#e4e1e9]">Daily DSA</h3>
                  <span className="text-[9px] font-black text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-1.5 py-0.5 ml-auto">Easy</span>
                </div>
                {loading || !dsaDaily ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-white/[0.06] rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/5" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#e4e1e9] leading-snug mb-2">{dsaDaily.title}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {dsaDaily.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary/80 border border-primary/20 rounded-full px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                    <a href={dsaDaily.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] font-black text-primary hover:text-primary/80 transition-colors">
                      Solve on LeetCode <IconExternalLink size={12} />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Recent Activity + Active Challenges ───── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Recent completions */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-[#e4e1e9]">Recent Activity</h2>
                <Link href="/challenges" className="text-[10px] sm:text-[11px] font-black text-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                  All <IconChevronRight size={12} />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2.5">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />)}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2 text-center">
                  <IconBolt size={28} className="text-[#6b7a99] opacity-30" />
                  <p className="text-xs text-[#6b7a99]">No completions yet.<br />Start a challenge!</p>
                  <Link href="/challenges">
                    <button className="mt-1 text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                      Browse →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((item, i) => {
                    const ago = (() => {
                      const s = (Date.now() - new Date(item.completedAt).getTime()) / 1000;
                      if (s < 3600) return `${Math.round(s / 60)}m ago`;
                      if (s < 86400) return `${Math.round(s / 3600)}h ago`;
                      return `${Math.round(s / 86400)}d ago`;
                    })();
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <IconCheck size={12} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-[#e4e1e9] truncate capitalize">{item.challengeId.replace(/-/g, " ")}</p>
                          <p className="text-[10px] text-[#6b7a99]">{ago}</p>
                        </div>
                        <span className="text-[11px] font-black text-emerald-400 flex-shrink-0">+{item.points}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available challenges */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-[#e4e1e9]">Challenges</h2>
                <Link href="/challenges" className="text-[10px] sm:text-[11px] font-black text-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                  All <IconChevronRight size={12} />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2.5">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {challenges.map(ch => (
                    <Link key={ch.id} href="/challenges">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{ch.icon}</span>
                          <p className="text-[12px] font-bold text-[#c4c5d9] group-hover:text-[#e4e1e9] truncate transition-colors">{ch.title}</p>
                        </div>
                        <span className="text-[9px] font-black text-primary border border-primary/20 bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0 ml-2">
                          +{ch.points}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Actions ────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: <IconBolt size={15} />,         label: "Start Challenge", href: "/challenges" },
              { icon: <IconChartBar size={15} />,      label: "My Stats",        href: "/stats" },
              { icon: <IconUsers size={15} />,         label: "Discover",        href: "/users" },
              { icon: <IconArrowUpRight size={15} />,  label: "My Profile",      href: `/profile/${userId}` },
            ].map(({ icon, label, href }) => (
              <Link key={label} href={href}>
                <div className="flex items-center gap-2 bg-[#1b1b20] hover:bg-[#232329] border border-white/[0.06] hover:border-primary/20 rounded-xl p-3 sm:p-3.5 cursor-pointer transition-all group h-full">
                  <div className="text-[#6b7a99] group-hover:text-primary transition-colors flex-shrink-0">{icon}</div>
                  <span className="text-[11px] sm:text-[12px] font-bold text-[#6b7a99] group-hover:text-[#e4e1e9] transition-colors leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* ── Leaderboard ──────────────────────────── */}
          <div className="bg-[#1b1b20] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <IconMedal size={16} className="text-primary flex-shrink-0" />
                <h2 className="text-sm font-black text-[#e4e1e9]">Live Leaderboard</h2>
                {rank && <span className="text-[9px] font-black text-primary border border-primary/20 bg-primary/10 rounded-full px-2 py-0.5">You: #{rank}</span>}
              </div>
              <Link href="/stats" className="text-[10px] sm:text-[11px] font-black text-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                Stats <IconChevronRight size={12} />
              </Link>
            </div>
            <div className="p-3 sm:p-4">
              <Leaderboard />
            </div>
          </div>

        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────── */}
      <nav className="mobile-bottom-nav lg:hidden safe-pb">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {MOBILE_NAV.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href;
            return (
              <Link key={label} href={href} className="no-min-size">
                <div className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                  isActive ? "text-primary" : "text-[#6b7a99] hover:text-[#e4e1e9]")}>
                  <div className={cn("p-2 rounded-xl transition-all", isActive && "bg-primary/15")}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[9px] font-bold tracking-wide">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
