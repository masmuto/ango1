import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { FIREBASE_API_KEY, FIREBASE_AUTH_URL } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

const FIREBASE_WEB_API_KEY = FIREBASE_API_KEY;

interface FirebaseUser {
  localId: string;
  email: string;
}

async function firebaseAuthCreateUser(email: string, password: string, displayName: string): Promise<FirebaseUser> {
  // Try to sign in first — if user exists, we don't need to create
  try {
    const signInRes = await fetch(
      `${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (signInRes.ok) {
      const signInData = await signInRes.json();
      // Update display name if needed
      try {
        await fetch(`${FIREBASE_AUTH_URL}/accounts:update?key=${FIREBASE_WEB_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: signInData.idToken, displayName, returnSecureToken: false }),
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        // ignore update errors
      }
      return { localId: signInData.localId, email: signInData.email };
    }
  } catch {
    // user doesn't exist, fall through to create
  }

  // Create new user via Firebase Auth REST API
  const createRes = await fetch(
    `${FIREBASE_AUTH_URL}/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createData?.error?.message || "Gagal membuat user Firebase Auth");
  }

  // Update display name
  if (createData.idToken) {
    try {
      await fetch(`${FIREBASE_AUTH_URL}/accounts:update?key=${FIREBASE_WEB_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: createData.idToken, displayName, returnSecureToken: false }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // ignore
    }
  }

  return { localId: createData.localId, email: createData.email };
}

// GET: returns Firestore security rules + setup instructions (kept for UI compat)
export async function GET() {
  return NextResponse.json({
    data: {
      rules: FIRESTORE_RULES_DOC,
      instructions: [
        "Pastikan Email/Password sign-in method sudah diaktifkan di Firebase Console → Authentication",
        "Klik tombol 'Inisialisasi Akun Auth' — akan membuat 3 akun Firebase Auth (admin, bendahara, pengelola) dan dokumen user di database lokal",
        "Setelah selesai, login dengan admin@annahl.sch.id / admin123",
      ],
    },
  });
}

// POST: create Firebase Auth users + corresponding local User records
export async function POST() {
  try {
    if (!FIREBASE_WEB_API_KEY) {
      return NextResponse.json({ error: "NEXT_PUBLIC_FIREBASE_API_KEY belum diset di .env" }, { status: 400 });
    }

    const results: Array<{ step: string; ok: boolean; message: string }> = [];
    const accounts = [
      { username: "admin", email: "admin@annahl.sch.id", password: "admin123", name: "Administrator", role: "admin", phone: "081234560000" },
      { username: "bendahara", email: "bendahara@annahl.sch.id", password: "bendahara123", name: "Bendahara Utama", role: "bendahara", phone: "081234560001" },
      { username: "pengelola", email: "pengelola@annahl.sch.id", password: "pengelola123", name: "Pengelola Santri", role: "pengelola", phone: "081234560002" },
    ];

    for (const acc of accounts) {
      // 1. Create or verify Firebase Auth user
      try {
        await firebaseAuthCreateUser(acc.email, acc.password, acc.name);
        results.push({ step: `auth.${acc.username}`, ok: true, message: `Akun Firebase Auth: ${acc.email}` });
      } catch (err) {
        const msg = String(err);
        if (/EMAIL_EXISTS/i.test(msg)) {
          results.push({ step: `auth.${acc.username}`, ok: true, message: `Akun Firebase Auth sudah ada: ${acc.email}` });
        } else {
          results.push({ step: `auth.${acc.username}`, ok: false, message: `Gagal: ${msg}` });
        }
      }

      // 2. Upsert local User record (Prisma/SQLite)
      try {
        await db.user.upsert({
          where: { username: acc.username },
          update: {
            password: acc.password, // kept for reference / fallback; auth is via Firebase
            name: acc.name,
            role: acc.role,
            email: acc.email,
            phone: acc.phone,
            active: true,
          },
          create: {
            username: acc.username,
            password: acc.password,
            name: acc.name,
            role: acc.role,
            email: acc.email,
            phone: acc.phone,
            active: true,
          } as Prisma.UserUpsertArgs["create"],
        });
        results.push({ step: `local.${acc.username}`, ok: true, message: "Data user lokal siap" });
      } catch (err) {
        results.push({ step: `local.${acc.username}`, ok: false, message: `Gagal simpan lokal: ${String(err)}` });
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    const allOk = successCount === results.length;
    return NextResponse.json({ ok: allOk, results, message: `${successCount}/${results.length} langkah berhasil` });
  } catch (err) {
    console.error("[firebase/init] error:", err);
    return NextResponse.json({ error: `Inisialisasi gagal: ${String(err)}` }, { status: 500 });
  }
}

const FIRESTORE_RULES_DOC = `// Firebase Authentication sudah aktif.
// Untuk Firestore database rules, lihat menu Firebase Console → Firestore → Rules.
// Aplikasi ini menggunakan Firebase Auth untuk login + local SQLite untuk data app.
// Jika Anda ingin pindahkan data ke Firestore juga, perlu service account key
// (download dari Firebase Console → Project Settings → Service Accounts → Generate new private key).`;
