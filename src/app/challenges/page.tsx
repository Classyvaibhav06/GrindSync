"use client";
// Editorial redesign — flat surfaces, hairline borders, Geist Mono metadata,
// understated weights, colour reserved for status. Logic identical to before.
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IconTrophy,
  IconPlayerPlay,
  IconPlayerStop,
  IconCheck,
  IconFlame,
  IconBolt,
  IconClock,
  IconCode,
  IconArrowLeft,
  IconRefresh,
  IconExternalLink,
  IconShieldCheck,
  IconLoader2,
  IconAlertCircle,
  IconBrandGithub,
  IconGitCommit,
  IconDiamond,
  IconCrown,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface DsaProblem {
  date: string;
  titleSlug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  acRate: number;
  leetcodeUrl: string;
  questionId: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  duration: number; // minutes
  points: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Elite";
  color: string;
  borderColor: string;
}

interface LeaderboardUser {
  _id: string;
  name: string;
  username: string;
  image?: string;
  totalPoints: number;
  completedChallenges: number;
}

// Editorial monochrome: difficulty is mono text, not a coloured pill.
const DIFFICULTY_TEXT: Record<string, string> = {
  Easy: "text-emerald-400",
  Medium: "text-amber-400",
  Hard: "text-orange-400",
  Elite: "text-violet-400",
};

const DSA_DIFFICULTY_TEXT: Record<string, string> = {
  Easy: "text-emerald-400",
  Medium: "text-amber-400",
  Hard: "text-red-400",
};

// Static challenge icons come from the API as emoji — map to clean glyphs here.
const CHALLENGE_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  "code-30": IconBolt,
  "code-60": IconFlame,
  "code-120": IconDiamond,
  "code-180": IconCrown,
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Shared editorial bits ───────────────────────────── */
function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#6b7a99]">{index}</span>
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#e4e1e9]">
        {title}
      </h2>
    </div>
  );
}

function QuietButton({
  children,
  onClick,
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-white/[0.12]",
        "text-sm font-medium text-[#e4e1e9] transition-colors",
        "hover:border-white/25 hover:bg-white/[0.04]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/[0.12] disabled:hover:bg-transparent",
        className
      )}
    >
      {children}
    </button>
  );
}

