import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST /api/rooms/[code]/join — add the current user as a live participant
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

    const room = await rooms.findOne({ code, isActive: true });
    if (!room) {
      return NextResponse.json({ error: "Room not found or inactive" }, { status: 404 });
    }

    const now = new Date();
    // Pull-then-push so rejoining refreshes joinedAt instead of duplicating the entry.
    await rooms.updateOne({ code }, { $pull: { participants: { userId: uid } } } as any);
    await rooms.updateOne(
      { code },
      { $push: { participants: { userId: uid, joinedAt: now, lastActiveAt: now, needsHelp: false } } } as any
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Room join error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
