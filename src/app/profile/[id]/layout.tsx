import type { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Server-side metadata so shared profile links unfurl properly (OG/Twitter).
// The page itself is a client component; this layout only supplies metadata.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let name = "A grinder";
  let username = "";
  let bio = "";
  let image: string | undefined;

  try {
    if (ObjectId.isValid(id)) {
      const client = await clientPromise;
      const db = client.db();
      const user = await db.collection("users").findOne(
        { _id: new ObjectId(id) },
        { projection: { name: 1, username: 1, bio: 1, image: 1 } }
      );
      if (user) {
        name = user.name || name;
        username = user.username || "";
        bio = user.bio || "";
        // Only http(s) images work as OG images — base64 avatars are too large.
        if (typeof user.image === "string" && user.image.startsWith("http")) {
          image = user.image;
        }
      }
    }
  } catch {
    // Fall through with defaults
  }

  const title = `${name}${username ? ` (@${username})` : ""} — GrindSync`;
  const description =
    bio || `Check out ${name}'s grind on GrindSync — challenges, streaks and stats.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
