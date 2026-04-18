import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCache, setCache } from "@/lib/redis";

/* ── Types ─────────────────────────────────────────── */
export interface ContributionDay {
  date: string;       // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/* ── Level helper ───────────────────────────────────── */
function toLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3)  return 1;
  if (count <= 6)  return 2;
  if (count <= 9)  return 3;
  return 4;
}

/* ── GitHub GraphQL query ───────────────────────────── */
const GH_QUERY = `
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    /* ── Resolve GitHub username ─────────────────────── */
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const githubUsername: string | null = user?.githubUsername || null;

    if (!githubUsername) {
      return NextResponse.json({ error: "NO_GITHUB", weeks: [], total: 0 }, { status: 200 });
    }

    /* ── Check Redis Cache ───────────────────────────── */
    const cacheKey = `github:contributions:${githubUsername}`;
    const cachedData = await getCache<{ weeks: any[]; total: number }>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ ...cachedData, githubUsername });
    }

    /* ── Call GitHub GraphQL API ─────────────────────── */
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      // Fallback: scrape the SVG contribution graph from GitHub's public API
      return fetchPublicContributions(githubUsername);
    }

    // Add 1 day to `to` to safely encompass current day in ahead timezones (like IST)
    const to = new Date();
    to.setDate(to.getDate() + 1);
    
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 1);

    const ghRes = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "GrindSync-App",
      },
      body: JSON.stringify({
        query: GH_QUERY,
        variables: {
          login: githubUsername,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
      next: { revalidate: 60 }, // Reduced from 3600 (1hr) to 60s so today's contributions show instantly
    });

    if (!ghRes.ok) {
      if (ghRes.status === 401) return NextResponse.json({ error: "GITHUB_UNAUTHORIZED", weeks: [], total: 0 });
      return NextResponse.json({ error: "GITHUB_ERROR", weeks: [], total: 0 });
    }

    const json = await ghRes.json();
    const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;

    if (!calendar) {
      return NextResponse.json({ error: "GITHUB_NOT_FOUND", weeks: [], total: 0 });
    }

    /* ── Shape data ──────────────────────────────────── */
    const weeks: ContributionDay[][] = calendar.weeks.map((w: any) =>
      w.contributionDays.map((d: any) => ({
        date:  d.date,
        count: d.contributionCount,
        level: toLevel(d.contributionCount),
      }))
    );

    const result = {
      weeks,
      total: calendar.totalContributions,
    };

    // Cache for 5 minutes (300 seconds)
    await setCache(cacheKey, result, 300);

    return NextResponse.json({
      ...result,
      githubUsername,
    });
  } catch (err) {
    console.error("Contributions error:", err);
    return NextResponse.json({ error: "Internal Server Error", weeks: [], total: 0 }, { status: 500 });
  }
}

/* ── Fallback: no token — return deterministic fake data ─ */
async function fetchPublicContributions(username: string) {
  // Without a GitHub token, the contribution GraphQL API isn't available.
  // Return a helpful signal so the UI can show a "link token" nudge.
  return NextResponse.json({
    error: "NO_TOKEN",
    weeks: [],
    total: 0,
    githubUsername: username,
  });
}
