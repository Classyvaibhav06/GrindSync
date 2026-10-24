import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { TOPIC_ORDER, classifySlug, type Topic } from "@/lib/topics";

// GET /api/analysis/topics?userId= — weak-topic analysis.
// Auto analysis classifies every unique verified DSA slug into a topic;
// manual analysis reads the user's saved weakTopics. Public per profile (?userId=).
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paramUserId = searchParams.get("userId");
    let targetId: ObjectId;
    if (paramUserId && ObjectId.isValid(paramUserId)) {
      targetId = new ObjectId(paramUserId);
    } else {
      targetId = new ObjectId(session.user.id);
    }

    const client = await clientPromise;
    const db = client.db();

    const [completions, user] = await Promise.all([
      db
        .collection("dsa_completions")
        .find({ userId: targetId }, { projection: { titleSlug: 1, problemDate: 1, verifiedAt: 1 } })
        .sort({ verifiedAt: -1 })
        .limit(500)
        .toArray(),
      db.collection("users").findOne({ _id: targetId }, { projection: { weakTopics: 1 } }),
    ]);

    // Unique problems per slug (latest verification wins)
    const bySlug = new Map<string, { slug: string; lastSolved: Date }>();
    for (const c of completions) {
      if (!c.titleSlug) continue;
      const prev = bySlug.get(c.titleSlug);
      const when = c.verifiedAt ?? c.problemDate ?? null;
      if (!prev || (when && new Date(when) > new Date(prev.lastSolved))) {
        bySlug.set(c.titleSlug, { slug: c.titleSlug, lastSolved: when ? new Date(when) : new Date(0) });
      }
    }

    // Classify into topic counts
    const counts = new Map<Topic, { solved: number; lastSolved: Date | null }>();
    let unclassified = 0;
    for (const { slug, lastSolved } of bySlug.values()) {
      const topic = classifySlug(slug);
      if (!topic) { unclassified += 1; continue; }
      const cur = counts.get(topic) ?? { solved: 0, lastSolved: null };
      cur.solved += 1;
      if (!cur.lastSolved || lastSolved > cur.lastSolved) cur.lastSolved = lastSolved;
      counts.set(topic, cur);
    }

    const breakdown = TOPIC_ORDER.map((topic) => ({
      topic,
      solved: counts.get(topic)?.solved ?? 0,
      lastSolved: counts.get(topic)?.lastSolved ?? null,
    }));

    // Auto-weak: among topics the user has touched, flag the thinnest; plus
    // count how many known topics are completely untouched.
    const touched = breakdown.filter((b) => b.solved > 0).sort((a, b) => a.solved - b.solved);
    const focusAreas = touched.slice(0, 3).map((b) => b.topic);
    const untouched = breakdown.filter((b) => b.solved === 0).length;

    return NextResponse.json({
      totalVerifiedProblems: bySlug.size,
      unclassified,
      breakdown,
      focusAreas,
      untouchedTopics: untouched,
      weakTopics: user?.weakTopics ?? [],
      isSelf: targetId.toString() === session.user.id,
    });
  } catch (error) {
    console.error("Topic analysis error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/analysis/topics — save the caller's manually-marked weak topics
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!Array.isArray(body.weakTopics)) {
      return NextResponse.json({ error: "weakTopics must be an array" }, { status: 400 });
    }

    const valid = new Set<string>(TOPIC_ORDER);
    const weakTopics = body.weakTopics
      .filter((t: unknown) => typeof t === "string")
      .map((t: string) => t.trim())
      .filter((t: string) => valid.has(t))
      .slice(0, 10);

    const client = await clientPromise;
    const db = client.db();
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { weakTopics } }
    );

    return NextResponse.json({ ok: true, weakTopics });
  } catch (error) {
    console.error("Weak topics save error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
