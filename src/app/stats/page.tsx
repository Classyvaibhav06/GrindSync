"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconTrophy, IconFlame, IconCode, IconBrandGithub, IconClock,
  IconArrowUpRight, IconChartBar,
  IconStar, IconLayoutDashboard, IconUsers, IconMessageCircle,
  IconSettings, IconLogout, IconChevronRight, IconBolt,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */
interface ChallengeStats {
  totalPoints: number;
  completedCount: number;
  recentCompletions: { challengeId: string; points: number; completedAt: string }[];
}
interface GitHubStatus {
  hasUsername: boolean;
  githubUsername?: string;
  committedToday?: boolean;
  commitCount?: number;
  streak?: number;
}
interface WakaStats {
  totalSecondsToday?: number;
  error?: string;
}
interface LeaderboardPos { rank: number; total: number }
interface TopLang { lang: string; count: number; repoPct: number }

/* ── Helpers ─────────────────────────────────────────── */
function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", "C#": "#178600", Kotlin: "#A97BFF", Swift: "#F05138",
  Ruby: "#701516", PHP: "#4F5D95", HTML: "#e34c26", CSS: "#563d7c",
  Dart: "#00B4AB", Vue: "#41b883", Shell: "#89e051",
};

const MOBILE_NAV = [
  { icon: IconLayoutDashboard, label: "Home",      href: "/home" },
  { icon: IconTrophy,           label: "Challenges", href: "/challenges" },
  { icon: IconChartBar,         label: "Stats",      href: "/stats" },
  { icon: IconUsers,            label: "Discover",   href: "/users" },
];

