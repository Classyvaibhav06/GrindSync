import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

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
    const { banner } = body;

    if (banner === undefined) {
      return NextResponse.json({ error: "banner field required" }, { status: 400 });
    }

    // Sanity check on size (base64 image can be large — cap at ~2 MB encoded)
    if (typeof banner === "string" && banner.length > 3_000_000) {
      return NextResponse.json({ error: "Image too large. Max 2 MB." }, { status: 413 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("users").updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: { banner } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update banner error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
