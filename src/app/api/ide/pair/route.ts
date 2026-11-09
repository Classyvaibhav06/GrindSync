import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { createDeviceToken, getIdeDb, hashIdeSecret, newDeviceId, verifyPairAttemptLimit } from "@/lib/ide/server";

export async function POST(req: NextRequest) {
  try {
    const db = await getIdeDb();
    if (!(await verifyPairAttemptLimit(req, db))) {
      return NextResponse.json({ success: false, error: "Too many pairing attempts. Try again in a minute." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Malformed JSON body" }, { status: 400 });
    }
    const code = typeof (body as { code?: unknown })?.code === "string" ? (body as { code: string }).code.trim() : "";
    const deviceName = typeof (body as { deviceName?: unknown })?.deviceName === "string" ? (body as { deviceName: string }).deviceName.trim().slice(0, 100) : "";
    const ide = typeof (body as { ide?: unknown })?.ide === "string" ? (body as { ide: string }).ide.trim().slice(0, 40) : "VS Code";
    if (!/^\d{6}$/.test(code) || !deviceName) {
      return NextResponse.json({ success: false, error: "Enter a valid 6-digit pairing code and device name." }, { status: 400 });
    }

    const pairing = await db.collection("ide_pairing_codes").findOneAndDelete({
      codeHash: hashIdeSecret(code),
      expiresAt: { $gt: new Date() },
    });
    if (!pairing) {
      return NextResponse.json({ success: false, error: "Pairing code is invalid, expired, or already used." }, { status: 401 });
    }

    const userId = pairing.userId as ObjectId;
    const user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { username: 1, name: 1 } }
    );
    if (!user) {
      return NextResponse.json({ success: false, error: "GrindSync account was not found." }, { status: 404 });
    }

    const token = createDeviceToken();
    const deviceId = newDeviceId();
    await db.collection("ide_devices").insertOne({
      userId,
      deviceId,
      deviceName,
      ide: ide || "VS Code",
      tokenHash: hashIdeSecret(token),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      token,
      deviceId,
      userId: userId.toString(),
      username: user.username || user.name || "GrindSync user",
    });
  } catch (error) {
    console.error("IDE pairing failed:", error);
    return NextResponse.json({ success: false, error: "Could not pair this IDE." }, { status: 500 });
  }
}