/* ── Stat Card ─────────────────────────────────────── */
function StatCard({
  label, value, sub, icon, accent = "blue", loading = false,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent?: "blue" | "green" | "orange" | "purple"; loading?: boolean;
}) {
  const colors = {
    blue:   { bar: "bg-primary/70",          chip: "bg-primary/10 text-primary border-primary/20" },
    green:  { bar: "bg-emerald-500/70",       chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    orange: { bar: "bg-orange-400/70",        chip: "bg-orange-400/10 text-orange-400 border-orange-400/20" },
    purple: { bar: "bg-violet-500/70",        chip: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  };
  const c = colors[accent];
  return (
    <div className="bg-[#1b1b20] rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:bg-[#1f1f26] transition-colors">
      <div className={cn("absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full", c.bar)} />
      <div className="pl-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-2">{label}</p>
          {loading ? (
            <div className="h-7 w-24 bg-white/[0.06] rounded-lg animate-pulse" />
          ) : (
            <p className="text-xl sm:text-2xl font-black text-[#e4e1e9] tabular-nums tracking-tight leading-none">{value}</p>
          )}
          {sub && !loading && (
            <p className="text-[11px] text-[#6b7a99] font-medium mt-1.5 truncate">{sub}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-xl flex-shrink-0", c.chip.split(" ").slice(0,1).join(" "))}>{icon}</div>
      </div>
    </div>
  );
}

/* ── Section Header ────────────────────────────────── */
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-black text-[#e4e1e9] tracking-tight">{title}</h2>
      {sub && <p className="text-[11px] text-[#6b7a99] mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Global Cache (Client-side) ───────────────────────── */
let _statsCache: {
  [uid: string]: {
    data: any;
    timestamp: number;
  };
} = {};

/* ── Main Page ──────────────────────────────────────── */
export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [challengeStats, setChallengeStats] = useState<ChallengeStats | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [wakaStats, setWakaStats] = useState<WakaStats | null>(null);
  const [leaderPos, setLeaderPos] = useState<LeaderboardPos | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [topLangs, setTopLangs] = useState<TopLang[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const uid = session.user.id;

    // Check client cache (valid for 30 seconds)
    const cached = _statsCache[uid];
    const staleGitHub = cached?.data?.githubStatus?.hasUsername && !cached?.data?.githubStatus?.commitCount;
    if (cached && Date.now() - cached.timestamp < 30000 && !staleGitHub) {
      setChallengeStats(cached.data.challengeStats);
      setGithubStatus(cached.data.githubStatus);
      setWakaStats(cached.data.wakaStats);
      setLeaderPos(cached.data.leaderPos);
      setRepos(cached.data.repos);
      setTopLangs(cached.data.topLangs);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch("/api/stats")
      .then(r => r.json())
      .then(d => {
        setChallengeStats(d.challengeStats ?? null);
        setGithubStatus(d.githubStatus ?? null);
        setWakaStats(d.wakaStats ?? null);
        setLeaderPos(d.leaderPos ?? null);
        setRepos(d.repos ?? []);
        setTopLangs(d.topLangs ?? []);

        _statsCache[uid] = { data: d, timestamp: Date.now() };
      })
      .catch(err => console.error("Stats fetch error:", err))
      .finally(() => setLoading(false));
  }, [session]);

  if (status === "loading") return (
    <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;

  const userName = session.user?.name || "Dev";
  const userId  = session.user?.id;
  const userImg = session.user?.image;

  const xp     = challengeStats?.totalPoints ?? 0;
  const solved = challengeStats?.completedCount ?? 0;
  const wToday = wakaStats?.totalSecondsToday;
  const ghStrk = githubStatus?.streak ?? 0;

  // Tier calculation
  const tier = xp >= 5000 ? "Legend" : xp >= 2000 ? "Diamond" : xp >= 800 ? "Platinum" : xp >= 350 ? "Gold" : "Grinder";
  const tierColors: Record<string, string> = {
    Legend: "#f59e0b", Diamond: "#22d3ee", Platinum: "#a78bfa", Gold: "#fbbf24", Grinder: "#94a3b8",
  };

  return (
    <div className="flex min-h-screen bg-[#0e0e13] text-[#e4e1e9]">

      {/* ── Sidebar (desktop) ──────────────────────────── */}
      <aside className="hidden lg:flex w-56 xl:w-60 flex-shrink-0 flex-col h-screen sticky top-0 bg-[#0e0e13] border-r border-white/[0.06] py-5 px-4">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
            <span className="font-black text-white text-sm">SG</span>
          </div>
          <span className="font-black text-base tracking-tighter">GrindSync</span>
        </div>
        <nav className="flex-1 space-y-1">
          {[
            { icon: IconLayoutDashboard, label: "Dashboard", href: "/home" },
            { icon: IconTrophy,          label: "Challenges", href: "/challenges" },
            { icon: IconMessageCircle,   label: "Chat",       href: "/chat" },
            { icon: IconUsers,           label: "Discover",   href: "/users" },
            { icon: IconChartBar,        label: "Stats",      href: "/stats", active: true },
            { icon: IconSettings,        label: "Settings",   href: "#" },
          ].map(({ icon: Icon, label, href, active }) => (
            <Link key={label} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
                active ? "bg-primary text-white shadow-md shadow-primary/30"
                       : "text-[#6b7a99] hover:text-[#e4e1e9] hover:bg-white/[0.05]"
              )}>
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-[13px] font-bold tracking-tight">{label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="space-y-2 pt-4">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-2">Your Tier</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tierColors[tier]}20`, border: `1px solid ${tierColors[tier]}40` }}>
                <IconTrophy size={14} style={{ color: tierColors[tier] }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: tierColors[tier] }}>{tier}</p>
                <p className="text-[9px] text-[#6b7a99]">{xp.toLocaleString()} XP</p>
              </div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-[#6b7a99] hover:text-red-400 hover:bg-red-500/[0.08] transition-all">
            <IconLogout size={18} /><span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">

        {/* Header */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-white/[0.04] bg-[#0e0e13]/80 backdrop-blur-xl sticky top-0 z-30">
          <div>
            <h1 className="text-base sm:text-lg font-black text-[#e4e1e9] tracking-tight">Your Stats</h1>
            <p className="text-[11px] text-[#6b7a99] font-medium hidden sm:block">All your performance metrics in one place</p>
          </div>
          <Link href={`/profile/${userId}`}>
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-[#0e0e13] cursor-pointer hover:ring-primary/60 transition-all">
              <AvatarImage src={userImg ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">{userName.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">

          {/* ── Hero Tier Card ─────────────────────────── */}
          <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${tierColors[tier]}18, ${tierColors[tier]}08)`, border: `1px solid ${tierColors[tier]}25` }}>
            {/* Glow blob */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ background: tierColors[tier] }} />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-1">Current Tier</p>
                <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: tierColors[tier] }}>{tier}</p>
                <p className="text-sm font-bold text-[#e4e1e9] mt-1">{xp.toLocaleString()} XP total</p>
                {leaderPos && (
                  <p className="text-xs text-[#6b7a99] mt-1">
                    Ranked <span className="font-black text-[#e4e1e9]">#{leaderPos.rank}</span> of {leaderPos.total} grinders
                  </p>
                )}
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${tierColors[tier]}20`, border: `2px solid ${tierColors[tier]}40` }}>
                <IconTrophy size={32} style={{ color: tierColors[tier] }} />
              </div>
            </div>
            {/* XP progress to next tier */}
            {(() => {
              const tiers = [0, 350, 800, 2000, 5000, Infinity];
              const labels = ["Grinder", "Gold", "Platinum", "Diamond", "Legend"];
              const curIdx = tiers.findIndex(t => xp < t) - 1;
              const nextXP = tiers[curIdx + 1];
              const curXP  = tiers[curIdx];
              const pct = nextXP === Infinity ? 100 : Math.min(100, Math.round(((xp - curXP) / (nextXP - curXP)) * 100));
              return nextXP !== Infinity ? (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold text-[#6b7a99] mb-1.5">
                    <span>{pct}% to {labels[curIdx + 1]}</span>
                    <span>{(nextXP - xp).toLocaleString()} XP needed</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: tierColors[tier], boxShadow: `0 0 8px ${tierColors[tier]}60` }} />
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* ── KPI Grid ───────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total XP"       value={loading ? "…" : xp.toLocaleString()}
              sub={`Rank #${leaderPos?.rank ?? "?"}`} icon={<IconStar size={16} className="text-primary" />} accent="blue" loading={loading} />
            <StatCard label="Challenges Done" value={loading ? "…" : String(solved)}
              sub="All time completions" icon={<IconTrophy size={16} className="text-orange-400" />} accent="orange" loading={loading} />
            <StatCard label="GitHub Streak"  value={loading ? "…" : `${ghStrk} days`}
              sub={githubStatus?.committedToday ? "✅ Committed today" : "No push today"}
              icon={<IconFlame size={16} className="text-emerald-400" />} accent="green" loading={loading} />
            <StatCard label="Deep Work Today" value={loading || !wToday ? (wakaStats?.error ? "—" : "…") : fmtTime(wToday)}
              sub={wakaStats?.error === "NO_CODETIME_KEY" ? "Link CodeTime in profile" : "Tracked via CodeTime"}
              icon={<IconClock size={16} className="text-violet-400" />} accent="purple" loading={loading && !wakaStats} />
          </div>

          {/* ── Row: GitHub + Top Languages ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* GitHub Status */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
              <SectionHead title="GitHub Activity" sub={githubStatus?.githubUsername ? `@${githubStatus.githubUsername}` : "Link GitHub in profile"} />
              {!githubStatus?.hasUsername ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                  <IconBrandGithub size={36} className="text-[#6b7a99] opacity-40" />
                  <p className="text-xs text-[#6b7a99]">Add your GitHub username in Edit Profile to see commit activity.</p>
                  <Link href={`/profile/${userId}`}>
                    <button className="text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-4 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                      Go to Profile →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-2 h-2 rounded-full", githubStatus.committedToday ? "bg-emerald-500 animate-pulse" : "bg-[#6b7a99]")} />
                      <span className="text-sm font-bold">Today&apos;s commits</span>
                    </div>
                    <span className="text-sm font-black tabular-nums text-[#e4e1e9]">{githubStatus.commitCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                    <div className="flex items-center gap-2.5">
                      <IconFlame size={16} className="text-orange-400" />
                      <span className="text-sm font-bold">Commit streak</span>
                    </div>
                    <span className="text-sm font-black tabular-nums text-[#e4e1e9]">{ghStrk} days</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                    <div className="flex items-center gap-2.5">
                      <IconCode size={16} className="text-[#6b7a99]" />
                      <span className="text-sm font-bold">Public repos</span>
                    </div>
                    <span className="text-sm font-black tabular-nums text-[#e4e1e9]">{repos.length || "—"}</span>
                  </div>
                  <a href={`https://github.com/${githubStatus.githubUsername}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[11px] font-black text-primary/60 hover:text-primary transition-colors mt-1">
                    <IconBrandGithub size={13} />View on GitHub <IconArrowUpRight size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Top Languages */}
            <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
              <SectionHead title="Language Breakdown" sub={repos.length > 0 ? `${repos.length} repos analysed` : "From GitHub repos"} />
              {!githubStatus?.hasUsername ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <IconCode size={36} className="text-[#6b7a99] opacity-40" />
                  <p className="text-xs text-[#6b7a99]">Link GitHub to see your top languages.</p>
                </div>
              ) : topLangs.length === 0 && !loading ? (
                <p className="text-xs text-[#6b7a99] py-4 text-center">No language data in public repos.</p>
              ) : (
                <div className="space-y-4">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-3 bg-white/[0.05] rounded-full animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                        <div className="h-1.5 bg-white/[0.03] rounded-full animate-pulse" />
                      </div>
                    ))
                  ) : topLangs.map(({ lang, count, repoPct }, idx) => {
                    const maxCount = topLangs[0]?.count || 1;
                    const barPct = Math.round((count / maxCount) * 100);
                    const color = LANG_COLORS[lang] || "#8b949e";
                    return (
                      <div key={lang} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm font-bold text-[#e4e1e9]">{lang}</span>
                            {idx === 0 && <span className="text-[9px] font-black text-primary border border-primary/20 bg-primary/10 rounded-full px-1.5 py-0.5">#1</span>}
                          </div>
                          <span className="text-xs font-bold text-[#6b7a99] tabular-nums">{count} repo{count !== 1 ? "s" : ""} · {repoPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, background: color, boxShadow: `0 0 6px ${color}55` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Challenge Activity ───────────────── */}
          <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHead title="Recent Challenge Activity" />
              <Link href="/challenges" className="text-[11px] font-black text-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                All challenges <IconChevronRight size={12} />
              </Link>
            </div>
            {!challengeStats || loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : challengeStats.recentCompletions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <IconBolt size={32} className="text-[#6b7a99] opacity-30" />
                <p className="text-sm font-bold text-[#6b7a99]">No completions yet</p>
                <Link href="/challenges">
                  <button className="text-[11px] font-black text-primary border border-primary/30 bg-primary/10 px-4 py-1.5 rounded-full hover:bg-primary/20 transition-colors mt-1">
                    Browse challenges →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {challengeStats.recentCompletions.map((item, i) => {
                  const date = new Date(item.completedAt);
                  const relTime = (() => {
                    const diff = (Date.now() - date.getTime()) / 1000;
                    if (diff < 3600) return `${Math.round(diff/60)}m ago`;
                    if (diff < 86400) return `${Math.round(diff/3600)}h ago`;
                    return `${Math.round(diff/86400)}d ago`;
                  })();
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <IconTrophy size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#e4e1e9] truncate capitalize">{item.challengeId.replace(/-/g, " ")}</p>
                          <p className="text-[11px] text-[#6b7a99]">{relTime}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-400 tabular-nums flex-shrink-0 ml-2">+{item.points} XP</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── CodeTime Deep Work ─────────────────────── */}
          <div className="bg-[#1b1b20] rounded-2xl p-4 sm:p-5">
            <SectionHead title="Time Tracking" sub="Powered by CodeTime" />
            {wakaStats?.error === "NO_CODETIME_KEY" ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/20">
                <IconClock size={32} className="text-violet-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#e4e1e9]">Connect CodeTime</p>
                  <p className="text-xs text-[#6b7a99] mt-0.5">Add your CodeTime API key in Edit Profile to automatically track deep work time.</p>
                </div>
                <Link href={`/profile/${userId}`} className="flex-shrink-0">
                  <button className="text-[11px] font-black text-violet-400 border border-violet-500/30 bg-violet-500/10 px-4 py-2 rounded-full hover:bg-violet-500/20 transition-colors whitespace-nowrap">
                    Add API Key →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-1">Today</p>
                  <p className="text-2xl font-black text-[#e4e1e9]">{wToday ? fmtTime(wToday) : "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-1">Status</p>
                  <p className="text-sm font-black" style={{ color: wToday && wToday > 3600 ? "#22c55e" : "#6b7a99" }}>
                    {wToday && wToday > 3600 ? "In the Zone 🔥" : wToday ? "Getting Started" : "No data"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#6b7a99] mb-1">Goal</p>
                  <p className="text-sm font-black text-[#6b7a99]">4h / day</p>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────── */}
      <nav className="mobile-bottom-nav lg:hidden safe-pb">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {MOBILE_NAV.map(({ icon: Icon, label, href }) => {
            const isActive = href === "/stats";
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
