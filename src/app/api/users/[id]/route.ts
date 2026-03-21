import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const client = await clientPromise;
    const db = client.db();

    const { id: targetUserId } = await params;
    const targetUserObjId = new ObjectId(targetUserId);

    const user = await db.collection("users").findOne({ _id: targetUserObjId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let isFollowing = false;
    
    // Check if the current user is following this profile
    if (session?.user?.id && session.user.id !== targetUserId) {
      const currentUserObjId = new ObjectId(session.user.id);
      const currentUser = await db
        .collection("users")
        .findOne({ _id: currentUserObjId });

      if (currentUser?.following) {
        isFollowing = currentUser.following.some(
          (id: ObjectId) => id.toString() === targetUserId
        );
      }
    }

    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    return NextResponse.json({
      useProfile: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        image: user.image,
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        banner: user.banner || "",
        leetcodeUsername: user.leetcodeUsername || "",
        wakatimeApiKey: user.wakatimeApiKey || "",
        githubUsername: user.githubUsername || "",
        dsaSolvedDates: user.dsaSolvedDates || [],
        followersCount,
        followingCount,
        isFollowing,
      },
      isOwner: session?.user?.id === targetUserId,
    });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: targetUserId } = await params;

    if (!session?.user?.id || session.user.id !== targetUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, username, bio, location, website } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // If username is being changed, check uniqueness
    if (username) {
      const existing = await db.collection("users").findOne({
        username,
        _id: { $ne: new ObjectId(targetUserId) },
      });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    const body2 = body as Record<string, string | undefined>;
    const banner = body2.banner;
    const wakatimeApiKey = body2.wakatimeApiKey;
    const githubUsername = body2.githubUsername;

    const updateData: Record<string, string> = { name: name.trim() };
    if (username) updateData.username = username.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (banner !== undefined) updateData.banner = banner;
    if (wakatimeApiKey !== undefined) updateData.wakatimeApiKey = wakatimeApiKey;
    if (githubUsername !== undefined) updateData.githubUsername = githubUsername.replace(/^@/, "").trim();

    await db.collection("users").updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
