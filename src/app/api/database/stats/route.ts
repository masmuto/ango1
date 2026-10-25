import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [users, santri, ustaz, kelas, kelompokBelajar, anggotaKelompok, pembayaranSPP, pengaturan, pesanTemplate, pesanLog] =
      await Promise.all([
        db.user.count(),
        db.santri.count(),
        db.ustaz.count(),
        db.kelas.count(),
        db.kelompokBelajar.count(),
        db.anggotaKelompok.count(),
        db.pembayaranSPP.count(),
        db.pengaturan.count(),
        db.pesanTemplate.count(),
        db.pesanLog.count(),
      ]);

    return NextResponse.json({
      data: {
        users,
        santri,
        ustaz,
        kelas,
        kelompokBelajar,
        anggotaKelompok,
        pembayaranSPP,
        pengaturan,
        pesanTemplate,
        pesanLog,
      },
    });
  } catch (err) {
    console.error("[database/stats] error:", err);
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 });
  }
}
