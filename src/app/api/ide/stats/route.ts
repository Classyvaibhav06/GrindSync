import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedIdeDevice, getIdeDb } from "@/lib/ide/server";

export async function GET(req: NextRequest) {
  try {
    const device = await getAuthenticatedIdeDevice(req);
    const session = device ? null : await getServerSession(authOptions);
    const ownerId = device?.userId ?? session?.user?.id;
    if (!ownerId || !ObjectId.isValid(String(ownerId))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = await getIdeDb();
    const userId = new ObjectId(String(ownerId));
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

    const [totals] = await db.collection("ide_activity_batches").aggregate<{
      totalSeconds: number;
      todaySeconds: number;
      weeklySeconds: number;
      monthlySeconds: number;
      pointsEarned: number;
    }>([
      { $match: { userId } },
      { $group: {
        _id: null,
        totalSeconds: { $sum: "$totalActiveSeconds" },
        todaySeconds: { $sum: { $cond: [{ $gte: ["$receivedAt", today] }, "$totalActiveSeconds", 0] } },
        weeklySeconds: { $sum: { $cond: [{ $gte: ["$receivedAt", weekAgo] }, "$totalActiveSeconds", 0] } },
        monthlySeconds: { $sum: { $cond: [{ $gte: ["$receivedAt", monthAgo] }, "$totalActiveSeconds", 0] } },
        pointsEarned: { $sum: "$pointsAwarded" },
      } },
    ]).toArray();

    const languages = await db.collection("ide_activity_batches").aggregate<{ _id: string; seconds: number }>([
      { $match: { userId } },
      { $project: { pairs: { $objectToArray: "$languageBreakdown" } } },
      { $unwind: "$pairs" },
      { $group: { _id: "$pairs.k", seconds: { $sum: "$pairs.v" } } },
      { $sort: { seconds: -1 } },
      { $limit: 20 },
    ]).toArray();

    const activeDays = await db.collection("ide_activity_batches").aggregate<{ _id: string }>([
      { $match: { userId, totalActiveSeconds: { $gt: 0 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$receivedAt", timezone: "UTC" } } } },
      { $sort: { _id: -1 } },
      { $limit: 366 },
    ]).toArray();
    const daySet = new Set(activeDays.map(({ _id }) => _id));
    let streak = 0;
    for (let offset = 0; offset < 366; offset++) {
      const date = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      if (!daySet.has(key)) {
        if (offset === 0) continue;
        break;
      }
      streak++;
    }

    return NextResponse.json({
      success: true,
      todaySeconds: totals?.todaySeconds || 0,
      weeklySeconds: totals?.weeklySeconds || 0,
      monthlySeconds: totals?.monthlySeconds || 0,
      totalSeconds: totals?.totalSeconds || 0,
      streak,
      pointsEarned: totals?.pointsEarned || 0,
      languages: Object.fromEntries(languages.map(({ _id, seconds }) => [_id, seconds])),
    });
  } catch (error) {
    console.error("IDE stats request failed:", error);
    return NextResponse.json({ success: false, error: "Could not load IDE stats" }, { status: 500 });
  }
}
