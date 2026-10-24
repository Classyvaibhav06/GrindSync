import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { liveParticipants } from "@/lib/rooms";

// POST /api/rooms/[code]/leave — remove the current user from the room.
// Rooms with no one left are deactivated automatically.
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
    const rooms = db.collection("study_rooms");

    const res = await rooms.updateOne({ code }, { $pull: { participants: { userId: uid } } } as any);
    if (res.matchedCount === 0) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const room = await rooms.findOne({ code });
    if (room?.isActive && liveParticipants(room.participants ?? []).length === 0) {
      await rooms.updateOne({ code }, { $set: { isActive: false, endedAt: new Date() } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Room leave error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
