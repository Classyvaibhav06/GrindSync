import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST /api/rooms/[code]/help — toggle the caller's "need help" flag.
// Optionally pass { needsHelp: boolean } to set it explicitly.
export async function POST(
  req: NextRequest,
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

    const room = await rooms.findOne(
      { code, "participants.userId": uid },
      { projection: { participants: { $elemMatch: { userId: uid } } } }
    );
    if (!room?.participants?.length) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 404 });
    }

    let desired = !room.participants[0].needsHelp;
    // Body is optional; an explicit value wins over toggling.
    try {
      const body = await req.json();
      if (typeof body?.needsHelp === "boolean") desired = body.needsHelp;
    } catch {
      // no body / sendBeacon — keep the toggle
    }

    await rooms.updateOne(
      { code, "participants.userId": uid },
      { $set: { "participants.$[p].needsHelp": desired } },
      { arrayFilters: [{ "p.userId": uid }] }
    );

    return NextResponse.json({ ok: true, needsHelp: desired });
  } catch (error) {
    console.error("Room help toggle error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
