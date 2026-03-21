import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Checks if authenticated user committed today on GitHub, and awards points
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await clientPromise;
    const db = client.db();
    const userId = new ObjectId(session.user.id);

    const user = await db.collection("users").findOne({ _id: userId });
    const githubUsername = user?.githubUsername;

    if (!githubUsername) {
      return NextResponse.json({ error: "NO_GITHUB", message: "Add your GitHub username to your profile first." }, { status: 400 });
    }

    // Check if already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await db.collection("challenge_completions").findOne({
      userId,
      challengeId: "github-daily-commit",
      completedAt: { $gte: today },
    });

    if (existing) {
      return NextResponse.json({ error: "Already claimed today", alreadyDone: true }, { status: 409 });
    }

    // Query GitHub events API to check for today's push activity
    const headers: HeadersInit = { "User-Agent": "GrindSync-App" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const eventsRes = await fetch(
      `https://api.github.com/users/${githubUsername}/events?per_page=30`,
      { headers }
    );

    if (!eventsRes.ok) {
      return NextResponse.json({ error: "GITHUB_ERROR", message: "Could not reach GitHub. Try again." }, { status: 500 });
    }

    const events = await eventsRes.json();
    const todayStr = new Date().toISOString().split("T")[0];

    const committedToday = events.some(
      (e: any) => e.type === "PushEvent" && e.created_at?.startsWith(todayStr)
    );

    if (!committedToday) {
      return NextResponse.json({
        error: "NO_COMMIT_TODAY",
        message: `No push events found for @${githubUsername} today. Push some code first!`,
      }, { status: 400 });
    }

    // Count commit events for streak tracking
    const POINTS = 100;

    await db.collection("challenge_completions").insertOne({
      userId,
      challengeId: "github-daily-commit",
      elapsedSeconds: 0,
      points: POINTS,
      completedAt: new Date(),
    });

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $inc: {
          "challengeStats.totalPoints": POINTS,
          "challengeStats.completedCount": 1,
          "githubStats.commitStreak": 1,
          "githubStats.totalCommitDays": 1,
        },
        $set: {
          "githubStats.lastCommitDate": new Date(),
        },
      }
    );

    const updatedUser = await db.collection("users").findOne({ _id: userId }, { projection: { challengeStats: 1 } });

    return NextResponse.json({
      success: true,
      pointsEarned: POINTS,
      totalPoints: updatedUser?.challengeStats?.totalPoints ?? POINTS,
    });
  } catch (err) {
    console.error("GitHub commits error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET: check today's commit status + streak, no award
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await clientPromise;
    const db = client.db();
    const userId = new ObjectId(session.user.id);

    const user = await db.collection("users").findOne({ _id: userId });
    const githubUsername = user?.githubUsername;
    if (!githubUsername) return NextResponse.json({ hasUsername: false });

    const headers: HeadersInit = { "User-Agent": "GrindSync-App" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const eventsRes = await fetch(
      `https://api.github.com/users/${githubUsername}/events?per_page=30`,
      { headers, next: { revalidate: 120 } }
    );

    if (!eventsRes.ok) return NextResponse.json({ hasUsername: true, committedToday: false, error: "GitHub API error" });

    const events = await eventsRes.json();
    const todayStr = new Date().toISOString().split("T")[0];

    const todaysPushes = events.filter(
      (e: any) => e.type === "PushEvent" && e.created_at?.startsWith(todayStr)
    );

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const alreadyClaimed = !!(await db.collection("challenge_completions").findOne({
      userId,
      challengeId: "github-daily-commit",
      completedAt: { $gte: today },
    }));

    const streak = user?.githubStats?.commitStreak || 0;

    return NextResponse.json({
      hasUsername: true,
      githubUsername,
      committedToday: todaysPushes.length > 0,
      commitCount: todaysPushes.reduce((sum: number, e: any) => sum + (e.payload?.commits?.length || 0), 0),
      alreadyClaimed,
      streak,
    });
  } catch (err) {
    console.error("GitHub GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
