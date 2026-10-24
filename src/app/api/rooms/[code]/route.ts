import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { liveParticipants, enrichParticipants } from "@/lib/rooms";

// GET /api/rooms/[code] — room detail with live participants
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const client = await clientPromise;
    const db = client.db();

    const room = await db.collection("study_rooms").findOne({ code });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const live = liveParticipants(room.participants ?? []);
    const [participants, host] = await Promise.all([
      enrichParticipants(db, live),
      db.collection("users").findOne(
        { _id: room.hostId },
        { projection: { name: 1, username: 1, image: 1 } }
      ),
    ]);

    return NextResponse.json({
      room: {
        code: room.code,
        name: room.name,
        topic: room.topic || "",
        description: room.description || "",
        techTags: room.techTags ?? [],
        hostId: room.hostId.toString(),
        hostName: host?.name || "User",
        hostImage: host?.image || null,
        isActive: room.isActive,
        createdAt: room.createdAt,
        participants,
        participantCount: participants.length,
      },
    });
  } catch (error) {
    console.error("Room detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/rooms/[code] — host-only: edit details or end the room
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db();
    const uid = new ObjectId(session.user.id);

    const room = await db.collection("study_rooms").findOne({ code });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (room.hostId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the host can update this room" }, { status: 403 });
    }

    const set: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) set.name = body.name.trim().slice(0, 80);
    if (typeof body.topic === "string") set.topic = body.topic.trim().slice(0, 60);
    if (typeof body.description === "string") set.description = body.description.trim().slice(0, 300);
    if (Array.isArray(body.techTags)) {
      set.techTags = body.techTags
        .filter((t: unknown) => typeof t === "string")
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6);
    }
    if (body.isActive === false) {
      set.isActive = false;
      set.endedAt = new Date();
    }

    if (Object.keys(set).length > 0) {
      await db.collection("study_rooms").updateOne({ code }, { $set: set });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Room update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
