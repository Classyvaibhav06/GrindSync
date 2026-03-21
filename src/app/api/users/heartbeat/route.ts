import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST /api/users/heartbeat — update lastActive timestamp
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { lastActive: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/users/heartbeat — get online users (active in last 2 mins)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const threshold = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes

    const onlineUsers = await db
      .collection("users")
      .find(
        { lastActive: { $gte: threshold }, _id: { $ne: new ObjectId(session.user.id) } },
        { projection: { name: 1, username: 1, image: 1, lastActive: 1 } }
      )
      .sort({ lastActive: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ users: onlineUsers });
  } catch (error) {
    console.error("Online users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
