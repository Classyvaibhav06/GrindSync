import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");
    
    const targetId = queryId || session?.user?.id;

    if (!targetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Fetch the target user to get their followers & following array of ObjectIds
    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(targetId) });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const followersIds = targetUser.followers || [];
    const followingIds = targetUser.following || [];

    // Fetch populated user profiles for followers
    const followers = await db
      .collection("users")
      .find(
        { _id: { $in: followersIds.map((id: string | ObjectId) => new ObjectId(id)) } },
        { projection: { _id: 1, name: 1, username: 1, image: 1 } }
      )
      .toArray();

    // Fetch populated user profiles for following
    const following = await db
      .collection("users")
      .find(
        { _id: { $in: followingIds.map((id: string | ObjectId) => new ObjectId(id)) } },
        { projection: { _id: 1, name: 1, username: 1, image: 1 } }
      )
      .toArray();

    return NextResponse.json({ followers, following }, { status: 200 });
  } catch (error) {
    console.error("Error fetching network:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
