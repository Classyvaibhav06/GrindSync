import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

// Query to fetch recent accepted submissions for any public LeetCode username
const RECENT_AC_QUERY = `
  query recentACSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

const DSA_POINTS = 200; // points for solving the daily problem

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { titleSlug, problemDate } = body;

    if (!titleSlug || !problemDate) {
      return NextResponse.json(
        { error: "titleSlug and problemDate are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const userId = new ObjectId(session.user.id);

    // 1. Get user's LeetCode username from DB
    const user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { leetcodeUsername: 1, dsaSolvedDates: 1 } }
    );

    if (!user?.leetcodeUsername) {
      return NextResponse.json(
        { error: "NO_USERNAME", message: "Set your LeetCode username in profile first." },
        { status: 422 }
      );
    }

    // 2. Check if already awarded today
    const solvedDates: string[] = user.dsaSolvedDates || [];
    if (solvedDates.includes(problemDate)) {
      return NextResponse.json(
        { error: "ALREADY_CLAIMED", message: "Points already claimed for today!" },
        { status: 409 }
      );
    }

    // 3. Query LeetCode public GraphQL for recent accepted submissions
    let submissions: { titleSlug: string; timestamp: string }[] = [];
    try {
      const lcRes = await fetch(LEETCODE_GRAPHQL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://leetcode.com",
        },
        body: JSON.stringify({
          query: RECENT_AC_QUERY,
          variables: { username: user.leetcodeUsername, limit: 20 },
        }),
      });

      if (!lcRes.ok) throw new Error("LeetCode API failed");
      const lcJson = await lcRes.json();
      submissions = lcJson?.data?.recentAcSubmissionList || [];
    } catch (e) {
      console.error("LeetCode fetch error:", e);
      return NextResponse.json(
        { error: "LEETCODE_ERROR", message: "Could not reach LeetCode. Try again." },
        { status: 502 }
      );
    }

    // 4. Check if today's problem is in recent accepted submissions
    //    We check the timestamp is within the last 48 hours (buffer for timezone differences)
    const now = Date.now();
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    const solved = submissions.some((s) => {
      const tsMs = parseInt(s.timestamp) * 1000;
      return (
        s.titleSlug === titleSlug &&
        tsMs >= twoDaysAgo
      );
    });

    if (!solved) {
      return NextResponse.json(
        {
          error: "NOT_SOLVED",
          message: `We couldn't find an accepted submission for "${titleSlug}" from @${user.leetcodeUsername} in the last 48 hours. Make sure your LeetCode profile is public and you've submitted the correct problem.`,
        },
        { status: 404 }
      );
    }

    // 5. Award points and mark as claimed
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $inc: {
          "challengeStats.totalPoints": DSA_POINTS,
          "challengeStats.completedCount": 1,
        },
        $push: { dsaSolvedDates: problemDate } as any,
        $set: { "challengeStats.lastCompletedAt": new Date() },
      }
    );

    // 6. Log the DSA solve
    await db.collection("dsa_completions").insertOne({
      userId,
      titleSlug,
      problemDate,
      points: DSA_POINTS,
      leetcodeUsername: user.leetcodeUsername,
      verifiedAt: new Date(),
    });

    // 7. Get updated total
    const updatedUser = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { challengeStats: 1 } });

    return NextResponse.json({
      success: true,
      pointsEarned: DSA_POINTS,
      totalPoints: updatedUser?.challengeStats?.totalPoints ?? DSA_POINTS,
      leetcodeUsername: user.leetcodeUsername,
    });
  } catch (err) {
    console.error("DSA verify error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
