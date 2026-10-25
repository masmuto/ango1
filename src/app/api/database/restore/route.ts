import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = body?.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Format backup tidak valid" }, { status: 400 });
    }

    // Wipe all existing data (keep users unless explicitly told not to)
    await db.$transaction([
      db.pesanLog.deleteMany(),
      db.pesanTemplate.deleteMany(),
      db.pengaturan.deleteMany(),
      db.pembayaranSPP.deleteMany(),
      db.anggotaKelompok.deleteMany(),
      db.jadwalKelompok.deleteMany(),
      db.kelompokBelajar.deleteMany(),
      db.kelas.deleteMany(),
      db.santri.deleteMany(),
      db.ustaz.deleteMany(),
    ]);

    const counts: Record<string, number> = {};

    if (Array.isArray(data.ustaz)) {
      for (const u of data.ustaz) {
        await db.ustaz.create({ data: { ...u, tanggalLahir: u.tanggalLahir ? new Date(u.tanggalLahir) : null, tanggalMasuk: u.tanggalMasuk ? new Date(u.tanggalMasuk) : new Date(), createdAt: u.createdAt ? new Date(u.createdAt) : new Date(), updatedAt: new Date() } });
      }
      counts.ustaz = data.ustaz.length;
    }
    if (Array.isArray(data.kelas)) {
      for (const k of data.kelas) {
        await db.kelas.create({ data: { ...k, createdAt: k.createdAt ? new Date(k.createdAt) : new Date(), updatedAt: new Date() } });
      }
      counts.kelas = data.kelas.length;
    }
    if (Array.isArray(data.santri)) {
      for (const s of data.santri) {
        await db.santri.create({ data: { ...s, tanggalLahir: s.tanggalLahir ? new Date(s.tanggalLahir) : null, tanggalMasuk: s.tanggalMasuk ? new Date(s.tanggalMasuk) : new Date(), createdAt: s.createdAt ? new Date(s.createdAt) : new Date(), updatedAt: new Date() } });
      }
      counts.santri = data.santri.length;
    }
    if (Array.isArray(data.kelompokBelajar)) {
      for (const k of data.kelompokBelajar) {
        await db.kelompokBelajar.create({ data: { ...k, createdAt: k.createdAt ? new Date(k.createdAt) : new Date(), updatedAt: new Date() } });
      }
      counts.kelompokBelajar = data.kelompokBelajar.length;
    }
    if (Array.isArray(data.jadwalKelompok)) {
      for (const j of data.jadwalKelompok) {
        await db.jadwalKelompok.create({ data: { ...j, createdAt: j.createdAt ? new Date(j.createdAt) : new Date() } });
      }
      counts.jadwalKelompok = data.jadwalKelompok.length;
    }
    if (Array.isArray(data.anggotaKelompok)) {
      for (const a of data.anggotaKelompok) {
        await db.anggotaKelompok.create({ data: { ...a, tanggalGabung: a.tanggalGabung ? new Date(a.tanggalGabung) : new Date(), createdAt: a.createdAt ? new Date(a.createdAt) : new Date() } });
      }
      counts.anggotaKelompok = data.anggotaKelompok.length;
    }
    if (Array.isArray(data.pembayaranSPP)) {
      for (const p of data.pembayaranSPP) {
        await db.pembayaranSPP.create({ data: { ...p, tanggalBayar: p.tanggalBayar ? new Date(p.tanggalBayar) : new Date(), createdAt: p.createdAt ? new Date(p.createdAt) : new Date(), updatedAt: new Date() } as Prisma.PembayaranSPPCreateInput });
      }
      counts.pembayaranSPP = data.pembayaranSPP.length;
    }
    if (Array.isArray(data.pengaturan)) {
      for (const p of data.pengaturan) {
        await db.pengaturan.upsert({ where: { key: p.key }, update: { value: p.value }, create: { id: p.id || p.key, key: p.key, value: p.value } });
      }
      counts.pengaturan = data.pengaturan.length;
    }
    if (Array.isArray(data.pesanTemplate)) {
      for (const t of data.pesanTemplate) {
        await db.pesanTemplate.create({ data: { ...t, createdAt: t.createdAt ? new Date(t.createdAt) : new Date(), updatedAt: new Date() } });
      }
      counts.pesanTemplate = data.pesanTemplate.length;
    }
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        try {
          await db.user.create({ data: { ...u, lastLogin: u.lastLogin ? new Date(u.lastLogin) : null, createdAt: u.createdAt ? new Date(u.createdAt) : new Date(), updatedAt: new Date() } });
        } catch {
          // skip duplicate username
        }
      }
      counts.users = data.users.length;
    }

    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    console.error("[database/restore] error:", err);
    return NextResponse.json({ error: `Gagal restore: ${String(err)}` }, { status: 500 });
  }
}
