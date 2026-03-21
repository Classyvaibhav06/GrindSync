import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const userId = new ObjectId(session.user.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's completions
    const todayCompletions = await db
      .collection("challenge_completions")
      .find({ userId, completedAt: { $gte: today } })
      .toArray();

    const completedToday = todayCompletions.map((c) => c.challengeId);

    // Get all-time completions count & total points
    const user = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { challengeStats: 1 } });

    // Get recent completions (last 5)
    const recentCompletions = await db
      .collection("challenge_completions")
      .find({ userId })
      .sort({ completedAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      completedToday,
      totalPoints: user?.challengeStats?.totalPoints ?? 0,
      completedCount: user?.challengeStats?.completedCount ?? 0,
      recentCompletions,
    });
  } catch (error) {
    console.error("User challenge stats error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
