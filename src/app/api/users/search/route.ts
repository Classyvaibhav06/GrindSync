import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json({ users: [] });
    }

    const client = await clientPromise;
    const db = client.db();

    // Safely parse ObjectId
    let excludeIdFilter = {};
    try {
      if (session?.user?.id) {
         excludeIdFilter = { _id: { $ne: new ObjectId(session.user.id!) } };
      }
    } catch(e) {
      console.error("Invalid ObjectId for current user:", session?.user?.id);
    }

    // Search users by name case-insensitively using regex
    const users = await db
      .collection("users")
      .find(
        { 
          name: { $regex: q, $options: "i" },
          ...excludeIdFilter
        },
        { projection: { name: 1, image: 1, email: 1, username: 1 } }
      )
      .limit(10)
      .toArray();

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
