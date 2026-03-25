import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/* ── In-memory server-side cache ────────────────────── */
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30_000; // 30s

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}

/* ── GitHub GraphQL query ─────────────────────────────── */
const GH_CONTRIBUTIONS_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

function localISO(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/* ── Main aggregated stats endpoint ──────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Server-side cache check
    const cached = getCached(`stats:${userId}`);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
      });
    }

    const client = await clientPromise;
    const db = client.db();
    const userOid = new ObjectId(userId);

    // ── All DB queries in parallel ──────────────────────
    const [user, recentCompletions, leaderboardUsers] = await Promise.all([
      db.collection("users").findOne({ _id: userOid }),
      db.collection("challenge_completions")
        .find({ userId: userOid })
        .sort({ completedAt: -1 })
        .limit(5)
        .toArray(),
      db.collection("users")
        .find({}, {
          projection: {
            _id: 1, name: 1, username: 1,
            "challengeStats.totalPoints": 1,
          },
        })
        .sort({ "challengeStats.totalPoints": -1 })
        .limit(50)
        .toArray(),
    ]);

    // ── Challenge stats ─────────────────────────────────
    const challengeStats = {
      totalPoints: user?.challengeStats?.totalPoints ?? 0,
      completedCount: user?.challengeStats?.completedCount ?? 0,
      recentCompletions: recentCompletions.map(c => ({
        challengeId: c.challengeId,
        points: c.points,
        completedAt: c.completedAt,
      })),
    };

    // ── Leaderboard position ────────────────────────────
    const rankIdx = leaderboardUsers.findIndex(u => u._id.toString() === userId);
    const leaderPos = rankIdx !== -1
      ? { rank: rankIdx + 1, total: leaderboardUsers.length }
      : null;

    // ── External API calls in parallel ──────────────────
    const githubUsername = user?.githubUsername || null;
    const codetimeToken = user?.codetimeToken || null;
    const ghHeaders: HeadersInit = { "User-Agent": "GrindSync-App" };
    if (process.env.GITHUB_TOKEN) ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const [ghResult, codetimeResult, reposResult] = await Promise.allSettled([
      // GitHub commits + contributions
      githubUsername ? (async () => {
        const to = new Date(); to.setDate(to.getDate() + 1);
        const from = new Date(to); from.setFullYear(from.getFullYear() - 1);

        const [eventsRes, contribRes] = await Promise.all([
          fetch(`https://api.github.com/users/${githubUsername}/events?per_page=100`, {
            headers: ghHeaders,
            signal: AbortSignal.timeout(5000),
          }),
          process.env.GITHUB_TOKEN
            ? fetch("https://api.github.com/graphql", {
                method: "POST",
                headers: { ...ghHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: GH_CONTRIBUTIONS_QUERY,
                  variables: { login: githubUsername, from: from.toISOString(), to: to.toISOString() },
                }),
                signal: AbortSignal.timeout(5000),
              })
            : Promise.resolve(null),
        ]);

        const localMidnight = new Date(); localMidnight.setHours(0, 0, 0, 0);
        let committedToday = false;
        let commitCount = 0;

        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const todaysPushes = events.filter(
            (e: any) => e.type === "PushEvent" && new Date(e.created_at) >= localMidnight
          );
          committedToday = todaysPushes.length > 0;
          commitCount = todaysPushes.reduce((s: number, e: any) => s + (e.payload?.commits?.length || 1), 0);
        }

        // Parse contributions for streak
        const allDays: { date: string; count: number }[] = [];
        if (contribRes && contribRes.ok) {
          const json = await contribRes.json();
          const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
          if (calendar) {
            for (const week of calendar.weeks) {
              for (const day of week.contributionDays) {
                allDays.push({ date: day.date, count: day.contributionCount });
              }
            }
          }
        }

        const todayDate = new Date();
        const todayStr = localISO(todayDate);
        let currentStreak = 0;

        if (allDays.length > 0) {
          const todayData = allDays.find(a => a.date === todayStr);
          if (todayData && todayData.count > 0) committedToday = true;

          const checkDate = new Date(todayDate);
          while (true) {
            const iso = localISO(checkDate);
            const dayObj = allDays.find(a => a.date === iso);
            if (!dayObj) break;
            if (dayObj.count > 0) currentStreak++;
            else if (iso !== todayStr) break;
            checkDate.setDate(checkDate.getDate() - 1);
          }
        }

        const dbStreak = user?.githubStats?.commitStreak || 0;

        return {
          hasUsername: true,
          githubUsername,
          committedToday,
          commitCount,
          streak: Math.max(currentStreak, dbStreak),
        };
      })() : Promise.resolve({ hasUsername: false }),

      // CodeTime
      codetimeToken ? (async () => {
        const res = await fetch("https://api.software.com/api/v1/sessions?summary=true", {
          headers: { Authorization: `Bearer ${codetimeToken}`, "Content-Type": "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return { error: "CODETIME_ERROR" };
        const data = await res.json();
        const mins = data.sessionSummary?.activeCodeTimeMinutes || data.sessionSummary?.minutes || 0;
        return { totalSecondsToday: mins * 60 };
      })() : Promise.resolve({ error: "NO_CODETIME_KEY" }),

      // GitHub repos (for language breakdown)
      githubUsername ? (async () => {
        const res = await fetch(
          `https://api.github.com/users/${githubUsername}/repos?sort=pushed&per_page=12&type=owner`,
          { headers: ghHeaders, signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) return { repos: [], topLangs: [] };
        const data = await res.json();
        const repos = data
          .filter((r: any) => !r.fork)
          .map((r: any) => ({
            id: r.id, name: r.name, language: r.language,
            stars: r.stargazers_count, url: r.html_url,
          }));

        // Compute top languages
        const counts: Record<string, number> = {};
        for (const r of repos) if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topLangs = sorted.map(([lang, count]) => ({
          lang, count,
          repoPct: Math.round((count / repos.length) * 100),
        }));

        return { repos, topLangs };
      })() : Promise.resolve({ repos: [], topLangs: [] }),
    ]);

    // ── Assemble response ─────────────────────────────
    const ghData = ghResult.status === "fulfilled" ? ghResult.value : { hasUsername: !!githubUsername };
    const ctData = codetimeResult.status === "fulfilled" ? codetimeResult.value : { error: "CODETIME_ERROR" };
    const reposData = reposResult.status === "fulfilled" ? reposResult.value : { repos: [], topLangs: [] };

    const result = {
      challengeStats,
      githubStatus: ghData,
      wakaStats: ctData,
      leaderPos,
      repos: (reposData as any).repos ?? [],
      topLangs: (reposData as any).topLangs ?? [],
    };

    setCache(`stats:${userId}`, result);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("Stats aggregated API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