function CircularTimer({
  elapsed,
  total,
  isRunning,
}: {
  elapsed: number;
  total: number;
  isRunning: boolean;
}) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(elapsed / total, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="220" height="220" className="-rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="2"
        />
        {/* Dashed tick ring for the editorial feel */}
        <circle
          cx="110"
          cy="110"
          r={radius - 10}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke={isRunning ? "#10b981" : "rgba(255,255,255,0.35)"}
          strokeWidth="2"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1.5">
        <span className="font-mono text-5xl tabular-nums text-[#e4e1e9] leading-none">
          {formatTime(elapsed)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#6b7a99]">
          {isRunning ? "· recording ·" : "paused"}
        </span>
        <span className="font-mono text-[10px] text-[#6b7a99]/60 tabular-nums">
          / {formatTime(total)}
        </span>
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [userStats, setUserStats] = useState({ totalPoints: 0, completedCount: 0 });
  const [loading, setLoading] = useState(true);

  // DSA Daily state
  const [dsaProblem, setDsaProblem] = useState<DsaProblem | null>(null);
  const [dsaLoading, setDsaLoading] = useState(true);
  const [dsaError, setDsaError] = useState<string | null>(null);
  const [dsaSolvedToday, setDsaSolvedToday] = useState(false);
  const [dsaVerifying, setDsaVerifying] = useState(false);
  const [dsaEarned, setDsaEarned] = useState(0);
  const [hasLcUsername, setHasLcUsername] = useState(true); // optimistic

  // CodeTime state
  const [wtStats, setWtStats] = useState({ totalSeconds: 0, error: null as string | null, loading: true, hasKey: true });
  const [wtVerifying, setWtVerifying] = useState<string | null>(null);

  // GitHub state
  const [ghStatus, setGhStatus] = useState<{
    hasUsername: boolean; githubUsername?: string;
    committedToday: boolean; commitCount: number;
    alreadyClaimed: boolean; streak: number; loading: boolean;
  }>({ hasUsername: false, committedToday: false, commitCount: 0, alreadyClaimed: false, streak: 0, loading: true });
  const [ghClaiming, setGhClaiming] = useState(false);

  // Timer state
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchAllData = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges/all");
      if (!res.ok) throw new Error("Failed to fetch");
      const d = await res.json();

      setChallenges(d.challenges || []);
      setLeaderboard(d.leaderboard || []);
      setCompletedToday(d.completedToday || []);
      setUserStats({ totalPoints: d.userStats?.totalPoints ?? 0, completedCount: d.userStats?.completedCount ?? 0 });
      if (d.dsaProblem) setDsaProblem(d.dsaProblem);
      setDsaSolvedToday(d.dsaSolved?.dsaSolvedToday ?? false);
      setHasLcUsername(d.dsaSolved?.hasLcUsername ?? true);
      setDsaLoading(false);

      const gh = d.githubStatus ?? {};
      setGhStatus({ hasUsername: gh.hasUsername ?? false, githubUsername: gh.githubUsername, committedToday: gh.committedToday ?? false, commitCount: gh.commitCount ?? 0, alreadyClaimed: gh.alreadyClaimed ?? false, streak: gh.streak ?? 0, loading: false });

      const ct = d.codetime ?? {};
      setWtStats({ totalSeconds: ct.totalSeconds ?? 0, error: ct.error, loading: false, hasKey: ct.hasKey ?? false });
    } catch (e) {
      console.error("Challenges fetch error:", e);
      setDsaLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Kept for DSA retry button
  const fetchDsaData = useCallback(async () => {
    setDsaLoading(true);
    setDsaError(null);
    try {
      const res = await fetch("/api/dsa/daily");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDsaProblem(data);
    } catch (e: any) {
      setDsaError(e.message);
    } finally {
      setDsaLoading(false);
    }
  }, []);

  const verifyDsaSolution = async () => {
    if (!dsaProblem) return;
    setDsaVerifying(true);
    try {
      const res = await fetch("/api/dsa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleSlug: dsaProblem.titleSlug,
          problemDate: dsaProblem.date,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDsaSolvedToday(true);
        setDsaEarned(data.pointsEarned);
        setUserStats((prev) => ({
          totalPoints: data.totalPoints,
          completedCount: prev.completedCount + 1,
        }));
        toast.success(`+${data.pointsEarned} points — solution verified`);
        fetchAllData(); // refresh leaderboard
      } else if (data.error === "NO_USERNAME") {
        setHasLcUsername(false);
        toast.error("Set your LeetCode username in Profile → Edit Profile first!");
      } else if (data.error === "ALREADY_CLAIMED") {
        setDsaSolvedToday(true);
        toast.info("Already claimed today!");
      } else if (data.error === "NOT_SOLVED") {
        toast.error(data.message || "Solution not found on LeetCode yet.");
      } else {
        toast.error(data.message || "Verification failed. Try again.");
      }
    } catch (e) {
      toast.error("Network error. Try again.");
    } finally {
      setDsaVerifying(false);
    }
  };

  const claimGithubCommit = async () => {
    setGhClaiming(true);
    try {
      const res = await fetch("/api/github/commits", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setGhStatus(p => ({ ...p, alreadyClaimed: true }));
        setCompletedToday(prev => [...prev, "github-daily-commit"]);
        setUserStats(prev => ({ totalPoints: data.totalPoints, completedCount: prev.completedCount + 1 }));
        toast.success(`+${data.pointsEarned} pts — daily commit rewarded`);
        fetchAllData();
      } else if (data.alreadyDone) {
        toast.info("Already claimed today!");
        setGhStatus(p => ({ ...p, alreadyClaimed: true }));
      } else {
        toast.error(data.message || "Failed to claim.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setGhClaiming(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchAllData();
    }
  }, [status, fetchAllData]);

  // Timer logic
  useEffect(() => {
    if (isRunning && activeChallenge) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          const totalSecs = activeChallenge.duration * 60;
          if (next >= totalSecs) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleChallengeComplete(activeChallenge.id, next);
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, activeChallenge]);

  const handleChallengeComplete = async (challengeId: string, elapsedSecs: number) => {
    try {
      const res = await fetch("/api/challenges/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, elapsedSeconds: elapsedSecs }),
      });
      const data = await res.json();

      if (res.ok) {
        setCompleted(true);
        setEarnedPoints(data.pointsEarned);
        setCompletedToday((prev) => [...prev, challengeId]);
        setUserStats((prev) => ({
          totalPoints: data.totalPoints,
          completedCount: prev.completedCount + 1,
        }));
        toast.success(`+${data.pointsEarned} points — challenge verified`);
        fetchAllData();
      } else if (data.alreadyDone) {
        toast.error("You already completed this challenge today!");
        resetTimer();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to verify challenge.");
    }
  };

  const claimWithWakatime = async (e: React.MouseEvent, challenge: Challenge) => {
    e.stopPropagation();
    if (wtStats.totalSeconds < challenge.duration * 60) {
      toast.error("You haven't coded enough today according to WakaTime!");
      return;
    }
    setWtVerifying(challenge.id);
    await handleChallengeComplete(challenge.id, challenge.duration * 60);
    setWtVerifying(null);
  };

  const startChallenge = (challenge: Challenge) => {
    if (completedToday.includes(challenge.id)) {
      toast.info("Already completed today! Come back tomorrow.");
      return;
    }
    setActiveChallenge(challenge);
    setElapsed(0);
    setCompleted(false);
    setIsRunning(true);
    startTimeRef.current = Date.now();
  };

  const togglePause = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setElapsed(0);
    setCompleted(false);
    setActiveChallenge(null);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#6b7a99] animate-pulse">
          loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e13] text-[#e4e1e9]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0e0e13]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <Link href="/home" className="text-[#6b7a99] hover:text-[#e4e1e9] transition-colors">
              <IconArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#6b7a99]">
                grindsync /
              </span>
              <h1 className="text-lg font-medium tracking-tight">Challenges</h1>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs tabular-nums">
            <div className="hidden sm:flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#6b7a99]">pts</span>
              <span className="text-[#e4e1e9] font-medium">{userStats.totalPoints.toLocaleString()}</span>
            </div>
            <div className="hidden sm:flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#6b7a99]">done</span>
              <span className="text-[#e4e1e9] font-medium">{userStats.completedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconFlame size={13} className="text-orange-400" />
              <span className="text-[#e4e1e9] font-medium">{ghStatus.streak}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* LEFT */}
          <div className="xl:col-span-2 space-y-10">
            {/* Active Session */}
            {activeChallenge && (
              <div className="rounded-lg border border-white/[0.1] bg-[#1b1b20] p-8">
                {completed ? (
                  /* Completion State */
                  <div className="flex flex-col items-center gap-6 py-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400">
                      session complete
                    </p>
                    <p className="font-mono text-6xl tabular-nums text-[#e4e1e9]">
                      +{earnedPoints}
                    </p>
                    <p className="text-sm text-[#6b7a99] text-center max-w-xs">
                      {activeChallenge.title} verified and logged to your record.
                    </p>
                    <QuietButton onClick={resetTimer}>
                      <IconRefresh size={14} /> Back to challenges
                    </QuietButton>
                  </div>
                ) : (
                  /* Timer State */
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7a99]">
                        now tracking
                      </p>
                      <span className="w-1 h-1 rounded-full bg-[#6b7a99]/50" />
                      <p className="text-sm font-medium">{activeChallenge.title}</p>
                      <span className="font-mono text-[10px] text-emerald-400">+{activeChallenge.points} pts</span>
                    </div>

                    <CircularTimer
                      elapsed={elapsed}
                      total={activeChallenge.duration * 60}
                      isRunning={isRunning}
                    />

                    {/* Flat progress rule */}
                    <div className="w-full max-w-sm">
                      <div className="h-px bg-white/[0.08] relative overflow-visible">
                        <div
                          className="absolute left-0 top-0 h-px bg-emerald-400 transition-all duration-1000"
                          style={{
                            width: `${Math.min((elapsed / (activeChallenge.duration * 60)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b7a99]">
                        <span>progress</span>
                        <span className="tabular-nums">
                          {Math.round((elapsed / (activeChallenge.duration * 60)) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <QuietButton onClick={togglePause}>
                        {isRunning ? (
                          <><IconPlayerStop size={14} /> Pause</>
                        ) : (
                          <><IconPlayerPlay size={14} /> Resume</>
                        )}
                      </QuietButton>
                      <button
                        onClick={resetTimer}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-[#6b7a99] hover:text-red-400 transition-colors"
                      >
                        Give up
                      </button>
                    </div>

                    <p className="font-mono text-[10px] text-[#6b7a99]/70 text-center max-w-xs leading-relaxed">
                      keep this tab open — the timer tracks your session while you code
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Challenge sections */}
            {!activeChallenge && (
              <>
                {/* ── 01 · Daily DSA ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <SectionLabel index="01" title="Daily problem" />
                    {!hasLcUsername && (
                      <Link href={`/profile/${session?.user?.id}`}>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-400 border border-amber-500/30 rounded-md px-2.5 py-1.5 hover:bg-amber-500/10 transition-colors">
                          <IconAlertCircle size={11} /> set leetcode username
                        </span>
                      </Link>
                    )}
                  </div>

                  {dsaLoading && (
                    <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-8 flex items-center justify-center gap-3">
                      <IconLoader2 size={16} className="animate-spin text-[#6b7a99]" />
                      <span className="font-mono text-xs text-[#6b7a99]">fetching today&apos;s problem…</span>
                    </div>
                  )}

                  {dsaError && (
                    <div className="rounded-lg border border-red-500/25 bg-red-500/[0.04] p-5 flex items-center justify-between gap-4">
                      <p className="text-sm text-red-400">{dsaError}</p>
                      <QuietButton onClick={fetchDsaData} className="shrink-0">
                        <IconRefresh size={13} /> Retry
                      </QuietButton>
                    </div>
                  )}

                  {!dsaLoading && !dsaError && dsaProblem && (
                    <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-6 transition-colors hover:border-white/[0.14]">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] mb-2">
                            <span className={cn("uppercase tracking-wider", DSA_DIFFICULTY_TEXT[dsaProblem.difficulty])}>
                              {dsaProblem.difficulty}
                            </span>
                            <span className="text-[#6b7a99]">#{dsaProblem.questionId}</span>
                            <span className="text-[#6b7a99] tabular-nums">{dsaProblem.acRate}% accept</span>
                            {dsaSolvedToday && (
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <IconCheck size={11} /> solved
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-medium tracking-tight leading-snug mb-3">
                            {dsaProblem.title}
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {dsaProblem.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="font-mono text-[10px] text-[#6b7a99] border border-white/[0.08] rounded px-2 py-0.5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-[#6b7a99] whitespace-nowrap self-start sm:pt-0.5">
                          +200 pts
                        </span>
                      </div>

                      <div className="border-t border-dashed border-white/[0.08] my-5" />

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <a href={dsaProblem.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <QuietButton className="w-full">
                            <IconExternalLink size={14} /> Open on LeetCode
                          </QuietButton>
                        </a>
                        {!dsaSolvedToday ? (
                          <button
                            onClick={verifyDsaSolution}
                            disabled={dsaVerifying}
                            className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-emerald-500/30 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-colors disabled:opacity-50"
                          >
                            {dsaVerifying ? (
                              <><IconLoader2 size={14} className="animate-spin" /> verifying…</>
                            ) : (
                              <><IconShieldCheck size={14} /> Verify solution</>
                            )}
                          </button>
                        ) : (
                          <div className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06]">
                            <IconCheck size={14} className="text-emerald-400" />
                            <span className="font-mono text-xs text-emerald-400">+{dsaEarned || 200} pts awarded</span>
                          </div>
                        )}
                      </div>

                      {!hasLcUsername && (
                        <p className="mt-3 font-mono text-[10px] text-[#6b7a99]">
                          ⚠ set your leetcode username in{" "}
                          <Link href={`/profile/${session?.user?.id}`} className="underline hover:text-[#e4e1e9] transition-colors">
                            your profile
                          </Link>{" "}
                          to enable auto-verification
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <div className="border-t border-dashed border-white/[0.08]" />

                {/* ── 02 · Daily commit ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <SectionLabel index="02" title="Daily commit" />
                    {ghStatus.hasUsername && ghStatus.streak > 0 && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-orange-400">
                        <IconFlame size={12} /> {ghStatus.streak}-day streak
                      </span>
                    )}
                  </div>

                  {ghStatus.loading ? (
                    <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-8 flex items-center justify-center gap-3">
                      <IconLoader2 size={16} className="animate-spin text-[#6b7a99]" />
                      <span className="font-mono text-xs text-[#6b7a99]">checking github activity…</span>
                    </div>
                  ) : !ghStatus.hasUsername ? (
                    <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">No GitHub linked</p>
                        <p className="font-mono text-[11px] text-[#6b7a99] mt-1">add your username to track daily commits</p>
                      </div>
                      <Link href={`/profile/${session?.user?.id}`} className="shrink-0">
                        <QuietButton>
                          <IconBrandGithub size={14} /> Link GitHub
                        </QuietButton>
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-6 transition-colors hover:border-white/[0.14]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-11 h-11 rounded-md border border-white/[0.1] flex items-center justify-center flex-shrink-0 bg-white/[0.02]">
                            {ghStatus.alreadyClaimed ? <IconCheck size={18} className="text-emerald-400" /> :
                             ghStatus.committedToday ? <IconGitCommit size={18} className="text-emerald-400" /> :
                             <IconBrandGithub size={18} className="text-[#6b7a99]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {ghStatus.alreadyClaimed ? "Commit claimed" :
                               ghStatus.committedToday ? `${ghStatus.commitCount} commit${ghStatus.commitCount !== 1 ? "s" : ""} pushed today` :
                               "No commits yet today"}
                            </p>
                            <p className="font-mono text-[11px] text-[#6b7a99] mt-0.5 truncate">
                              @{ghStatus.githubUsername} · {ghStatus.committedToday ? "activity detected" : "push some code to claim"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs text-[#6b7a99]">+100 pts</span>
                          {!ghStatus.alreadyClaimed ? (
                            <button
                              onClick={claimGithubCommit}
                              disabled={!ghStatus.committedToday || ghClaiming}
                              className={cn(
                                "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border text-sm font-medium transition-colors",
                                ghStatus.committedToday
                                  ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                                  : "border-white/[0.08] text-[#6b7a99] opacity-40 cursor-not-allowed"
                              )}
                            >
                              {ghClaiming ? <IconLoader2 size={14} className="animate-spin" /> : <IconShieldCheck size={14} />}
                              {ghStatus.committedToday ? "Claim reward" : "Not yet"}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                              <IconCheck size={13} /> claimed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <div className="border-t border-dashed border-white/[0.08]" />

                {/* ── 03 · Focus sessions ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <SectionLabel index="03" title="Focus sessions" />
                    <span className="font-mono text-[11px] text-[#6b7a99]">
                      {wtStats.loading ? (
                        "checking wakatime…"
                      ) : wtStats.hasKey ? (
                        <>coded <span className="text-[#e4e1e9] tabular-nums">{(wtStats.totalSeconds / 60).toFixed(0)}m</span> today</>
                      ) : (
                        <Link href={`/profile/${session?.user?.id}`} className="underline decoration-dotted hover:text-[#e4e1e9] transition-colors">
                          link wakatime to auto-verify
                        </Link>
                      )}
                    </span>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] divide-y divide-white/[0.06] overflow-hidden">
                    {challenges.map((challenge) => {
                      const isDone = completedToday.includes(challenge.id);
                      const Icon = CHALLENGE_ICONS[challenge.id] ?? IconCode;

                      return (
                        <div
                          key={challenge.id}
                          onClick={() => !isDone && startChallenge(challenge)}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center gap-4 p-5 transition-colors",
                            isDone ? "opacity-50" : "hover:bg-white/[0.02] cursor-pointer"
                          )}
                        >
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-md border border-white/[0.1] bg-white/[0.02] flex items-center justify-center flex-shrink-0 text-[#6b7a99]">
                            <Icon size={18} />
                          </div>

                          {/* Title + description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-sm font-medium truncate">{challenge.title}</h3>
                              <span className={cn("font-mono text-[10px] uppercase tracking-wider", DIFFICULTY_TEXT[challenge.difficulty])}>
                                {challenge.difficulty.toLowerCase()}
                              </span>
                            </div>
                            <p className="text-xs text-[#6b7a99] line-clamp-1 mt-0.5">{challenge.description}</p>
                          </div>

                          {/* Mono meta */}
                          <div className="flex items-center gap-5 font-mono text-[11px] tabular-nums shrink-0">
                            <span className="text-[#6b7a99] flex items-center gap-1.5">
                              <IconClock size={11} /> {challenge.duration}m
                            </span>
                            <span className="text-[#e4e1e9]">+{challenge.points}</span>
                          </div>

                          {/* Action */}
                          <div className="shrink-0 sm:w-40">
                            {isDone ? (
                              <div className="inline-flex items-center justify-center gap-1.5 h-9 w-full sm:w-auto sm:px-4 rounded-md border border-emerald-500/20">
                                <IconCheck size={13} className="text-emerald-400" />
                                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">done</span>
                              </div>
                            ) : wtStats.hasKey && wtStats.totalSeconds >= challenge.duration * 60 ? (
                              <button
                                onClick={(e) => claimWithWakatime(e, challenge)}
                                disabled={wtVerifying === challenge.id}
                                className="inline-flex items-center justify-center gap-2 h-9 w-full sm:w-auto sm:px-4 rounded-md border border-emerald-500/30 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                {wtVerifying === challenge.id ? <IconLoader2 size={13} className="animate-spin" /> : <IconShieldCheck size={13} />}
                                trust wakatime
                              </button>
                            ) : (
                              <button className="inline-flex items-center justify-center gap-2 h-9 w-full sm:w-auto sm:px-4 rounded-md border border-white/[0.12] text-xs font-medium text-[#e4e1e9] hover:border-white/30 hover:bg-white/[0.04] transition-colors">
                                <IconPlayerPlay size={12} /> start timer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-8">
            {/* Your record */}
            <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-6 space-y-5">
              <SectionLabel index="04" title="Your record" />
              <div className="grid grid-cols-2 gap-px bg-white/[0.06] rounded-md overflow-hidden border border-white/[0.06]">
                <div className="bg-[#16161c] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6b7a99] mb-2">points</p>
                  <p className="font-mono text-2xl tabular-nums text-[#e4e1e9]">{userStats.totalPoints.toLocaleString()}</p>
                </div>
                <div className="bg-[#16161c] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6b7a99] mb-2">completed</p>
                  <p className="font-mono text-2xl tabular-nums text-[#e4e1e9]">{userStats.completedCount}</p>
                </div>
              </div>
              <p className="font-mono text-[10px] text-[#6b7a99]">
                {completedToday.length}/{challenges.length} done today
              </p>
            </div>

            {/* Leaderboard */}
            <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] overflow-hidden">
              <div className="p-5 border-b border-white/[0.06]">
                <SectionLabel index="05" title="Leaderboard" />
              </div>

              <div className="divide-y divide-white/[0.05]">
                {leaderboard.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                    <IconTrophy size={28} className="text-[#6b7a99]/40" />
                    <p className="font-mono text-[11px] text-[#6b7a99] leading-relaxed">
                      no entries yet — be the first to log a session
                    </p>
                  </div>
                )}
                {leaderboard.map((user, i) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className={cn(
                      "font-mono text-xs tabular-nums w-6 shrink-0",
                      i === 0 ? "text-amber-400" : i < 3 ? "text-[#e4e1e9]" : "text-[#6b7a99]"
                    )}>
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <Avatar className="w-8 h-8 border border-white/[0.1]">
                      <AvatarImage
                        src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                      />
                      <AvatarFallback className="bg-white/[0.05] text-[#6b7a99] font-mono text-[9px]">
                        {user.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="font-mono text-[10px] text-[#6b7a99] truncate">
                        @{user.username || user.name}
                      </p>
                    </div>

                    <span className="font-mono text-xs tabular-nums text-[#e4e1e9] shrink-0">
                      {user.totalPoints.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Field notes */}
            <div className="rounded-lg border border-white/[0.08] bg-[#1b1b20] p-6 space-y-4">
              <SectionLabel index="06" title="Field notes" />
              <p className="font-hand text-2xl leading-snug text-[#e4e1e9]/90 -rotate-1">
                &ldquo;show up daily — the points take care of themselves.&rdquo;
              </p>
              <ul className="space-y-2.5 border-t border-dashed border-white/[0.08] pt-4">
                {[
                  "each challenge resets daily at midnight IST",
                  "higher difficulty pays more points",
                  "top 3 of the leaderboard get the badge",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] text-[#6b7a99]/60 mt-0.5">0{i + 1}</span>
                    <span className="font-mono text-[10px] text-[#6b7a99] leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
