import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId: targetUserId } = await params;
    if (!ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { typingTo: new ObjectId(targetUserId), typingAt: new Date() } }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
