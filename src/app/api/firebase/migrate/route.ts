import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: return migration info (this app uses hybrid: Firebase Auth + local SQLite, no migration needed)
export async function GET() {
  return NextResponse.json({
    data: {
      mode: "hybrid",
      description:
        "Aplikasi menggunakan Firebase Auth untuk otentikasi dan SQLite lokal untuk data aplikasi (Santri, Pembayaran, dst). " +
        "Migrasi data ke Firestore tidak diperlukan dalam mode ini. " +
        "Jika ingin full Firestore, perlu service account key dari Firebase Console.",
    },
  });
}

// POST: no-op in hybrid mode (kept for UI compatibility)
export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Mode hybrid: Firebase Auth aktif, data tersimpan di database lokal. Tidak ada migrasi yang diperlukan.",
  });
}
