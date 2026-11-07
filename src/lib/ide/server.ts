import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { Document, WithId } from "mongodb";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;
const MAX_PAIRING_CODE_ATTEMPTS_PER_MINUTE = 12;

export interface IdeDevice extends WithId<Document> {
  userId: unknown;
  deviceId: string;
  deviceName: string;
  ide: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt?: Date;
  revokedAt?: Date;
  state?: string;
  currentLanguage?: string;
}

let indexSetup: Promise<void> | undefined;

export async function getIdeDb() {
  const client = await clientPromise;
  const db = client.db();
  if (!indexSetup) {
    indexSetup = Promise.all([
      db.collection("ide_pairing_codes").createIndex({ codeHash: 1 }, { unique: true }),
      db.collection("ide_pairing_codes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("ide_devices").createIndex({ tokenHash: 1 }, { unique: true }),
      db.collection("ide_devices").createIndex({ userId: 1, revokedAt: 1 }),
      db.collection("ide_activity_batches").createIndex({ deviceId: 1, batchId: 1 }, { unique: true }),
      db.collection("ide_activity_batches").createIndex({ userId: 1, receivedAt: -1 }),
      db.collection("ide_pair_attempts").createIndex({ key: 1 }, { unique: true }),
      db.collection("ide_pair_attempts").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => {
      indexSetup = undefined;
      throw error;
    });
  }
  await indexSetup;
  return db;
}

function secretKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be configured to use IDE pairing");
  return secret;
}

export function hashIdeSecret(value: string) {
  return createHmac("sha256", secretKey()).update(value).digest("hex");
}

export function createPairingCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function createDeviceToken() {
  return `gsd_${randomBytes(32).toString("base64url")}`;
}

export function getClientAddress(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export async function verifyPairAttemptLimit(req: NextRequest, db: Awaited<ReturnType<typeof getIdeDb>>) {
  const key = hashIdeSecret(`pair-attempt:${getClientAddress(req)}`);
  const now = new Date();
  try {
    const attempt = await db.collection("ide_pair_attempts").findOneAndUpdate(
      { key },
      [
        { $set: {
          attempts: {
            $cond: [
              { $gt: ["$expiresAt", now] },
              { $add: [{ $ifNull: ["$attempts", 0] }, 1] },
              1,
            ],
          },
          expiresAt: {
            $cond: [
              { $gt: ["$expiresAt", now] },
              "$expiresAt",
              new Date(now.getTime() + 60_000),
            ],
          },
        } },
      ],
      { upsert: true, returnDocument: "after" }
    );
    return !!attempt && attempt.attempts <= MAX_PAIRING_CODE_ATTEMPTS_PER_MINUTE;
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const attempt = await db.collection("ide_pair_attempts").findOneAndUpdate(
      { key },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" }
    );
    return !!attempt && attempt.attempts <= MAX_PAIRING_CODE_ATTEMPTS_PER_MINUTE;
  }
}

export async function getAuthenticatedIdeDevice(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(gsd_[A-Za-z0-9_-]{40,})$/i);
  if (!match) return null;

  const db = await getIdeDb();
  const tokenHash = hashIdeSecret(match[1]);
  const device = await db.collection<IdeDevice>("ide_devices").findOne({
    tokenHash,
    revokedAt: { $exists: false },
  });
  if (!device) return null;

  await db.collection("ide_devices").updateOne(
    { _id: device._id, revokedAt: { $exists: false } },
    { $set: { lastSeenAt: new Date() } }
  );
  return device;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Start of the current day in IST (the site's daily reset boundary), as a UTC Date. */
export function startOfTodayIst(now = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/** Seconds of verified IDE activity a user has synced since the IST day began. */
export async function getTodayIdeSeconds(db: Awaited<ReturnType<typeof getIdeDb>>, userId: unknown) {
  const [row] = await db.collection("ide_activity_batches").aggregate<{ seconds: number }>([
    { $match: { userId, receivedAt: { $gte: startOfTodayIst() } } },
    { $group: { _id: null, seconds: { $sum: "$totalActiveSeconds" } } },
  ]).toArray();
  return row?.seconds || 0;
}

export async function hasConnectedIde(db: Awaited<ReturnType<typeof getIdeDb>>, userId: unknown) {
  return !!(await db.collection("ide_devices").findOne(
    { userId, revokedAt: { $exists: false } },
    { projection: { _id: 1 } }
  ));
}

export function newDeviceId() {
  return randomUUID();
}
