import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const { id: targetUserId } = await params;

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    const targetUserObjId = new ObjectId(targetUserId);
    const currentUserObjId = new ObjectId(currentUserId);

    const client = await clientPromise;
    const db = client.db();

    const targetUser = await db
      .collection("users")
      .findOne({ _id: targetUserObjId });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUser = await db
      .collection("users")
      .findOne({ _id: currentUserObjId });

    // Check if following
    const isFollowing = currentUser?.following?.some(
      (id: ObjectId) => id.toString() === targetUserId
    );

    if (isFollowing) {
      // Unfollow
      await db.collection("users").updateOne(
        { _id: currentUserObjId },
        { $pull: { following: targetUserObjId } } as any
      );
      await db.collection("users").updateOne(
        { _id: targetUserObjId },
        { $pull: { followers: currentUserObjId } } as any
      );
    } else {
      // Follow
      await db.collection("users").updateOne(
        { _id: currentUserObjId },
        { $addToSet: { following: targetUserObjId } } as any
      );
      await db.collection("users").updateOne(
        { _id: targetUserObjId },
        { $addToSet: { followers: currentUserObjId } } as any
      );
      // Create notification for the followed user
      await db.collection("notifications").insertOne({
        recipientId: targetUserObjId,
        actorId: currentUserObjId,
        actorName: session.user.name || "Someone",
        actorImage: session.user.image || null,
        actorUsername: (session.user as any).username || session.user.name,
        type: "follow",
        message: `started following you`,
        read: false,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      following: !isFollowing,
    });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
