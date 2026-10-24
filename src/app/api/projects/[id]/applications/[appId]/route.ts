import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// PATCH /api/projects/[id]/applications/[appId] — owner approves or rejects.
// Approval adds the applicant as a CONTRIBUTOR member and notifies them.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, appId } = await params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(appId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    if (body.status !== "APPROVED" && body.status !== "REJECTED") {
      return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the owner can review applications" }, { status: 403 });
    }

    const application = await db.collection("project_applications").findOne({ _id: new ObjectId(appId) });
    if (!application || application.projectId.toString() !== id) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (application.status !== "PENDING") {
      return NextResponse.json({ error: `Application already ${application.status.toLowerCase()}` }, { status: 400 });
    }

    await db.collection("project_applications").updateOne(
      { _id: application._id },
      { $set: { status: body.status, reviewedAt: new Date() } }
    );

    if (body.status === "APPROVED") {
      const alreadyMember = (project.members ?? []).some(
        (m: any) => m.userId?.toString() === application.userId.toString()
      );
      if (!alreadyMember) {
        await db.collection("projects").updateOne(
          { _id: project._id },
          { $push: { members: { userId: application.userId, role: "CONTRIBUTOR", joinedAt: new Date() } } }
        );
      }
    }

    // Notify the applicant
    await db.collection("notifications").insertOne({
      recipientId: application.userId,
      actorId: new ObjectId(session.user.id),
      actorName: session.user.name || "Someone",
      actorImage: session.user.image || null,
      actorUsername: (session.user as any).username || session.user.name,
      type: "project",
      message:
        body.status === "APPROVED"
          ? `accepted you as a contributor on "${project.name}"`
          : `declined your application for "${project.name}"`,
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, status: body.status });
  } catch (error) {
    console.error("Application review error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
