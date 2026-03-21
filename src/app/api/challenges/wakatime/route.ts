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
    
    // Fetch the user to get their WakaTime API key
    const user = await db.collection("users").findOne({ _id: new ObjectId(session.user.id) });
    const wakatimeApiKey = user?.wakatimeApiKey;

    if (!wakatimeApiKey) {
      return NextResponse.json({ 
        error: "NO_WAKATIME_KEY", 
        message: "No WakaTime API key found for this user." 
      }, { status: 400 });
    }

    // Fetch summaries from WakaTime
    // We encode the API key properly in the Auth header as Basic Auth
    const authHeader = `Basic ${Buffer.from(wakatimeApiKey).toString('base64')}`;

    const res = await fetch("https://wakatime.com/api/v1/users/current/summaries?start=today&end=today", {
      headers: {
        Authorization: authHeader,
      },
      next: { revalidate: 0 }, // no cache
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("WakaTime fetch failed:", res.status, text);
      // Give a clean error if unauthorized
      if (res.status === 401) {
        return NextResponse.json({ error: "INVALID_WAKATIME_KEY", message: "Invalid WakaTime API Key." }, { status: 401 });
      }
      return NextResponse.json({ error: "WAKATIME_ERROR", message: "Failed to fetch from WakaTime API." }, { status: 500 });
    }

    const data = await res.json();
    
    // Grand total seconds for today
    const totalSecondsToday = data.data?.[0]?.grand_total?.total_seconds || 0;

    return NextResponse.json({
      success: true,
      totalSecondsToday,
    });
  } catch (error) {
    console.error("WakaTime error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
