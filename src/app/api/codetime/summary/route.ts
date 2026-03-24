import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get the user's CodeTime token from the database
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { codetimeToken: 1 } }
    );

    if (!user?.codetimeToken) {
      return NextResponse.json({ error: "CodeTime token not linked" }, { status: 404 });
    }

    // 2. Fetch data from Software.com (CodeTime) API
    // The "sessions" endpoint provides coding metrics
    const codeTimeRes = await fetch("https://api.software.com/api/v1/sessions?summary=true", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${user.codetimeToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!codeTimeRes.ok) {
      return NextResponse.json({ error: "Failed to fetch from CodeTime" }, { status: codeTimeRes.status });
    }

    const data = await codeTimeRes.json();

    // Software.com API provides total elapsed editor time (screen time) in `minutes`
    return NextResponse.json({
      success: true,
      screenTimeMinutes: data.sessionSummary?.minutes || 0,
      activeCodeTimeMinutes: data.sessionSummary?.activeCodeTimeMinutes || 0,
      keystrokes: data.sessionSummary?.keystrokes || 0,
      linesAdded: data.sessionSummary?.linesAdded || 0,
      linesDeleted: data.sessionSummary?.linesDeleted || 0,
      raw: data
    });

  } catch (error) {
    console.error("CodeTime API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
