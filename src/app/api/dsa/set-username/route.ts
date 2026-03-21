import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leetcodeUsername } = await req.json();

    if (!leetcodeUsername || typeof leetcodeUsername !== "string") {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    const clean = leetcodeUsername.trim();

    // Validate the username exists on LeetCode via public GraphQL
    const checkQuery = `
      query checkUser($username: String!) {
        matchedUser(username: $username) {
          username
        }
      }
    `;

    let valid = false;
    try {
      const res = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://leetcode.com",
        },
        body: JSON.stringify({ query: checkQuery, variables: { username: clean } }),
      });
      const json = await res.json();
      valid = !!json?.data?.matchedUser?.username;
    } catch {
      // If LeetCode is unreachable, still save - verification happens at solve time
      valid = true;
    }

    if (!valid) {
      return NextResponse.json(
        { error: "LeetCode username not found. Check the spelling and try again." },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { leetcodeUsername: clean } }
    );

    return NextResponse.json({ success: true, leetcodeUsername: clean });
  } catch (err) {
    console.error("Set LeetCode username error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
