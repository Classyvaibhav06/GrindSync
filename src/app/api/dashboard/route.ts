import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

import { getCache, setCache } from "@/lib/redis";

const CACHE_TTL = 30; // 30 seconds for dashboard data
const DSA_TTL = 86400; // 24 hours for daily challenge

/* ── GitHub GraphQL query (for contributions) ─────────── */
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

/* ── LeetCode daily DSA ──────────────────────────────── */
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const EASY_QUERY = `
  query questionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      totalNum
      data {
        questionFrontendId
        titleSlug
        title
        difficulty
        topicTags { name }
        acRate
        isPaidOnly
      }
    }
  }
`;

const FALLBACK_EASY = [
  { id: "1",   slug: "two-sum",            title: "Two Sum",            tags: ["Array","Hash Table"] },
  { id: "20",  slug: "valid-parentheses",  title: "Valid Parentheses",  tags: ["String","Stack"] },
  { id: "21",  slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists", tags: ["Linked List","Recursion"] },
  { id: "70",  slug: "climbing-stairs",    title: "Climbing Stairs",    tags: ["Math","DP","Memoization"] },
  { id: "121", slug: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", tags: ["Array","DP"] },
  { id: "136", slug: "single-number",      title: "Single Number",      tags: ["Array","Bit Manipulation"] },
  { id: "206", slug: "reverse-linked-list", title: "Reverse Linked List", tags: ["Linked List","Recursion"] },
  { id: "217", slug: "contains-duplicate", title: "Contains Duplicate", tags: ["Array","Hash Table","Sorting"] },
  { id: "226", slug: "invert-binary-tree", title: "Invert Binary Tree", tags: ["Tree","DFS","BFS"] },
  { id: "283", slug: "move-zeroes",        title: "Move Zeroes",        tags: ["Array","Two Pointers"] },
];

const CHALLENGES_LIST = [
  { id: "code-30",  title: "Code for 30 Minutes", icon: "⚡", points: 150,  difficulty: "Easy" },
  { id: "code-60",  title: "Code for 1 Hour",     icon: "🔥", points: 350,  difficulty: "Medium" },
  { id: "code-120", title: "Code for 2 Hours",    icon: "💎", points: 800,  difficulty: "Hard" },
  { id: "code-180", title: "Code for 3 Hours",    icon: "👑", points: 1500, difficulty: "Elite" },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayUTC(): string {
  // Use IST (Kolkata) to synchronize with India midnight
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function localISO(dt: Date) {
  // Always use IST to ensure the streak calculations align with the user's local day
  return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/* ── Main aggregated endpoint ────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    // ✅ Single session check (instead of 7 separate ones)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check Redis cache
    const cacheKey = `dashboard:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
      });
    }

    // ✅ Single DB connection (instead of 7 separate ones)
    const client = await clientPromise;
    const db = client.db();
    const userOid = new ObjectId(userId);

    // ── Fire ALL queries in parallel ──────────────────
    const [
      user,
      todayCompletions,
      recentCompletions,
      leaderboardUsers,
      onlineUsers,
    ] = await Promise.all([
      // 1. User doc (needed for GitHub username, codetime token, stats)
      db.collection("users").findOne({ _id: userOid }),

      // 2. Today's challenge completions
      (() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return db.collection("challenge_completions")
          .find({ userId: userOid, completedAt: { $gte: today } })
          .toArray();
      })(),

      // 3. Recent completions (last 5)
      db.collection("challenge_completions")
        .find({ userId: userOid })
        .sort({ completedAt: -1 })
        .limit(5)
        .toArray(),

      // 4. Leaderboard (top 10)
      db.collection("users")
        .find({}, {
          projection: {
            _id: 1, name: 1, username: 1,
            "challengeStats.totalPoints": 1,
            "challengeStats.completedCount": 1,
          },
        })
        .sort({ "challengeStats.totalPoints": -1 })
        .limit(10)
        .toArray(),

      // 5. Online users (active in last 2 mins)
      db.collection("users")
        .find(
          { lastActive: { $gte: new Date(Date.now() - 2 * 60 * 1000) }, _id: { $ne: userOid } },
          { projection: { name: 1, username: 1, lastActive: 1 } }
        )
        .sort({ lastActive: -1 })
        .limit(50)
        .toArray(),
    ]);

    // ── Heartbeat (fire and forget) ───────────────────
    db.collection("users").updateOne(
      { _id: userOid },
      { $set: { lastActive: new Date() } }
    ).catch(() => {});

    // ── Build challenge stats ─────────────────────────
    const challengeStats = {
      totalPoints: user?.challengeStats?.totalPoints ?? 0,
      completedCount: user?.challengeStats?.completedCount ?? 0,
    };

    // ── Build leaderboard ─────────────────────────────
    const leaderboard = leaderboardUsers.map((u, i) => ({
      rank: i + 1,
      id: u._id.toString(),
      name: u.name || "Anonymous",
      username: u.username || u.name || "user",
      points: u.challengeStats?.totalPoints ?? 0,
      completedCount: u.challengeStats?.completedCount ?? 0,
    }));
    const rank = leaderboard.findIndex(e => e.id === userId);

    // ── External API calls in parallel ────────────────
    const githubUsername = user?.githubUsername || null;
    const codetimeToken = user?.codetimeToken || null;

    const [ghResult, codetimeResult, dsaResult] = await Promise.allSettled([
      // GitHub: events + contributions in parallel
      githubUsername ? (async () => {
        const ghHeaders: HeadersInit = { "User-Agent": "GrindSync-App" };
        if (process.env.GITHUB_TOKEN) ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

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
                headers: {
                  ...ghHeaders,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: GH_CONTRIBUTIONS_QUERY,
                  variables: { login: githubUsername, from: from.toISOString(), to: to.toISOString() },
                }),
                signal: AbortSignal.timeout(5000),
              })
            : Promise.resolve(null),
        ]);

        // Parse events
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

        // Parse contributions
        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const allDays: { date: string; count: number }[] = [];
        let contribTotal = 0;

        if (contribRes && contribRes.ok) {
          const json = await contribRes.json();
          const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
          if (calendar) {
            contribTotal = calendar.totalContributions;
            for (const week of calendar.weeks) {
              for (const day of week.contributionDays) {
                allDays.push({ date: day.date, count: day.contributionCount });
              }
            }
          }
        }

        // Build streak
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
        const finalStreak = Math.max(currentStreak, dbStreak);

        // Build 7-day chart
        const last7: { day: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d2 = new Date(todayDate);
          d2.setDate(todayDate.getDate() - i);
          const iso = localISO(d2);
          const found = allDays.find(a => a.date === iso);
          last7.push({ day: DAY_LABELS[d2.getDay()], count: found?.count ?? 0 });
        }
        const maxCount = Math.max(...last7.map(x => x.count), 1);
        const focusData = last7.map(x => ({
          day: x.day, count: x.count,
          h: Math.max(4, Math.round((x.count / maxCount) * 100)),
        }));
        const weeklyCommits = last7.reduce((s, x) => s + x.count, 0);

        return {
          hasUsername: true,
          githubUsername,
          committedToday,
          commitCount,
          streak: finalStreak,
          focusData,
          weeklyCommits,
        };
      })() : Promise.resolve({
        hasUsername: false, githubUsername: null,
        committedToday: false, commitCount: 0, streak: 0,
        focusData: [], weeklyCommits: 0,
      }),

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

      (async () => {
        const dateKey = todayUTC();
        const dsaKey = `dsa:${dateKey}`;
        const dsaCached = await getCache(dsaKey);
        if (dsaCached) return dsaCached;

        try {
          const res = await fetch(LEETCODE_GRAPHQL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Referer: "https://leetcode.com", Origin: "https://leetcode.com",
            },
            body: JSON.stringify({
              query: EASY_QUERY,
              variables: { categorySlug: "", skip: 0, limit: 50, filters: { difficulty: "EASY" } },
            }),
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const json = await res.json();
            const free = (json?.data?.questionList?.data ?? [])
              .filter((q: any) => !q.isPaidOnly && q.difficulty === "Easy");
            if (free.length > 0) {
              const rand = seededRandom(parseInt(dateKey.replace(/-/g, ""), 10));
              const q = free[Math.floor(rand() * free.length)];
              const payload = {
                date: dateKey, questionId: q.questionFrontendId,
                titleSlug: q.titleSlug, title: q.title, difficulty: "Easy",
                tags: (q.topicTags || []).map((t: { name: string }) => t.name),
                acRate: Math.round(q.acRate),
                leetcodeUrl: `https://leetcode.com/problems/${q.titleSlug}/`,
              };
              setCache(dsaKey, payload, DSA_TTL);
              return payload;
            }
          }
        } catch {}

        // Fallback
        const rand = seededRandom(parseInt(dateKey.replace(/-/g, ""), 10));
        const f = FALLBACK_EASY[Math.floor(rand() * FALLBACK_EASY.length)];
        const payload = {
          date: dateKey, questionId: f.id, titleSlug: f.slug,
          title: f.title, difficulty: "Easy", tags: f.tags, acRate: 55,
          leetcodeUrl: `https://leetcode.com/problems/${f.slug}/`,
        };
        setCache(dsaKey, payload, DSA_TTL);
        return payload;
      })(),
    ]);

    // ── Assemble response ─────────────────────────────
    const ghData = ghResult.status === "fulfilled" ? ghResult.value : {
      hasUsername: !!githubUsername, githubUsername,
      committedToday: false, commitCount: 0,
      streak: user?.githubStats?.commitStreak || 0,
      focusData: [], weeklyCommits: 0,
    };

    const ctData = codetimeResult.status === "fulfilled" ? codetimeResult.value : { error: "CODETIME_ERROR" };
    const dsaData = dsaResult.status === "fulfilled" ? dsaResult.value : null;

    const result = {
      challengeStats,
      completedToday: todayCompletions.map(c => c.challengeId),
      recentActivity: recentCompletions.slice(0, 3),
      github: ghData,
      codetime: ctData,
      rank: rank !== -1 ? rank + 1 : null,
      onlineCount: (onlineUsers.length) + 1,
      dsaDaily: dsaData,
      challenges: CHALLENGES_LIST.slice(0, 3),
    };

    // Cache the result in Redis
    await setCache(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("Dashboard aggregated API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
