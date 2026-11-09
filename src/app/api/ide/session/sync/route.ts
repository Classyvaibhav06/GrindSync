import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedIdeDevice, getIdeDb } from "@/lib/ide/server";

interface IncomingInterval {
  id: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  language: string;
  keystrokeCount?: number;
  linesAdded?: number;
  linesDeleted?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(req: NextRequest) {
  try {
    const device = await getAuthenticatedIdeDevice(req);
    if (!device) return NextResponse.json({ success: false, error: "Unauthorized device" }, { status: 401 });

     let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Malformed JSON body" }, { status: 400 });
    }
    const parsed = body as { deviceId?: unknown; batchId?: unknown; intervals?: unknown; batchIdAsAny?: unknown };
    if (parsed.deviceId !== device.deviceId || typeof parsed.batchId !== "string" || !/^[\w-]{1,128}$/.test(parsed.batchId)) {
      return NextResponse.json({ success: false, error: "Invalid batch or device ID" }, { status: 400 });
    }
    if (!Array.isArray(parsed.intervals) || parsed.intervals.length > 500) {
      return NextResponse.json({ success: false, error: "Invalid activity intervals" }, { status: 400 });
    }

    const intervals: IncomingInterval[] = parsed.intervals;
    let totalActiveSeconds = 0;
    const languageBreakdown: Record<string, number> = {};
    const safeIntervals = [];
    const now = Date.now();

    for (const interval of intervals) {
      if (
        !interval || typeof interval.id !== "string" || interval.id.length > 128 ||
        typeof interval.language !== "string" || !isFiniteNumber(interval.startTime) ||
        !isFiniteNumber(interval.endTime) || !isFiniteNumber(interval.durationSeconds) ||
        interval.durationSeconds <= 0 || interval.durationSeconds > 900 ||
        interval.endTime < interval.startTime || interval.durationSeconds > (interval.endTime - interval.startTime) / 1000 + 5 ||
        interval.endTime > now + 60_000 || interval.startTime < now - 31 * 24 * 60 * 60 * 1000
      ) {
        return NextResponse.json({ success: false, error: "An activity interval is invalid" }, { status: 400 });
      }

      const language = interval.language.trim().slice(0, 64) || "Unknown";
      const seconds = Math.floor(interval.durationSeconds);
      totalActiveSeconds += seconds;
      languageBreakdown[language] = (languageBreakdown[language] || 0) + seconds;
      safeIntervals.push({
        id: interval.id.slice(0, 128),
        startTime: interval.startTime,
        endTime: interval.endTime,
        durationSeconds: seconds,
        language,
        keystrokeCount: isFiniteNumber(interval.keystrokeCount) ? Math.max(0, Math.min(100_000, Math.floor(interval.keystrokeCount))) : 0,
        linesAdded: isFiniteNumber(interval.linesAdded) ? Math.max(0, Math.min(10_000, Math.floor(interval.linesAdded))) : 0,
        linesDeleted: isFiniteNumber(interval.linesDeleted) ? Math.max(0, Math.min(10_000, Math.floor(interval.linesDeleted))) : 0,
      });
    }

    if (totalActiveSeconds > 12 * 60 * 60) {
      return NextResponse.json({ success: false, error: "Activity batch exceeds the allowed duration" }, { status: 400 });
    }

    const db = await getIdeDb();
    try {
      await db.collection("ide_activity_batches").insertOne({
        userId: new ObjectId(String(device.userId)),
        deviceId: device.deviceId,
        batchId: parsed.batchId as string,
        sessionId: typeof (parsed as { sessionId?: unknown }).sessionId === "string" ? ((parsed as { sessionId: string }).sessionId).slice(0, 128) : "",
        clientTimestamp: isFiniteNumber((parsed as { clientTimestamp?: unknown }).clientTimestamp) ? ((parsed as { clientTimestamp: number }).clientTimestamp) : now,
        receivedAt: new Date(),
        intervals: safeIntervals,
        languageBreakdown,
        totalActiveSeconds,
        pointsAwarded: 0,
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [todayTotal] = await db.collection("ide_activity_batches").aggregate<{ seconds: number }>([
      { $match: { userId: new ObjectId(String(device.userId)), receivedAt: { $gte: today } } },
      { $group: { _id: null, seconds: { $sum: "$totalActiveSeconds" } } },
    ]).toArray();

    return NextResponse.json({ success: true, totalTodaySeconds: todayTotal?.seconds || 0, pointsAwarded: 0 });
  } catch (error) {
    console.error("IDE activity sync failed:", error);
    return NextResponse.json({ success: false, error: "Could not sync IDE activity" }, { status: 500 });
  }
}
