import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST /api/rooms/[code]/heartbeat — refresh the participant's lastActiveAt.
// Works with navigator.sendBeacon (no body needed). Returns inRoom=false when
// the caller is no longer a participant so the client can rejoin.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();

    const res = await db.collection("study_rooms").updateOne(
      { code, "participants.userId": uid },
      {
        $set: { "participants.$[p].lastActiveAt": new Date() },
        arrayFilters: [{ "p.userId": uid }],
      }
    );

    return NextResponse.json({ ok: true, inRoom: res.matchedCount > 0 });
  } catch (error) {
    console.error("Room heartbeat error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
