import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

// GET /api/projects/[id] — full detail with members, applications and caller status
export async function GET(
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
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const uid = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();

    const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = project.ownerId.toString() === session.user.id;

    // Enrich members with profile info
    const memberIds = (project.members ?? []).map((m: any) => m.userId);
    const members = await db
      .collection("users")
      .find({ _id: { $in: memberIds } }, { projection: { name: 1, username: 1, image: 1 } })
      .toArray();
    const memberById = new Map(members.map((m) => [m._id.toString(), m]));

    // Applications: owner sees all, others see only their own
    const appFilter: Record<string, unknown> = { projectId: project._id };
    if (!isOwner) appFilter.userId = uid;
    const applications = await db
      .collection("project_applications")
      .find(appFilter)
      .sort({ appliedAt: -1 })
      .limit(50)
      .toArray();

    const applicantIds = [...new Set(applications.map((a) => a.userId))];
    const applicants = await db
      .collection("users")
      .find({ _id: { $in: applicantIds } }, { projection: { name: 1, username: 1, image: 1 } })
      .toArray();
    const applicantById = new Map(applicants.map((a) => [a._id.toString(), a]));

    const myApp = applications.find((a) => a.userId.toString() === session.user.id);
    const isMember = (project.members ?? []).some(
      (m: any) => m.userId?.toString() === session.user.id
    );

    const owner = memberById.get(project.ownerId.toString());

    return NextResponse.json({
      project: {
        _id: project._id.toString(),
        name: project.name,
        description: project.description || "",
        githubRepoUrl: project.githubRepoUrl || "",
        techStack: project.techStack ?? [],
        skillLevel: project.skillLevel,
        lookingFor: project.lookingFor || "",
        status: project.status || "OPEN",
        ownerId: project.ownerId.toString(),
        ownerName: owner?.name || "User",
        ownerUsername: owner?.username || "",
        createdAt: project.createdAt,
        isOwner,
        isMember,
        myApplicationStatus: myApp ? myApp.status : null,
        members: (project.members ?? []).map((m: any) => {
          const u = memberById.get(m.userId.toString());
          return {
            userId: m.userId.toString(),
            role: m.role,
            joinedAt: m.joinedAt,
            name: u?.name || "User",
            username: u?.username || "",
            image: u?.image || null,
          };
        }),
        applications: applications.map((a) => {
          const u = applicantById.get(a.userId.toString());
          return {
            _id: a._id.toString(),
            userId: a.userId.toString(),
            status: a.status,
            message: a.message || "",
            appliedAt: a.appliedAt,
            name: u?.name || "User",
            username: u?.username || "",
            image: u?.image || null,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Project detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id] — owner-only edits (also closes/reopens the project)
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
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the owner can update this project" }, { status: 403 });
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) set.name = body.name.trim().slice(0, 100);
    if (typeof body.description === "string") set.description = body.description.trim().slice(0, 600);
    if (typeof body.githubRepoUrl === "string") set.githubRepoUrl = body.githubRepoUrl.trim();
    if (typeof body.lookingFor === "string") set.lookingFor = body.lookingFor.trim().slice(0, 200);
    if (Array.isArray(body.techStack)) {
      set.techStack = body.techStack
        .filter((t: unknown) => typeof t === "string")
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8);
    }
    if (SKILL_LEVELS.includes(body.skillLevel)) set.skillLevel = body.skillLevel;
    if (body.status === "OPEN" || body.status === "CLOSED") set.status = body.status;

    await db.collection("projects").updateOne({ _id: project._id }, { $set: set });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
