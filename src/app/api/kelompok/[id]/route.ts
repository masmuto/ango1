import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const kelompok = await db.kelompokBelajar.findUnique({
      where: { id },
      include: {
        ustaz: { select: { id: true, nama: true, spesialisasi: true } },
        jadwal: true,
        _count: { select: { anggota: true } },
      },
    });
    if (!kelompok) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: serialize(kelompok) });
  } catch (err) {
    console.error("[kelompok GET id] error:", err);
    return NextResponse.json({ error: "Gagal memuat kelompok" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Replace jadwal: delete then recreate
    await db.jadwalKelompok.deleteMany({ where: { kelompokId: id } });

    const kelompok = await db.kelompokBelajar.update({
      where: { id },
      data: {
        nama: body.nama,
        ustazId: body.ustazId || null,
        mataPelajaran: body.mataPelajaran || "Tahfidz",
        ruangan: body.ruangan || null,
        kapasitas: Number(body.kapasitas) || 10,
        catatan: body.catatan || null,
        status: body.status || "aktif",
        jadwal: body.jadwal
          ? {
              create: body.jadwal.map((j: { hari: string; jamMulai: string; jamSelesai: string }) => ({
                hari: j.hari,
                jamMulai: j.jamMulai,
                jamSelesai: j.jamSelesai,
              })),
            }
          : undefined,
      },
      include: {
        ustaz: { select: { id: true, nama: true, spesialisasi: true } },
        jadwal: true,
        _count: { select: { anggota: true } },
      },
    });
    return NextResponse.json({ data: serialize(kelompok) });
  } catch (err) {
    console.error("[kelompok PUT] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui kelompok" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.kelompokBelajar.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[kelompok DELETE] error:", err);
    return NextResponse.json({ error: "Gagal menghapus kelompok" }, { status: 500 });
  }
}
