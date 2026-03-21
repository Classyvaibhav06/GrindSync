import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password } = await req.json();
    if (!username || username.trim() === "") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    
    if (!password || password.trim() === "") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if username is already taken
    const existing = await db.collection("users").findOne({ username: username.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Username taken, choose another" }, { status: 409 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { username: username.toLowerCase(), password: hashedPassword } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update username error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
