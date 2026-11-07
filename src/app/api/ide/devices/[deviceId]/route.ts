import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getIdeDb } from "@/lib/ide/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { deviceId } = await params;
    const db = await getIdeDb();
    const result = await db.collection("ide_devices").updateOne(
      { deviceId, userId: new ObjectId(session.user.id), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), state: "STOPPED" } }
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Device not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("IDE device revocation failed:", error);
    return NextResponse.json({ error: "Could not disconnect device" }, { status: 500 });
  }
}
