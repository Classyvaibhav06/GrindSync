import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

// GET /api/projects?tech=react,node&level=BEGINNER&q=dashboard
// Filters are also applied client-side; they exist here for API consumers.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tech = (searchParams.get("tech") || "")
      .split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const level = searchParams.get("level") || "";
    const q = (searchParams.get("q") || "").trim();

    const filter: Record<string, unknown> = {};
    if (tech.length > 0) filter.techStack = { $in: tech };
    if (SKILL_LEVELS.includes(level)) filter.skillLevel = level;
    if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }];

    const client = await clientPromise;
    const db = client.db();

    const projects = await db
      .collection("projects")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(60)
      .toArray();

    // Owner info
    const ownerIds = [...new Set(projects.map((p) => p.ownerId))];
    const owners = await db
      .collection("users")
      .find({ _id: { $in: ownerIds } }, { projection: { name: 1, username: 1, image: 1 } })
      .toArray();
    const ownerById = new Map(owners.map((o) => [o._id.toString(), o]));

    // Caller's application status per project
    const uid = new ObjectId(session.user.id);
    const myApps = await db
      .collection("project_applications")
      .find({ userId: uid, projectId: { $in: projects.map((p) => p._id) } })
      .toArray();
    const appByProject = new Map(myApps.map((a) => [a.projectId.toString(), a]));

    const result = projects.map((p) => {
      const owner = ownerById.get(p.ownerId.toString());
      const app = appByProject.get(p._id.toString());
      const isMember = (p.members ?? []).some(
        (m: any) => m.userId?.toString() === session.user.id
      );
      return {
        _id: p._id.toString(),
        name: p.name,
        description: p.description || "",
        githubRepoUrl: p.githubRepoUrl || "",
        techStack: p.techStack ?? [],
        skillLevel: p.skillLevel,
        lookingFor: p.lookingFor || "",
        status: p.status || "OPEN",
        ownerId: p.ownerId.toString(),
        ownerName: owner?.name || "User",
        ownerUsername: owner?.username || "",
        ownerImage: owner?.image || null,
        memberCount: (p.members ?? []).length,
        createdAt: p.createdAt,
        isOwner: p.ownerId.toString() === session.user.id,
        isMember,
        myApplicationStatus: app ? app.status : null,
      };
    });

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/projects — create a project listing
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Project name is required (max 100 chars)" }, { status: 400 });
    }

    const skillLevel = SKILL_LEVELS.includes(body.skillLevel) ? body.skillLevel : "BEGINNER";
    const techStack = Array.isArray(body.techStack)
      ? body.techStack
          .filter((t: unknown) => typeof t === "string")
          .map((t: string) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const githubRepoUrl =
      typeof body.githubRepoUrl === "string" && /^https?:\/\//.test(body.githubRepoUrl.trim())
        ? body.githubRepoUrl.trim()
        : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 600) : "";
    const lookingFor = typeof body.lookingFor === "string" ? body.lookingFor.trim().slice(0, 200) : "";

    const uid = new ObjectId(session.user.id);
    const now = new Date();
    const doc = {
      name,
      description,
      githubRepoUrl,
      techStack,
      skillLevel,
      lookingFor,
      ownerId: uid,
      members: [{ userId: uid, role: "OWNER", joinedAt: now }],
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("projects").insertOne(doc);

    return NextResponse.json({ project: { _id: result.insertedId.toString(), ...doc, ownerId: doc.ownerId.toString() } });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
