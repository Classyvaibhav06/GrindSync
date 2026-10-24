import { ObjectId } from "mongodb";

// Reference shape of the contribution marketplace documents.
// Implemented by /api/projects (+ /apply, /applications) using the
// "projects" and "project_applications" collections.

export type ProjectRole = "OWNER" | "CONTRIBUTOR";
export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ProjectStatus = "OPEN" | "CLOSED";

export interface Project {
  _id?: ObjectId;
  name: string;
  description: string;
  githubRepoUrl: string; // e.g., "https://github.com/Classyvaibhav06/GrindSync"
  ownerId: ObjectId;
  techStack: string[];   // lowercase tags, e.g. ["react", "next.js", "mongodb"]
  skillLevel: SkillLevel;
  lookingFor: string;    // short "who should apply" note
  members: ProjectMember[];
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  userId: ObjectId;      // The user's internal ID in our DB
  role: ProjectRole;
  joinedAt: Date;
}

export interface ProjectApplication {
  _id?: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}
