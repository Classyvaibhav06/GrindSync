import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/chat/[userId] — get messages between current user and target user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    if (!ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const uid = new ObjectId(session.user.id);
    const tid = new ObjectId(targetUserId);
    const client = await clientPromise;
    const db = client.db();

    // Fetch messages between the two users
    const messages = await db
      .collection("messages")
      .find({
        $or: [
          { senderId: uid, receiverId: tid },
          { senderId: tid, receiverId: uid },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();

    // Mark unread messages from the target user as read
    await db.collection("messages").updateMany(
      { senderId: tid, receiverId: uid, read: false },
      { $set: { read: true } }
    );

    // Get partner info
    const partner = await db.collection("users").findOne(
      { _id: tid },
      { projection: { name: 1, username: 1, image: 1, lastActive: 1 } }
    );

    const threshold = new Date(Date.now() - 2 * 60 * 1000);

    return NextResponse.json({
      messages: messages.map((m) => ({
        _id: m._id.toString(),
        senderId: m.senderId.toString(),
        receiverId: m.receiverId.toString(),
        content: m.content,
        createdAt: m.createdAt,
        read: m.read,
      })),
      partner: partner
        ? {
            id: partner._id.toString(),
            name: partner.name,
            username: partner.username,
            image: partner.image,
            isOnline: partner.lastActive
              ? new Date(partner.lastActive) >= threshold
              : false,
          }
        : null,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
