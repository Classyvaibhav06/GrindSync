import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST /api/projects/[id]/apply — apply to contribute with a short message
export async function POST(
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
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    let message = "";
    try {
      const body = await req.json();
      if (typeof body?.message === "string") message = body.message.trim().slice(0, 300);
    } catch { /* body optional */ }

    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();

    const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.status === "CLOSED") {
      return NextResponse.json({ error: "This project is closed" }, { status: 400 });
    }
    if (project.ownerId.toString() === session.user.id) {
      return NextResponse.json({ error: "You own this project" }, { status: 400 });
    }
    if ((project.members ?? []).some((m: any) => m.userId?.toString() === session.user.id)) {
      return NextResponse.json({ error: "You are already a member" }, { status: 400 });
    }

    // Re-applying after a rejection updates the old application instead of duplicating.
    const existing = await db.collection("project_applications").findOne({ projectId: project._id, userId: uid });
    if (existing?.status === "PENDING") {
      return NextResponse.json({ error: "You already have a pending application" }, { status: 400 });
    }

    if (existing) {
      await db.collection("project_applications").updateOne(
        { _id: existing._id },
        { $set: { status: "PENDING", message, appliedAt: new Date() } }
      );
    } else {
      await db.collection("project_applications").insertOne({
        projectId: project._id,
        userId: uid,
        status: "PENDING",
        message,
        appliedAt: new Date(),
      });
    }

    // Notify the owner
    await db.collection("notifications").insertOne({
      recipientId: project.ownerId,
      actorId: uid,
      actorName: session.user.name || "Someone",
      actorImage: session.user.image || null,
      actorUsername: (session.user as any).username || session.user.name,
      type: "project",
      message: `applied to join your project "${project.name}"`,
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch (error) {
    console.error("Project apply error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
