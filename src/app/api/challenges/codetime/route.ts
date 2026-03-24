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

    const client = await clientPromise;
    const db = client.db();
    
    // Fetch the user to check their CodeTime key
    const user = await db.collection("users").findOne({ _id: new ObjectId(session.user.id) });
    const codetimeToken = user?.codetimeToken;

    if (!codetimeToken) {
      return NextResponse.json({ 
        error: "NO_CODETIME_KEY", 
        message: "No Key found for this user." 
      }, { status: 400 });
    }

    // Fetch data directly from Software.com (CodeTime) API
    const codeTimeRes = await fetch("https://api.software.com/api/v1/sessions?summary=true", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${codetimeToken}`,
        "Content-Type": "application/json",
      },
      // Avoid aggressive caching from Next.js for external APIs
      cache: 'no-store'
    });

    if (!codeTimeRes.ok) {
        return NextResponse.json({ error: "Failed to fetch from CodeTime" }, { status: codeTimeRes.status });
    }

    const data = await codeTimeRes.json();
    
    // Convert Software.com `minutes` into expected `totalSecondsToday` for frontend compatibility
    const totalMinutesToday = (data.sessionSummary?.activeCodeTimeMinutes || data.sessionSummary?.minutes || 0);
    const totalSecondsToday = totalMinutesToday * 60;

    return NextResponse.json({
      success: true,
      totalSecondsToday,
      activeCodeTimeMinutes: data.sessionSummary?.activeCodeTimeMinutes || 0,
      keystrokes: data.sessionSummary?.keystrokes || 0,
      linesAdded: data.sessionSummary?.linesAdded || 0
    });
  } catch (error) {
    console.error("Telemetry fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
