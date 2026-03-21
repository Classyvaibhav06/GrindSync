import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/notifications — fetch the logged-in user's notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const notifications = await db
      .collection("notifications")
      .find({ recipientId: new ObjectId(session.user.id) })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("notifications").updateMany(
      { recipientId: new ObjectId(session.user.id), read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Notifications mark-read error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
