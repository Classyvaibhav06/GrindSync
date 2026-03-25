import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/* ── In-memory cache ────────────────────────────────── */
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 20_000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}

/* ── Challenges list (static) ───────────────────────── */
const CHALLENGES = [
  { id: "code-30",  title: "Code for 30 Minutes", description: "Start a coding session and grind for 30 continuous minutes.", icon: "⚡", category: "Coding", duration: 30,  points: 150,  difficulty: "Easy",   color: "from-blue-500/20 to-cyan-500/20",   borderColor: "border-blue-500/30" },
  { id: "code-60",  title: "Code for 1 Hour",     description: "A full hour of deep focus coding. Push your limits.",        icon: "🔥", category: "Coding", duration: 60,  points: 350,  difficulty: "Medium", color: "from-orange-500/20 to-red-500/20",   borderColor: "border-orange-500/30" },
  { id: "code-120", title: "Code for 2 Hours",    description: "Two hours of uninterrupted deep work. For the elite.",      icon: "💎", category: "Coding", duration: 120, points: 800,  difficulty: "Hard",   color: "from-purple-500/20 to-pink-500/20", borderColor: "border-purple-500/30" },
  { id: "code-180", title: "Code for 3 Hours",    description: "Three hours straight. Only the truly dedicated dare.",      icon: "👑", category: "Coding", duration: 180, points: 1500, difficulty: "Elite",  color: "from-yellow-500/20 to-orange-500/20", borderColor: "border-yellow-500/30" },
];

