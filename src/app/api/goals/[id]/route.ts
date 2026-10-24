import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// IST day key, same convention the dashboard/streak logic uses.
function istDayKey(d = new Date()) {
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

// PATCH /api/goals/[id] — log progress, mark complete, or edit the goal.
// Body: { action: "increment", amount?: number } | { action: "complete" }
//       | { title?, target?, unit?, deadline? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });
    }

    const body = await req.json();
    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();
    const goals = db.collection("goals");

    const goal = await goals.findOne({ _id: new ObjectId(id), userId: uid });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (body.action === "increment") {
      const amount = Number(body.amount) || 1;
      if (!Number.isFinite(amount)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      // Progress is capped at target; for DAILY goals a fresh IST day starts from 0
      // (the list endpoint lazily resets, but increment directly too).
      const isFreshDay = goal.type === "DAILY" && goal.lastProgressDate !== istDayKey();
      const base = isFreshDay ? 0 : goal.progress;
      const progress = Math.max(0, Math.min(goal.target, base + amount));
      const set: Record<string, unknown> = {
        progress,
        lastProgressDate: istDayKey(),
      };
      if (progress >= goal.target && !goal.completedAt) set.completedAt = new Date();
      if (progress < goal.target) set.completedAt = null;

      await goals.updateOne({ _id: goal._id }, { $set: set });
      return NextResponse.json({ ok: true, progress });
    }

    if (body.action === "complete") {
      await goals.updateOne(
        { _id: goal._id },
        { $set: { progress: goal.target, completedAt: goal.completedAt ?? new Date(), lastProgressDate: istDayKey() } }
      );
      return NextResponse.json({ ok: true, progress: goal.target });
    }

    // Field edits
    const set: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) set.title = body.title.trim().slice(0, 120);
    if (Number.isFinite(Number(body.target)) && Number(body.target) > 0) {
      set.target = Number(body.target);
      set.progress = Math.min(goal.progress, Number(body.target));
    }
    if (typeof body.deadline === "string") {
      const d = new Date(body.deadline);
      if (!isNaN(d.getTime())) set.deadline = d;
    }
    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await goals.updateOne({ _id: goal._id }, { $set: set });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Goal update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/goals/[id] — remove a goal
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const res = await db
      .collection("goals")
      .deleteOne({ _id: new ObjectId(id), userId: new ObjectId(session.user.id) });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Goal delete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
