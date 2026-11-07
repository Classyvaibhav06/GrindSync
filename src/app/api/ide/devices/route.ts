import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getIdeDb } from "@/lib/ide/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = await getIdeDb();
    const devices = await db.collection("ide_devices").find(
      { userId: new ObjectId(session.user.id), revokedAt: { $exists: false } },
      { projection: { tokenHash: 0 } }
    ).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ devices });
  } catch (error) {
    console.error("IDE devices list failed:", error);
    return NextResponse.json({ error: "Could not load connected IDEs" }, { status: 500 });
  }
}
