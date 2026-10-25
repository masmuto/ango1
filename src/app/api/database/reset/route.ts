import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { mode } = await req.json();
    // mode: "keepUsers" or "full"
    const keepUsers = mode === "keepUsers";

    await db.$transaction([
      db.pesanLog.deleteMany(),
      db.pesanTemplate.deleteMany(),
      db.pengaturan.deleteMany(),
      db.pembayaranSPP.deleteMany(),
      db.anggotaKelompok.deleteMany(),
      db.jadwalKelompok.deleteMany(),
      db.kelompokBelajar.deleteMany(),
      db.santri.deleteMany(),
      db.kelas.deleteMany(),
      db.ustaz.deleteMany(),
    ]);

    if (!keepUsers) {
      await db.user.deleteMany();
    }

    return NextResponse.json({ ok: true, mode });
  } catch (err) {
    console.error("[database/reset] error:", err);
    return NextResponse.json({ error: "Gagal reset database" }, { status: 500 });
  }
}
