import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const users = await db
      .collection("users")
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            username: 1,
            image: 1,
            "challengeStats.totalPoints": 1,
            "challengeStats.completedCount": 1,
          },
        }
      )
      .sort({ "challengeStats.totalPoints": -1 })
      .limit(10)
      .toArray();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      id: user._id.toString(),
      name: user.name || "Anonymous",
      username: user.username || user.name || "user",
      image:
        user.image ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
      points: user.challengeStats?.totalPoints ?? 0,
      completedCount: user.challengeStats?.completedCount ?? 0,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
