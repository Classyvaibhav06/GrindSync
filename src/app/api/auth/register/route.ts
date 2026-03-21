import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username } = body;

    if (!email || !password || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if email exists
    const existingEmail = await db.collection("users").findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Check if username exists
    const existingUsername = await db.collection("users").findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ error: "Username taken, choose another" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Give them a default DP (use adorable API or initials in UI)
    const newUser = {
      email,
      username,
      name: username, // Fallback for components expecting name
      password: hashedPassword,
      image: null,
      followers: [],
      following: [],
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    return NextResponse.json({ success: true, userId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
