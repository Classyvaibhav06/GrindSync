import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { generateRoomCode, liveParticipants } from "@/lib/rooms";

// GET /api/rooms — list active study rooms with live participant counts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const rooms = await db
      .collection("study_rooms")
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const hostIds = [...new Set(rooms.map((r) => r.hostId))];
    const hosts = await db
      .collection("users")
      .find(
        { _id: { $in: hostIds } },
        { projection: { name: 1, username: 1, image: 1 } }
      )
      .toArray();
    const hostById = new Map(hosts.map((h) => [h._id.toString(), h]));

    const result = rooms.map((room) => {
      const live = liveParticipants(room.participants ?? []);
      const host = hostById.get(room.hostId.toString());
      return {
        code: room.code,
        name: room.name,
        topic: room.topic || "",
        description: room.description || "",
        techTags: room.techTags ?? [],
        hostId: room.hostId.toString(),
        hostName: host?.name || "User",
        hostImage: host?.image || null,
        participantCount: live.length,
        helpCount: live.filter((p) => p.needsHelp).length,
        createdAt: room.createdAt,
      };
    });

    return NextResponse.json({ rooms: result });
  } catch (error) {
    console.error("List rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/rooms — create a study room (creator becomes host and first participant)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Room name is required (max 80 chars)" },
        { status: 400 }
      );
    }

    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 60) : "";
    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 300) : "";
    const techTags = Array.isArray(body.techTags)
      ? body.techTags
          .filter((t: unknown) => typeof t === "string")
          .map((t: string) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();

    // Collision-checked code (retries a few times on the astronomically unlikely clash)
    let code = generateRoomCode();
    for (let i = 0; i < 5; i++) {
      const exists = await db.collection("study_rooms").findOne({ code });
      if (!exists) break;
      code = generateRoomCode();
    }

    const now = new Date();
    const doc = {
      code,
      name,
      topic,
      description,
      techTags,
      hostId: uid,
      participants: [{ userId: uid, joinedAt: now, lastActiveAt: now, needsHelp: false }],
      isActive: true,
      createdAt: now,
      endedAt: null,
    };

    await db.collection("study_rooms").insertOne(doc);

    return NextResponse.json({ room: { code, name, topic, description, techTags, createdAt: now } });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
