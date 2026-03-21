import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

const CHALLENGE_POINTS: Record<string, number> = {
  "code-30": 150,
  "code-60": 350,
  "code-120": 800,
  "code-180": 1500,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { challengeId, elapsedSeconds } = body;

    if (!challengeId || !CHALLENGE_POINTS[challengeId]) {
      return NextResponse.json(
        { error: "Invalid challenge" },
        { status: 400 }
      );
    }

    const points = CHALLENGE_POINTS[challengeId];
    const client = await clientPromise;
    const db = client.db();

    const userId = new ObjectId(session.user.id);

    // Check if user already completed this challenge today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCompletion = await db
      .collection("challenge_completions")
      .findOne({
        userId,
        challengeId,
        completedAt: { $gte: today },
      });

    if (existingCompletion) {
      return NextResponse.json(
        { error: "Already completed today", alreadyDone: true },
        { status: 409 }
      );
    }

    // Record completion
    await db.collection("challenge_completions").insertOne({
      userId,
      challengeId,
      elapsedSeconds,
      points,
      completedAt: new Date(),
    });

    // Update user's challenge stats
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $inc: {
          "challengeStats.totalPoints": points,
          "challengeStats.completedCount": 1,
        },
        $set: {
          "challengeStats.lastCompletedAt": new Date(),
        },
      }
    );

    // Get updated total
    const updatedUser = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { challengeStats: 1 } });

    return NextResponse.json({
      success: true,
      pointsEarned: points,
      totalPoints: updatedUser?.challengeStats?.totalPoints ?? points,
    });
  } catch (error) {
    console.error("Challenge complete error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
