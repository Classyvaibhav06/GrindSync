"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IconTrophy,
  IconPlayerPlay,
  IconPlayerStop,
  IconCheck,
  IconFlame,
  IconStar,
  IconCrown,
  IconBolt,
  IconClock,
  IconCode,
  IconMedal,
  IconArrowLeft,
  IconRefresh,
  IconExternalLink,
  IconShieldCheck,
  IconBrandLeetcode,
  IconLoader2,
  IconAlertCircle,
  IconBrandGithub,
  IconGitCommit,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const DIFFICULTY_CONFIG = {
  Easy: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Easy" },
  Medium: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Medium" },
  Hard: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", label: "Hard" },
  Elite: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", label: "Elite" },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
        {/* Background track */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="oklch(0.2 0 0)"
          strokeWidth="12"
        />
        {/* Progress ring */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2547f4" />
            <stop offset="100%" stopColor="#8c25f4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <span className="text-4xl font-black tracking-tighter text-foreground">
          {formatTime(elapsed)}
        </span>
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
          {isRunning ? "CODING..." : "PAUSED"}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          of {formatTime(total)}
        </span>
      </div>
      {isRunning && (
        <div className="absolute inset-0 rounded-full animate-ping opacity-10 bg-primary" />
      )}
    </div>
  );
}

const DSA_DIFFICULTY_COLOR = {
  Easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  Hard: "text-red-400 bg-red-500/10 border-red-500/30",
};

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

  const fetchData = useCallback(async () => {
    try {
      const [challengesRes, statsRes] = await Promise.all([
        fetch("/api/challenges"),
        fetch("/api/challenges/my-stats"),
      ]);
      const challengesData = await challengesRes.json();
      const statsData = await statsRes.json();

      setChallenges(challengesData.challenges || []);
      setLeaderboard(challengesData.leaderboard || []);
      setCompletedToday(statsData.completedToday || []);
      setUserStats({
        totalPoints: statsData.totalPoints ?? 0,
        completedCount: statsData.completedCount ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDsaData = useCallback(async () => {
    setDsaLoading(true);
    setDsaError(null);
    try {
      const res = await fetch("/api/dsa/daily");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDsaProblem(data);

      // Check if user already solved today by fetching their profile
      const userRes = await fetch(`/api/users/${session?.user?.id}`);
      const userData = await userRes.json();
      const solvedDates: string[] = userData?.useProfile?.dsaSolvedDates || [];
      setDsaSolvedToday(solvedDates.includes(data.date));
      setHasLcUsername(!!userData?.useProfile?.leetcodeUsername);
    } catch (e: any) {
      setDsaError(e.message);
    } finally {
      setDsaLoading(false);
    }
  }, [session?.user?.id]);

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
        toast.success(`🎉 +${data.pointsEarned} points! LeetCode solve verified!`);
        fetchData(); // refresh leaderboard
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

  const fetchWakatime = useCallback(async () => {
    setWtStats(p => ({ ...p, loading: true }));
    try {
      const res = await fetch("/api/challenges/codetime");
      const data = await res.json();
      if (res.ok) {
        setWtStats({ totalSeconds: data.totalSecondsToday, error: null, loading: false, hasKey: true });
      } else if (data.error === "NO_CODETIME_KEY") {
        setWtStats({ totalSeconds: 0, error: null, loading: false, hasKey: false });
      } else {
        setWtStats({ totalSeconds: 0, error: data.message || "Failed", loading: false, hasKey: true });
      }
    } catch {
      setWtStats({ totalSeconds: 0, error: "Network Error", loading: false, hasKey: true });
    }
  }, []);

  const fetchGithub = useCallback(async () => {
    try {
      const res = await fetch("/api/github/commits");
      const data = await res.json();
      
      // Fetch actual GitHub streak from contributions graph
      let actualStreak = data.streak;
      let actualCommittedToday = data.committedToday;
      if (session?.user?.id && data.hasUsername) {
        try {
          const contribRes = await fetch(`/api/github/contributions?userId=${session.user.id}`);
          const contribData = await contribRes.json();
          if (contribData.weeks && contribData.weeks.length > 0) {
            const allDays: { date: string; count: number }[] = [];
            for (const w of contribData.weeks) {
              for (const d of w) allDays.push(d);
            }
            
            let streak = 0;
            let committedToday = false;
            const todayDate = new Date();
            const localISO = (dt: Date) => {
              const y = dt.getFullYear();
              const m = String(dt.getMonth() + 1).padStart(2, "0");
              const dd = String(dt.getDate()).padStart(2, "0");
              return `${y}-${m}-${dd}`;
            };
            const todayStr = localISO(todayDate);
            
            const todayData = allDays.find(a => a.date === todayStr);
            if (todayData && todayData.count > 0) {
              committedToday = true;
            }
            
            let checkDate = new Date(todayDate);
            while (true) {
              const iso = localISO(checkDate);
              const dayObj = allDays.find(a => a.date === iso);
              if (!dayObj) break;
              
              if (dayObj.count > 0) {
                streak++;
              } else if (iso !== todayStr) {
                break;
              }
              checkDate.setDate(checkDate.getDate() - 1);
            }
            actualStreak = Math.max(actualStreak, streak);
            actualCommittedToday = actualCommittedToday || committedToday;
          }
        } catch (e) {
          console.error("Failed to fetch actual github streak:", e);
        }
      }
      
      setGhStatus({
        ...data,
        streak: actualStreak,
        committedToday: actualCommittedToday,
        loading: false
      });
    } catch {
      setGhStatus(p => ({ ...p, loading: false }));
    }
  }, [session?.user?.id]);

  const claimGithubCommit = async () => {
    setGhClaiming(true);
    try {
      const res = await fetch("/api/github/commits", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setGhStatus(p => ({ ...p, alreadyClaimed: true }));
        setCompletedToday(prev => [...prev, "github-daily-commit"]);
        setUserStats(prev => ({ totalPoints: data.totalPoints, completedCount: prev.completedCount + 1 }));
        toast.success(`🎉 +${data.pointsEarned} pts! Daily commit rewarded!`);
        fetchData();
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
      fetchData();
      fetchDsaData();
      fetchWakatime();
      fetchGithub();
    }
  }, [status, fetchData, fetchDsaData, fetchWakatime, fetchGithub]);

  // Timer logic
  useEffect(() => {
    if (isRunning && activeChallenge) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          const totalSecs = activeChallenge.duration * 60;
          if (next >= totalSecs) {
            // Challenge complete!
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
        toast.success(`🎉 +${data.pointsEarned} points! Challenge verified!`);
        fetchData();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-20">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="rounded-2xl">
                <IconArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Challenges</h1>
              <p className="text-xs text-muted-foreground font-medium">
                Code, grind, earn points
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2">
              <IconStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-black text-sm text-foreground">
                {userStats.totalPoints.toLocaleString()} pts
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-secondary/50 border border-border rounded-2xl px-4 py-2">
              <IconMedal className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-muted-foreground">
                {userStats.completedCount} done
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* LEFT: Challenges + Active Timer */}
          <div className="xl:col-span-2 space-y-8">
            {/* Active Session */}
            {activeChallenge && (
              <div className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-primary/5 to-brand-purple/5 p-8">
                {/* Glow bg */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                {completed ? (
                  /* Completion State */
                  <div className="relative flex flex-col items-center gap-6 py-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30 animate-bounce">
                      <IconTrophy className="w-12 h-12 text-white" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-3xl font-black">Challenge Complete!</h2>
                      <p className="text-muted-foreground mt-2 font-medium">
                        You crushed{" "}
                        <span className="text-foreground font-bold">
                          {activeChallenge.title}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-8 py-4">
                      <IconStar className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                      <span className="text-3xl font-black text-yellow-400">
                        +{earnedPoints}
                      </span>
                      <span className="text-muted-foreground font-bold">points earned</span>
                    </div>
                    <Button
                      onClick={resetTimer}
                      className="rounded-2xl h-12 px-8 font-bold"
                    >
                      <IconRefresh className="w-4 h-4 mr-2" />
                      Back to Challenges
                    </Button>
                  </div>
                ) : (
                  /* Timer State */
                  <div className="relative flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{activeChallenge.icon}</span>
                      <div>
                        <h2 className="text-xl font-black">{activeChallenge.title}</h2>
                        <p className="text-sm text-muted-foreground font-medium">
                          {activeChallenge.points} pts on completion
                        </p>
                      </div>
                    </div>

                    <CircularTimer
                      elapsed={elapsed}
                      total={activeChallenge.duration * 60}
                      isRunning={isRunning}
                    />

                    {/* Progress bar */}
                    <div className="w-full max-w-sm">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-brand-purple rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min(
                              (elapsed / (activeChallenge.duration * 60)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          Progress
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold">
                          {Math.round(
                            (elapsed / (activeChallenge.duration * 60)) * 100
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={togglePause}
                        variant="outline"
                        className="rounded-2xl h-12 px-6 font-bold border-border hover:bg-secondary"
                      >
                        {isRunning ? (
                          <>
                            <IconPlayerStop className="w-4 h-4 mr-2" /> Pause
                          </>
                        ) : (
                          <>
                            <IconPlayerPlay className="w-4 h-4 mr-2 fill-current" />{" "}
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={resetTimer}
                        variant="ghost"
                        className="rounded-2xl h-12 px-6 font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        Give Up
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center font-medium max-w-xs">
                      💡 Keep this tab open while coding. The timer tracks your
                      session time.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Challenge Cards Grid */}
            {!activeChallenge && (
              <>
                {/* ── Daily DSA Problem Card ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black tracking-tight mb-0.5">Daily DSA Problem</h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        Solve today&apos;s LeetCode problem and earn <span className="text-yellow-400 font-bold">+200 pts</span>
                      </p>
                    </div>
                    {!hasLcUsername && (
                      <Link href={`/profile/${session?.user?.id}`}>
                        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-3 py-2 cursor-pointer hover:bg-yellow-500/20 transition-colors">
                          <IconAlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">Set LeetCode username</span>
                        </div>
                      </Link>
                    )}
                  </div>

                  {dsaLoading && (
                    <Card className="rounded-[2rem] border-border bg-card/30 p-8 flex items-center justify-center gap-3">
                      <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">Loading today&apos;s problem...</span>
                    </Card>
                  )}

                  {dsaError && (
                    <Card className="rounded-[2rem] border-red-500/20 bg-red-500/5 p-6">
                      <p className="text-sm text-red-400 font-medium">{dsaError}</p>
                      <Button onClick={fetchDsaData} variant="ghost" className="mt-3 rounded-2xl text-xs font-bold">
                        <IconRefresh className="w-3.5 h-3.5 mr-1.5" /> Retry
                      </Button>
                    </Card>
                  )}

                  {!dsaLoading && !dsaError && dsaProblem && (
                    <Card className={cn(
                      "relative overflow-hidden rounded-[2rem] border p-6 transition-all",
                      dsaSolvedToday
                        ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10"
                        : "border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"
                    )}>
                      {/* Glow */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Icon */}
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border",
                            dsaSolvedToday
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-yellow-500/10 border-yellow-500/20"
                          )}>
                            {dsaSolvedToday
                              ? <IconCheck className="w-7 h-7 text-emerald-400" />
                              : <span className="text-2xl">🧩</span>}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <Badge className={cn(
                                "text-[10px] font-black uppercase tracking-wider border px-2 py-0.5",
                                DSA_DIFFICULTY_COLOR[dsaProblem.difficulty]
                              )}>
                                {dsaProblem.difficulty}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                #{dsaProblem.questionId} · {dsaProblem.acRate}% acceptance
                              </span>
                              {dsaSolvedToday && (
                                <Badge className="text-[10px] font-black uppercase tracking-wider border px-2 py-0.5 text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                                  ✓ Solved Today
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-black text-lg tracking-tight leading-tight mb-2">
                              {dsaProblem.title}
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                              {dsaProblem.tags.slice(0, 4).map((tag) => (
                                <span key={tag} className="text-[10px] font-bold text-muted-foreground bg-secondary/50 border border-border rounded-full px-2.5 py-0.5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Points badge */}
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-2 self-start flex-shrink-0">
                          <IconStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-black text-yellow-400">+200 pts</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3 mt-5">
                        <a
                          href={dsaProblem.leetcodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full rounded-2xl h-11 font-bold border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 gap-2"
                          >
                            <IconExternalLink className="w-4 h-4" />
                            Open on LeetCode
                          </Button>
                        </a>

                        {!dsaSolvedToday ? (
                          <Button
                            onClick={verifyDsaSolution}
                            disabled={dsaVerifying}
                            className="flex-1 rounded-2xl h-11 font-bold shadow-lg shadow-emerald-500/10 gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300"
                            variant="outline"
                          >
                            {dsaVerifying ? (
                              <><IconLoader2 className="w-4 h-4 animate-spin" /> Verifying on LeetCode...</>
                            ) : (
                              <><IconShieldCheck className="w-4 h-4" /> Verify My Solution</>  
                            )}
                          </Button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <IconCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-black text-emerald-400">
                              +{dsaEarned || 200} pts awarded!
                            </span>
                          </div>
                        )}
                      </div>

                      {!hasLcUsername && (
                        <p className="mt-3 text-xs text-yellow-400/70 font-medium">
                          ⚠️ Set your LeetCode username in{" "}
                          <Link href={`/profile/${session?.user?.id}`} className="underline hover:text-yellow-400 transition-colors">
                            your profile
                          </Link>{" "}
                          to enable auto-verification.
                        </p>
                      )}
                    </Card>
                  )}
                </div>

                <div className="border-t border-border/50" />

                {/* ── GitHub Daily Commit Card ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black tracking-tight mb-0.5">Daily GitHub Commit</h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        Push code to GitHub today and earn <span className="text-green-400 font-bold">+100 pts</span>
                      </p>
                    </div>
                    {ghStatus.hasUsername && ghStatus.streak > 0 && (
                      <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-3 py-2">
                        <IconFlame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-black text-orange-400">{ghStatus.streak} day streak</span>
                      </div>
                    )}
                  </div>

                  {ghStatus.loading ? (
                    <Card className="rounded-[2rem] border-border bg-card/30 p-8 flex items-center justify-center gap-3">
                      <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">Checking GitHub activity...</span>
                    </Card>
                  ) : !ghStatus.hasUsername ? (
                    <Card className="rounded-[2rem] border-border bg-card/30 p-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
                          <IconBrandGithub className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-bold">No GitHub linked</p>
                          <p className="text-sm text-muted-foreground">Add your GitHub username to track daily commits.</p>
                        </div>
                      </div>
                      <Link href={`/profile/${session?.user?.id}`}>
                        <Button variant="outline" className="rounded-2xl font-bold gap-2 border-white/10 whitespace-nowrap">
                          <IconBrandGithub className="w-4 h-4" /> Link GitHub
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    <Card className={cn(
                      "relative overflow-hidden rounded-[2rem] border p-6 transition-all",
                      ghStatus.alreadyClaimed
                        ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10"
                        : ghStatus.committedToday
                          ? "border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5"
                          : "border-border bg-card/30"
                    )}>
                      <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0",
                            ghStatus.alreadyClaimed ? "bg-emerald-500/10 border-emerald-500/30" :
                            ghStatus.committedToday ? "bg-green-500/10 border-green-500/30" :
                            "bg-secondary/50 border-border"
                          )}>
                            {ghStatus.alreadyClaimed ? <IconCheck className="w-7 h-7 text-emerald-400" /> :
                             ghStatus.committedToday ? <IconGitCommit className="w-7 h-7 text-green-400" /> :
                             <IconBrandGithub className="w-7 h-7 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-black text-base">
                              {ghStatus.alreadyClaimed ? "Commit Claimed!" :
                               ghStatus.committedToday ? `${ghStatus.commitCount} commit${ghStatus.commitCount !== 1 ? "s" : ""} pushed today!` :
                               "No commits yet today"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{ghStatus.githubUsername} · {ghStatus.committedToday ? "GitHub activity detected" : "Push some code to claim!"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-2">
                            <IconStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-black text-yellow-400">+100 pts</span>
                          </div>
                          {!ghStatus.alreadyClaimed ? (
                            <Button
                              onClick={claimGithubCommit}
                              disabled={!ghStatus.committedToday || ghClaiming}
                              className={cn(
                                "rounded-2xl h-11 px-6 font-bold gap-2",
                                ghStatus.committedToday
                                  ? "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                                  : "opacity-40 cursor-not-allowed bg-secondary text-muted-foreground border border-border"
                              )}
                              variant="outline"
                            >
                              {ghClaiming ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconShieldCheck className="w-4 h-4" />}
                              {ghStatus.committedToday ? "Claim Reward" : "Not yet"}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2 h-11 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                              <IconCheck className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-black text-emerald-400">Claimed!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="border-t border-border/50" />

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
                    <h2 className="text-xl font-black tracking-tight">Today&apos;s Focus Challenges</h2>
                    
                    {/* WakaTime Status */}
                    <div className="flex items-center gap-2 bg-secondary/30 rounded-full px-4 py-2 border border-border">
                      <IconCode className="w-4 h-4 text-blue-400" />
                      {wtStats.loading ? (
                        <span className="text-xs font-bold text-muted-foreground animate-pulse">Checking WakaTime...</span>
                      ) : wtStats.hasKey ? (
                        <span className="text-xs font-bold">
                          Coded Today: <span className="text-blue-400">{(wtStats.totalSeconds / 60).toFixed(0)} mins</span>
                        </span>
                      ) : (
                        <Link href={`/profile/${session?.user?.id}`}>
                          <span className="text-xs font-bold text-muted-foreground hover:text-blue-400 transition-colors underline decoration-dotted">Link WakaTime to auto-verify</span>
                        </Link>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-6">
                    Start a focus session, or link WakaTime to instantly claim rewards based on your actual coding time!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {challenges.map((challenge) => {
                    const isDone = completedToday.includes(challenge.id);
                    const diff = DIFFICULTY_CONFIG[challenge.difficulty];

                    return (
                      <Card
                        key={challenge.id}
                        className={cn(
                          "relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-300 group",
                          isDone
                            ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
                            : `${challenge.borderColor} bg-gradient-to-br ${challenge.color} hover:scale-[1.02] hover:shadow-2xl cursor-pointer`
                        )}
                        onClick={() => !isDone && startChallenge(challenge)}
                      >
                        {/* Done badge overlay */}
                        {isDone && (
                          <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-3 py-1 flex items-center gap-1.5">
                            <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                              Done
                            </span>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-background/30 backdrop-blur-sm flex items-center justify-center text-3xl border border-white/5 flex-shrink-0">
                              {challenge.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-lg tracking-tight leading-tight">
                                {challenge.title}
                              </h3>
                              <p className="text-sm text-muted-foreground font-medium mt-0.5 line-clamp-2">
                                {challenge.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider border px-2 py-0.5",
                                  diff.bg,
                                  diff.color
                                )}
                              >
                                {diff.label}
                              </Badge>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <IconClock className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">
                                  {challenge.duration}m
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <IconStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-black text-yellow-400">
                                {challenge.points}
                              </span>
                              <span className="text-xs text-muted-foreground font-bold">
                                pts
                              </span>
                            </div>
                          </div>

                          {!isDone && (
                            <div className="flex gap-2">
                              {/* WakaTime Auto-Claim */}
                              {wtStats.hasKey && wtStats.totalSeconds >= challenge.duration * 60 ? (
                                <Button 
                                  onClick={(e) => claimWithWakatime(e, challenge)}
                                  disabled={wtVerifying === challenge.id}
                                  className="flex-1 rounded-xl h-11 font-black bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all"
                                >
                                  {wtVerifying === challenge.id ? <IconLoader2 className="w-4 h-4 mr-2 animate-spin" /> : <IconShieldCheck className="w-4 h-4 mr-2" />}
                                  Trust WakaTime
                                </Button>
                              ) : (
                                <Button className="flex-1 rounded-xl h-11 font-black bg-background/30 hover:bg-background/50 text-foreground border border-white/10 backdrop-blur-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                  <IconCode className="w-4 h-4 mr-2" />
                                  Start Timer
                                </Button>
                              )}
                            </div>
                          )}
                          {isDone && (
                            <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <IconCheck className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-black text-emerald-400">
                                Completed Today!
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Leaderboard */}
          <div className="space-y-6">
            {/* User's own rank/stats card */}
            <Card className="rounded-[2rem] border-border bg-gradient-to-br from-primary/10 to-brand-purple/10 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <IconBolt className="w-5 h-5 text-primary" />
                <h3 className="font-black tracking-tight">Your Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/30 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">
                    Total Points
                  </p>
                  <p className="text-2xl font-black text-primary">
                    {userStats.totalPoints.toLocaleString()}
                  </p>
                </div>
                <div className="bg-background/30 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">
                    Completed
                  </p>
                  <p className="text-2xl font-black text-foreground">
                    {userStats.completedCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IconFlame className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-medium">
                  {completedToday.length} of {challenges.length} done today
                </span>
              </div>
            </Card>

            {/* Leaderboard */}
            <Card className="rounded-[2rem] border-border bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-6 pb-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <IconCrown className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-black tracking-tight">Leaderboard</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Top grinders by points
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border">
                {leaderboard.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                    <IconTrophy className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground font-medium">
                      No one on the leaderboard yet.
                      <br />
                      <span className="text-primary font-bold">
                        Be the first to complete a challenge!
                      </span>
                    </p>
                  </div>
                )}
                {leaderboard.map((user, i) => {
                  const rankEmoji =
                    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                  return (
                    <div
                      key={user._id}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 transition-colors",
                        i < 3
                          ? "bg-gradient-to-r from-yellow-500/5 to-transparent"
                          : "hover:bg-secondary/20"
                      )}
                    >
                      {/* Rank */}
                      <div className="w-8 flex-shrink-0 flex items-center justify-center">
                        {rankEmoji ? (
                          <span className="text-xl">{rankEmoji}</span>
                        ) : (
                          <span className="text-sm font-black text-muted-foreground">
                            #{i + 1}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar className="w-9 h-9 ring-2 ring-border ring-offset-1 ring-offset-background">
                        <AvatarImage
                          src={
                            user.image ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                          }
                        />
                        <AvatarFallback className="text-xs font-black">
                          {user.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium truncate">
                          @{user.username || user.name}
                        </p>
                      </div>

                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={cn(
                            "text-sm font-black",
                            i === 0
                              ? "text-yellow-400"
                              : i === 1
                              ? "text-slate-300"
                              : i === 2
                              ? "text-amber-600"
                              : "text-foreground"
                          )}
                        >
                          {user.totalPoints.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          pts
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Tips Card */}
            <Card className="rounded-[2rem] border-border bg-card/30 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <IconFlame className="w-4 h-4 text-orange-400" />
                <h3 className="font-black text-sm tracking-tight">Grind Tips</h3>
              </div>
              <ul className="space-y-2">
                {[
                  "Keep this tab visible while coding",
                  "Each challenge resets daily at midnight",
                  "Higher difficulty = more points",
                  "Top 3 leaderboard gets special badge",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
