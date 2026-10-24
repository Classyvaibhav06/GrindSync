import type { Db } from "mongodb";

// Unambiguous alphabet (no 0/o/1/i/l) so room codes are easy to read aloud.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateRoomCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// A participant counts as live for 2 minutes after their last heartbeat,
// mirroring the global online threshold used across the app.
export const LIVE_WINDOW_MS = 2 * 60 * 1000;

export function liveParticipants(participants: any[] = []) {
  const threshold = Date.now() - LIVE_WINDOW_MS;
  return (participants ?? []).filter(
    (p) => p?.lastActiveAt && new Date(p.lastActiveAt).getTime() >= threshold
  );
}

// Attach user profile info (name/username/image) to participant entries.
export async function enrichParticipants(db: Db, participants: any[] = []) {
  const ids = participants.map((p) => p.userId);
  if (ids.length === 0) return [];
  const users = await db
    .collection("users")
    .find({ _id: { $in: ids } }, { projection: { name: 1, username: 1, image: 1 } })
    .toArray();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return participants.map((p) => {
    const u = byId.get(p.userId.toString());
    return {
      userId: p.userId.toString(),
      name: u?.name || "User",
      username: u?.username || "",
      image: u?.image || null,
      joinedAt: p.joinedAt,
      needsHelp: !!p.needsHelp,
    };
  });
}
