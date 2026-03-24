import { ObjectId } from "mongodb";

export type ProjectRole = "OWNER" | "CONTRIBUTOR";

export interface Project {
  _id?: ObjectId;
  name: string;
  description: string;
  githubRepoUrl: string; // e.g., "https://github.com/Classyvaibhav06/GrindSync"
  ownerId: ObjectId;
  tags: string[]; // e.g., ["React", "TypeScript", "Next.js"]
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  _id?: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;       // The user's internal ID in our DB
  githubUsername: string; // Used to match incoming GitHub commits
  role: ProjectRole;
  joinedAt: Date;
}

export interface ProjectCommit {
  _id?: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  commitHash: string;
  message: string;
  url: string;
  date: Date;
  awardedXp: number;      // e.g., 25 points for this commit
}

export interface ProjectApplication {
  _id?: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message?: string;
  appliedAt: Date;
}
