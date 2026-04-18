import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getCache, setCache } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json({ users: [] });
    }

    /* ── Redis Cache Search ────────────────────────── */
    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return NextResponse.json({ users: cached });

    const client = await clientPromise;
    const db = client.db();

    // Safely parse ObjectId
    let excludeIdFilter = {};
    try {
      if (session?.user?.id) {
         excludeIdFilter = { _id: { $ne: new ObjectId(session.user.id!) } };
      }
    } catch(e) {
      // Not logged in or invalid ID
    }

    // Search users by name case-insensitively using regex
    // IMPORTANT: image is removed from projection to save bandwidth
    const users = await db
      .collection("users")
      .find(
        { 
          name: { $regex: q, $options: "i" },
          ...excludeIdFilter
        },
        { projection: { name: 1, email: 1, username: 1 } }
      )
      .limit(10)
      .toArray();

    // Cache the result for 60 seconds
    await setCache(cacheKey, users, 60);

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
