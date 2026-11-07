import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { createPairingCode, getIdeDb, hashIdeSecret, PAIRING_CODE_TTL_MS } from "@/lib/ide/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getIdeDb();
    const userId = new ObjectId(session.user.id);
    const code = createPairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    await db.collection("ide_pairing_codes").deleteMany({ userId });
    await db.collection("ide_pairing_codes").insertOne({
      codeHash: hashIdeSecret(code),
      userId,
      createdAt: new Date(),
      expiresAt,
    });

    return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("IDE pairing-code generation failed:", error);
    return NextResponse.json({ error: "Could not generate a pairing code" }, { status: 500 });
  }
}
