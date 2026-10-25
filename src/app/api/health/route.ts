import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isFirebaseConfigured, getFirebaseInitError } from "@/lib/firebase-admin";
import { getFirebaseConfig } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/health — diagnostic endpoint for Vercel debugging
export async function GET() {
  const firebaseConfig = getFirebaseConfig();
  let dbStatus: { connected: boolean; userCount?: number; error?: string } = {
    connected: false,
  };
  try {
    const count = await db.user.count();
    dbStatus = { connected: true, userCount: count };
  } catch (err) {
    dbStatus = { connected: false, error: String(err) };
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelRegion: process.env.VERCEL_REGION || null,
    },
    firebase: {
      configured: isFirebaseConfigured(),
      initError: getFirebaseInitError(),
      projectId: firebaseConfig.projectId,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    },
    database: {
      urlPrefix: (process.env.DATABASE_URL || "").split(":")[0],
      ...dbStatus,
    },
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasFirebaseApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasVapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      hasVapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
    },
  });
}