/* ── DSA helpers ─────────────────────────────────────── */
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const EASY_QUERY = `
  query questionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      totalNum
      data { questionFrontendId titleSlug title difficulty topicTags { name } acRate isPaidOnly }
    }
  }
`;
const FALLBACK_EASY = [
  { id: "1",   slug: "two-sum",            title: "Two Sum",            tags: ["Array","Hash Table"] },
  { id: "20",  slug: "valid-parentheses",  title: "Valid Parentheses",  tags: ["String","Stack"] },
  { id: "70",  slug: "climbing-stairs",    title: "Climbing Stairs",    tags: ["Math","DP"] },
  { id: "121", slug: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", tags: ["Array","DP"] },
  { id: "206", slug: "reverse-linked-list", title: "Reverse Linked List", tags: ["Linked List"] },
  { id: "283", slug: "move-zeroes",        title: "Move Zeroes",        tags: ["Array","Two Pointers"] },
];
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s + 0x6d2b79f5)|0; let t = Math.imul(s^(s>>>15),1|s); t = (t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
}
function todayUTC(): string {
  // Use IST (Kolkata) to synchronize with India midnight
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function localISO(dt: Date) {
  // Always use IST to ensure the streak calculations align with the user's local day
  return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/* ── GitHub contributions query ──────────────────────── */
const GH_CONTRIB_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

/* ── Aggregated endpoint ─────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const cached = getCached(`challenges:${userId}`);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
      });
    }

    const client = await clientPromise;
    const db = client.db();
    const userOid = new ObjectId(userId);

    // ── All DB queries in parallel ──────────────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [user, todayCompletions, leaderboardUsers] = await Promise.all([
      db.collection("users").findOne({ _id: userOid }),
      db.collection("challenge_completions")
        .find({ userId: userOid, completedAt: { $gte: today } })
        .toArray(),
      db.collection("users")
        .aggregate([
          { $match: { "challengeStats.totalPoints": { $gt: 0 } } },
          { $project: { name: 1, username: 1, image: 1, totalPoints: "$challengeStats.totalPoints", completedChallenges: "$challengeStats.completedCount" } },
          { $sort: { totalPoints: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
    ]);

    const completedToday = todayCompletions.map(c => c.challengeId);
    const userStats = {
      totalPoints: user?.challengeStats?.totalPoints ?? 0,
      completedCount: user?.challengeStats?.completedCount ?? 0,
    };

    // ── External APIs in parallel ───────────────────────
    const githubUsername = user?.githubUsername || null;
    const codetimeToken = user?.codetimeToken || null;
    const ghHeaders: HeadersInit = { "User-Agent": "GrindSync-App" };
    if (process.env.GITHUB_TOKEN) ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const [dsaResult, ghResult, ctResult, dsaSolvedResult] = await Promise.allSettled([
      // DSA daily
      (async () => {
        const dateKey = todayUTC();
        const dsaCached = getCached(`dsa:${dateKey}`);
        if (dsaCached) return dsaCached;
        try {
          const res = await fetch(LEETCODE_GRAPHQL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", Referer: "https://leetcode.com", Origin: "https://leetcode.com" },
            body: JSON.stringify({ query: EASY_QUERY, variables: { categorySlug: "", skip: 0, limit: 50, filters: { difficulty: "EASY" } } }),
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const json = await res.json();
            const free = (json?.data?.questionList?.data ?? []).filter((q: any) => !q.isPaidOnly && q.difficulty === "Easy");
            if (free.length > 0) {
              const rand = seededRandom(parseInt(dateKey.replace(/-/g,""),10));
              const q = free[Math.floor(rand() * free.length)];
              const payload = { date: dateKey, questionId: q.questionFrontendId, titleSlug: q.titleSlug, title: q.title, difficulty: "Easy", tags: (q.topicTags||[]).map((t:{name:string})=>t.name), acRate: Math.round(q.acRate), leetcodeUrl: `https://leetcode.com/problems/${q.titleSlug}/` };
              setCache(`dsa:${dateKey}`, payload);
              return payload;
            }
          }
        } catch {}
        const rand = seededRandom(parseInt(dateKey.replace(/-/g,""),10));
        const f = FALLBACK_EASY[Math.floor(rand()*FALLBACK_EASY.length)];
        const payload = { date: dateKey, questionId: f.id, titleSlug: f.slug, title: f.title, difficulty: "Easy", tags: f.tags, acRate: 55, leetcodeUrl: `https://leetcode.com/problems/${f.slug}/` };
        setCache(`dsa:${dateKey}`, payload);
        return payload;
      })(),

      // GitHub commits + contributions
      githubUsername ? (async () => {
        const to = new Date(); to.setDate(to.getDate()+1);
        const from = new Date(to); from.setFullYear(from.getFullYear()-1);
        const [eventsRes, contribRes] = await Promise.all([
          fetch(`https://api.github.com/users/${githubUsername}/events?per_page=100`, { headers: ghHeaders, signal: AbortSignal.timeout(5000) }),
          process.env.GITHUB_TOKEN
            ? fetch("https://api.github.com/graphql", { method: "POST", headers: { ...ghHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ query: GH_CONTRIB_QUERY, variables: { login: githubUsername, from: from.toISOString(), to: to.toISOString() } }), signal: AbortSignal.timeout(5000) })
            : Promise.resolve(null),
        ]);
        const localMidnight = new Date(); localMidnight.setHours(0,0,0,0);
        let committedToday = false, commitCount = 0;
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const pushes = events.filter((e:any) => e.type === "PushEvent" && new Date(e.created_at) >= localMidnight);
          committedToday = pushes.length > 0;
          commitCount = pushes.reduce((s:number,e:any) => s + (e.payload?.commits?.length || 1), 0);
        }
        const allDays: {date:string;count:number}[] = [];
        if (contribRes && contribRes.ok) {
          const json = await contribRes.json();
          const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
          if (cal) for (const w of cal.weeks) for (const d of w.contributionDays) allDays.push({date:d.date,count:d.contributionCount});
        }
        const todayStr = localISO(new Date());
        let streak = 0;
        if (allDays.length > 0) {
          const td = allDays.find(a=>a.date===todayStr);
          if (td && td.count>0) committedToday = true;
          const ck = new Date();
          while (true) { const iso=localISO(ck); const d=allDays.find(a=>a.date===iso); if(!d) break; if(d.count>0) streak++; else if(iso!==todayStr) break; ck.setDate(ck.getDate()-1); }
        }
        const alreadyClaimed = completedToday.includes("github-daily-commit");
        return { hasUsername: true, githubUsername, committedToday, commitCount, streak: Math.max(streak, user?.githubStats?.commitStreak||0), alreadyClaimed, loading: false };
      })() : Promise.resolve({ hasUsername: false, committedToday: false, commitCount: 0, alreadyClaimed: false, streak: 0, loading: false }),

      // CodeTime
      codetimeToken ? (async () => {
        const res = await fetch("https://api.software.com/api/v1/sessions?summary=true", { headers: { Authorization: `Bearer ${codetimeToken}`, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
        if (!res.ok) return { totalSeconds: 0, error: "CODETIME_ERROR", loading: false, hasKey: true };
        const data = await res.json();
        const mins = data.sessionSummary?.activeCodeTimeMinutes || data.sessionSummary?.minutes || 0;
        return { totalSeconds: mins*60, error: null, loading: false, hasKey: true };
      })() : Promise.resolve({ totalSeconds: 0, error: null, loading: false, hasKey: false }),

      // DSA solved today check
      (async () => {
        const dateKey = todayUTC();
        const solvedDates: string[] = user?.dsaSolvedDates || [];
        return { dsaSolvedToday: solvedDates.includes(dateKey), hasLcUsername: !!user?.leetcodeUsername };
      })(),
    ]);

    const result = {
      challenges: CHALLENGES,
      leaderboard: leaderboardUsers,
      completedToday,
      userStats,
      dsaProblem: dsaResult.status === "fulfilled" ? dsaResult.value : null,
      githubStatus: ghResult.status === "fulfilled" ? ghResult.value : { hasUsername: false, committedToday: false, commitCount: 0, alreadyClaimed: false, streak: 0, loading: false },
      codetime: ctResult.status === "fulfilled" ? ctResult.value : { totalSeconds: 0, error: null, loading: false, hasKey: false },
      dsaSolved: dsaSolvedResult.status === "fulfilled" ? dsaSolvedResult.value : { dsaSolvedToday: false, hasLcUsername: true },
    };

    setCache(`challenges:${userId}`, result);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
    });
  } catch (err) {
    console.error("Challenges aggregated API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
