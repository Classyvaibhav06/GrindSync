import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/users/friends — returns mutual follows (friends) for current user
// Also flags which ones are online (active in last 2 minutes)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const me = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { followers: 1, following: 1 } }
    );

    if (!me) return NextResponse.json({ friends: [] });

    const followers: ObjectId[] = (me.followers || []).map((id: string | ObjectId) => new ObjectId(id));
    const following: ObjectId[] = (me.following || []).map((id: string | ObjectId) => new ObjectId(id));

    // Friends = people I follow AND who follow me back
    const followerStrings = new Set(followers.map((id) => id.toString()));
    const friendIds = following.filter((id) => followerStrings.has(id.toString()));

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const threshold = new Date(Date.now() - 2 * 60 * 1000);

    const friends = await db
      .collection("users")
      .find(
        { _id: { $in: friendIds } },
        { projection: { name: 1, username: 1, image: 1, lastActive: 1 } }
      )
      .toArray();

    return NextResponse.json({
      friends: friends.map((f) => ({
        _id: f._id.toString(),
        name: f.name,
        username: f.username,
        image: f.image || null,
        isOnline: f.lastActive ? new Date(f.lastActive) >= threshold : false,
      })),
    });
  } catch (error) {
    console.error("Friends fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
