import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedIdeDevice, getIdeDb } from "@/lib/ide/server";

const VALID_STATES = new Set(["ACTIVE", "IDLE", "STOPPED"]);

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
    const parsed = body as { deviceId?: unknown; state?: unknown; currentLanguage?: unknown; sessionId?: unknown; timestamp?: unknown };
    if (parsed.deviceId !== device.deviceId || !VALID_STATES.has(parsed.state as string)) {
      return NextResponse.json({ success: false, error: "Invalid device heartbeat" }, { status: 400 });
    }

    const db = await getIdeDb();
    await db.collection("ide_devices").updateOne(
      { _id: device._id, revokedAt: { $exists: false } },
      { $set: {
        lastSeenAt: new Date(),
        state: parsed.state as string,
        currentLanguage: typeof parsed.currentLanguage === "string" ? parsed.currentLanguage.slice(0, 64) : "Unknown",
      } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("IDE heartbeat failed:", error);
    return NextResponse.json({ success: false, error: "Could not update device heartbeat" }, { status: 500 });
  }
}
