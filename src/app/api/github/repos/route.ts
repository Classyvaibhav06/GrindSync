import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const client = await clientPromise;
    const db = client.db();

    let githubUsername: string | null = null;

    if (userId) {
      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
      githubUsername = user?.githubUsername || null;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const user = await db.collection("users").findOne({ _id: new ObjectId(session.user.id) });
      githubUsername = user?.githubUsername || null;
    }

    if (!githubUsername) {
      return NextResponse.json({ error: "NO_GITHUB", repos: [] }, { status: 200 });
    }

    const headers: HeadersInit = { "User-Agent": "GrindSync-App" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const res = await fetch(
      `https://api.github.com/users/${githubUsername}/repos?sort=pushed&per_page=12&type=owner`,
      { headers, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: "GITHUB_NOT_FOUND", repos: [] }, { status: 200 });
      if (res.status === 403 || res.status === 429) return NextResponse.json({ error: "GITHUB_RATE_LIMIT", repos: [] }, { status: 200 });
      return NextResponse.json({ error: "GITHUB_ERROR", repos: [] }, { status: 200 });
    }

    const data = await res.json();

    const repos = data
      .filter((r: any) => !r.fork)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        updatedAt: r.pushed_at,
        topics: r.topics || [],
        isPrivate: r.private,
      }));

    return NextResponse.json({ repos, githubUsername });
  } catch (err) {
    console.error("GitHub repos error:", err);
    return NextResponse.json({ error: "Internal Server Error", repos: [] }, { status: 500 });
  }
}
