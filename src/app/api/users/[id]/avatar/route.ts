import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getCache, setCache, deleteCache } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // 1. Check Redis First
    const cacheKey = `user:avatar:${id}`;
    const cachedAvatar = await getCache<string>(cacheKey);
    
    if (cachedAvatar) {
      return NextResponse.json({ image: cachedAvatar }, {
        headers: { 
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600" 
        }
      });
    }

    // 2. Fallback to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { image: 1 } }
    );

    const image = user?.image ?? null;

    // 3. Save to Redis for 1 hour (base64 can be large, but so is DB fetch)
    if (image) {
      await setCache(cacheKey, image, 3600);
    }

    return NextResponse.json({ image }, {
      headers: { 
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600" 
      }
    });
  } catch (error) {
    console.error("Get avatar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;

    if (!session?.user?.id || session.user.id !== targetUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: "image field required" }, { status: 400 });
    }

    // Cap at ~2 MB base64
    if (typeof image === "string" && image.length > 3_000_000) {
      return NextResponse.json({ error: "Image too large. Max 2 MB." }, { status: 413 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("users").updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: { image } }
    );

    // Invalidate Redis cache so the new image shows up
    await deleteCache(`user:avatar:${targetUserId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update avatar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
