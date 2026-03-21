import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Pre-defined challenges list
const CHALLENGES = [
  {
    id: "code-30",
    title: "Code for 30 Minutes",
    description: "Start a coding session and grind for 30 continuous minutes.",
    icon: "⚡",
    category: "Coding",
    duration: 30, // in minutes
    points: 150,
    difficulty: "Easy",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
  },
  {
    id: "code-60",
    title: "Code for 1 Hour",
    description: "A full hour of deep focus coding. Push your limits.",
    icon: "🔥",
    category: "Coding",
    duration: 60,
    points: 350,
    difficulty: "Medium",
    color: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/30",
  },
  {
    id: "code-120",
    title: "Code for 2 Hours",
    description: "Two hours of uninterrupted deep work. For the elite.",
    icon: "💎",
    category: "Coding",
    duration: 120,
    points: 800,
    difficulty: "Hard",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
  },
  {
    id: "code-180",
    title: "Code for 3 Hours",
    description: "Three hours straight. Only the truly dedicated dare to try.",
    icon: "👑",
    category: "Coding",
    duration: 180,
    points: 1500,
    difficulty: "Elite",
    color: "from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-500/30",
  },
];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Get leaderboard
    const leaderboard = await db
      .collection("users")
      .aggregate([
        {
          $match: {
            "challengeStats.totalPoints": { $gt: 0 },
          },
        },
        {
          $project: {
            name: 1,
            username: 1,
            image: 1,
            totalPoints: "$challengeStats.totalPoints",
            completedChallenges: "$challengeStats.completedCount",
          },
        },
        { $sort: { totalPoints: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    return NextResponse.json({
      challenges: CHALLENGES,
      leaderboard,
    });
  } catch (error) {
    console.error("Challenges fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
