import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedIdeDevice, getIdeDb } from "@/lib/ide/server";

const VALID_STATES = new Set(["ACTIVE", "IDLE", "STOPPED"]);

export async function POST(req: NextRequest) {
  try {
    const device = await getAuthenticatedIdeDevice(req);
    if (!device) return NextResponse.json({ success: false, error: "Unauthorized device" }, { status: 401 });

    const body = await req.json();
    if (body.deviceId !== device.deviceId || !VALID_STATES.has(body.state)) {
      return NextResponse.json({ success: false, error: "Invalid device heartbeat" }, { status: 400 });
    }

    const db = await getIdeDb();
    await db.collection("ide_devices").updateOne(
      { _id: device._id, revokedAt: { $exists: false } },
      { $set: {
        lastSeenAt: new Date(),
        state: body.state,
        currentLanguage: typeof body.currentLanguage === "string" ? body.currentLanguage.slice(0, 64) : "Unknown",
        activeSessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 128) : null,
      } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("IDE heartbeat failed:", error);
    return NextResponse.json({ success: false, error: "Could not update device heartbeat" }, { status: 500 });
  }
}
