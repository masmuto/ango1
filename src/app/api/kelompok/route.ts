import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const kelompok = await db.kelompokBelajar.findMany({
      include: {
        ustaz: { select: { id: true, nama: true, spesialisasi: true } },
        jadwal: true,
        _count: { select: { anggota: true } },
      },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json({ data: serialize(kelompok) });
  } catch (err) {
    console.error("[kelompok GET] error:", err);
    return NextResponse.json({ error: "Gagal memuat kelompok" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kelompok = await db.kelompokBelajar.create({
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
    return NextResponse.json({ data: serialize(kelompok) }, { status: 201 });
  } catch (err) {
    console.error("[kelompok POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah kelompok" }, { status: 500 });
  }
}
