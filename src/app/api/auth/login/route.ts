import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { FIREBASE_API_KEY, FIREBASE_AUTH_URL } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

interface FirebaseSignInResponse {
  idToken?: string;
  localId?: string;
  email?: string;
  error?: { message?: string };
}

export async function POST(req: NextRequest) {
  try {
    if (!FIREBASE_API_KEY) {
      return NextResponse.json(
        { error: "Firebase API key belum diset. Lihat src/lib/firebase-config.ts" },
        { status: 503 },
      );
    }

    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }

    // 1. Look up user profile in local DB by username to get email
    const user = await db.user.findUnique({
      where: { username: String(username).trim() },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Akun tidak punya email (diperlukan untuk Firebase Auth)" }, { status: 400 });
    }

    // 2. Verify password against Firebase Auth (REST API).
    // If Firebase Auth isn't ready yet (CONFIGURATION_NOTFOUND or EMAIL_NOT_FOUND),
    // fall back to local password verification so the app remains usable.
    let firebaseOk = false;
    let fallbackReason = "";
    try {
      const verifyRes = await fetch(
        `${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, password, returnSecureToken: true }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const verifyData: FirebaseSignInResponse = await verifyRes.json();
      if (verifyRes.ok && verifyData.idToken) {
        firebaseOk = true;
      } else {
        const errMsg = verifyData.error?.message || "Verifikasi gagal";
        if (/EMAIL_NOT_FOUND|USER_DISABLED|INVALID_LOGIN_CREDENTIALS/i.test(errMsg)) {
          // User not yet created in Firebase Auth — fallback to local password
          fallbackReason = `Firebase Auth: user belum terdaftar di Firebase. Verifikasi lokal digunakan.`;
        } else if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED/i.test(errMsg)) {
          // Email/Password sign-in method not yet enabled in Firebase Console
          fallbackReason = `Firebase Auth: sign-in method Email/Password belum diaktifkan. Verifikasi lokal digunakan.`;
        } else if (/INVALID_PASSWORD/i.test(errMsg)) {
          return NextResponse.json({ error: "Password salah" }, { status: 401 });
        } else {
          return NextResponse.json({ error: `Firebase Auth: ${errMsg}` }, { status: 401 });
        }
      }
    } catch (err) {
      fallbackReason = `Firebase Auth unreachable: ${String(err)}. Verifikasi lokal digunakan.`;
    }

    // Fallback: verify against local password if Firebase didn't work
    if (!firebaseOk) {
      if (user.password !== String(password)) {
        return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
      }
      console.warn(`[auth/login] fallback ke verifikasi lokal untuk ${user.username}. Alasan: ${fallbackReason}`);
    }

    // 3. Update lastLogin timestamp locally
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 4. Build session user
    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as SessionUser["role"],
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      active: user.active,
      lastLogin: new Date().toISOString(),
      createdAt: user.createdAt.toISOString(),
    };

    // 5. Set HTTP-only session cookie containing the user ID
    const cookieStore = await cookies();
    cookieStore.set("an-nahl-session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ user: sessionUser });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
