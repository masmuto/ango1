import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/fcm/vapid — return VAPID public key (safe to expose to client)
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key belum diset di .env (NEXT_PUBLIC_VAPID_PUBLIC_KEY)" },
      { status: 503 },
    );
  }
  return NextResponse.json({ publicKey });
}
