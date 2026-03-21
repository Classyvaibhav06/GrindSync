import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/chat — list conversations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();

    // Get the latest message for each unique conversation partner
    const messages = await db
      .collection("messages")
      .aggregate([
        { $match: { $or: [{ senderId: uid }, { receiverId: uid }] } },
        { $sort: { createdAt: -1 } },
        {
          $addFields: {
            partnerId: {
              $cond: [{ $eq: ["$senderId", uid] }, "$receiverId", "$senderId"],
            },
          },
        },
        {
          $group: {
            _id: "$partnerId",
            lastMessage: { $first: "$content" },
            lastAt: { $first: "$createdAt" },
            unread: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$receiverId", uid] }, { $eq: ["$read", false] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { lastAt: -1 } },
        { $limit: 30 },
      ])
      .toArray();

    // Fetch user details for each partner
    const partnerIds = messages.map((m) => m._id);
    const users = await db
      .collection("users")
      .find(
        { _id: { $in: partnerIds } },
        { projection: { name: 1, username: 1, image: 1, lastActive: 1 } }
      )
      .toArray();

    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    const threshold = new Date(Date.now() - 2 * 60 * 1000);

    const conversations = messages.map((m) => {
      const partner = userMap[m._id.toString()];
      return {
        partnerId: m._id.toString(),
        partnerName: partner?.name || "User",
        partnerUsername: partner?.username || "",
        partnerImage: partner?.image || null,
        isOnline: partner?.lastActive ? new Date(partner.lastActive) >= threshold : false,
        lastMessage: m.lastMessage,
        lastAt: m.lastAt,
        unread: m.unread,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Chat conversations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/chat — send a message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, content } = await req.json();
    if (!receiverId || !content?.trim()) {
      return NextResponse.json({ error: "receiverId and content required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const message = {
      senderId: new ObjectId(session.user.id),
      receiverId: new ObjectId(receiverId),
      content: content.trim(),
      read: false,
      createdAt: new Date(),
    };

    const result = await db.collection("messages").insertOne(message);

    return NextResponse.json({
      message: { ...message, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
