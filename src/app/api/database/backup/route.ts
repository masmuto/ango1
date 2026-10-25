import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [users, santri, ustaz, kelas, kelompokBelajar, jadwalKelompok, anggotaKelompok, pembayaranSPP, pengaturan, pesanTemplate, pesanLog] =
      await Promise.all([
        db.user.findMany(),
        db.santri.findMany({ include: { kelas: true } }),
        db.ustaz.findMany(),
        db.kelas.findMany(),
        db.kelompokBelajar.findMany({ include: { jadwal: true } }),
        db.jadwalKelompok.findMany(),
        db.anggotaKelompok.findMany(),
        db.pembayaranSPP.findMany(),
        db.pengaturan.findMany(),
        db.pesanTemplate.findMany(),
        db.pesanLog.findMany(),
      ]);

    const backup = {
      meta: {
        app: "GO An Nahl",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
      },
      counts: {
        users: users.length,
        santri: santri.length,
        ustaz: ustaz.length,
        kelas: kelas.length,
        kelompokBelajar: kelompokBelajar.length,
        jadwalKelompok: jadwalKelompok.length,
        anggotaKelompok: anggotaKelompok.length,
        pembayaranSPP: pembayaranSPP.length,
        pengaturan: pengaturan.length,
        pesanTemplate: pesanTemplate.length,
        pesanLog: pesanLog.length,
      },
      data: {
        users,
        santri,
        ustaz,
        kelas,
        kelompokBelajar,
        jadwalKelompok,
        anggotaKelompok,
        pembayaranSPP,
        pengaturan,
        pesanTemplate,
        pesanLog,
      },
    };

    return NextResponse.json(backup, {
      headers: {
        "Content-Disposition": `attachment; filename="an-nahl-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("[database/backup] error:", err);
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
