import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

const UNITS = ["problems", "hours", "commits", "custom"];

// IST day key, same convention the dashboard/streak logic uses.
function istDayKey(d = new Date()) {
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

// GET /api/goals — the caller's goals + today's automatic progress numbers.
// DAILY goals are lazily reset when a new IST day starts.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();
    const today = istDayKey();

    // Lazy daily reset
    await db.collection("goals").updateMany(
      { userId: uid, type: "DAILY", lastProgressDate: { $ne: today } },
      { $set: { progress: 0, lastProgressDate: today } }
    );

    const goals = await db
      .collection("goals")
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Today's automatic numbers (powering the progress strip)
    const [todayCompletions, user] = await Promise.all([
      db
        .collection("challenge_completions")
        .find({ userId: uid, completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
        .toArray(),
      db.collection("users").findOne({ _id: uid }, { projection: { dsaSolvedDates: 1 } }),
    ]);

    const dsaSolved = user?.dsaSolvedDates ?? [];
    const commitsToday = todayCompletions.filter((c) => c.challengeId === "github-daily-commit").length;
    const challengesToday = todayCompletions.filter((c) => c.challengeId !== "github-daily-commit").length;
    const secondsToday = todayCompletions.reduce((acc, c) => acc + (c.elapsedSeconds || 0), 0);

    return NextResponse.json({
      goals: goals.map((g) => ({
        _id: g._id.toString(),
        title: g.title,
        type: g.type,
        target: g.target,
        unit: g.unit,
        progress: g.progress,
        deadline: g.deadline ?? null,
        completedAt: g.completedAt ?? null,
        createdAt: g.createdAt,
      })),
      todayAuto: {
        problemsSolved: dsaSolved.includes(today) ? 1 : 0,
        commits: commitsToday,
        challengesCompleted: challengesToday,
        studySeconds: secondsToday,
      },
    });
  } catch (error) {
    console.error("Goals list error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/goals — create a goal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Goal title is required (max 120 chars)" }, { status: 400 });
    }

    const type = body.type === "DEADLINE" ? "DEADLINE" : "DAILY";
    const unit = UNITS.includes(body.unit) ? body.unit : "custom";
    const target = Number(body.target);
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: "Target must be a positive number" }, { status: 400 });
    }

    let deadline: Date | null = null;
    if (type === "DEADLINE") {
      if (!body.deadline) {
        return NextResponse.json({ error: "Deadline goals need a deadline date" }, { status: 400 });
      }
      deadline = new Date(body.deadline);
      if (isNaN(deadline.getTime())) {
        return NextResponse.json({ error: "Invalid deadline date" }, { status: 400 });
      }
    }

    const doc = {
      userId: new ObjectId(session.user.id),
      title,
      type,
      unit,
      target,
      progress: 0,
      lastProgressDate: istDayKey(),
      deadline,
      completedAt: null,
      createdAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("goals").insertOne(doc);

    return NextResponse.json({ goal: { _id: result.insertedId.toString(), ...doc, userId: doc.userId.toString() } });
  } catch (error) {
    console.error("Goal create error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
