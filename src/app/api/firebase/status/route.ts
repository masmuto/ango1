import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFirebaseConfig } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const firebaseConfig = getFirebaseConfig();
    const configured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

    let userCount = 0;
    try {
      userCount = await db.user.count();
    } catch {
      // ignore
    }

    return NextResponse.json({
      data: {
        firebase: {
          apiKey: firebaseConfig.apiKey,
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
          messagingSenderId: firebaseConfig.messagingSenderId,
          appId: firebaseConfig.appId,
          configured,
          initError: configured ? null : "Firebase config tidak ditemukan (cek src/lib/firebase-config.ts)",
        },
        database: {
          hasUsers: userCount > 0,
          userCount,
          error: null,
        },
        needsSetup: !configured || userCount === 0,
      },
    });
  } catch (err) {
    console.error("[firebase/status] error:", err);
    return NextResponse.json({ error: "Gagal memuat status" }, { status: 500 });
  }
}
