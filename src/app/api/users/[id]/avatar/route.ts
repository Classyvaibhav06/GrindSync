import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { image: 1 } }
    );
    return NextResponse.json({ image: user?.image ?? null });
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
    const { id: targetUserId } = await params;

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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update avatar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
