import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// GET /api/kelompok-belajar/[id]/anggota — list anggota kelompok
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const anggota = await db.anggotaKelompok.findMany({
      where: { kelompokId: id },
      include: {
        santri: {
          select: { id: true, nis: true, nama: true, jenisKelamin: true, kelas: { select: { nama: true } } },
        },
      },
      orderBy: { santri: { nama: "asc" } },
    });
    return NextResponse.json({ data: serialize(anggota) });
  } catch (err) {
    console.error("[anggota GET] error:", err);
    return NextResponse.json({ data: [] });
  }
}

// POST /api/kelompok-belajar/[id]/anggota — add santri to kelompok
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const anggota = await db.anggotaKelompok.create({
      data: {
        kelompokId: id,
        santriId: body.santriId,
      },
    });
    return NextResponse.json({ data: serialize(anggota) }, { status: 201 });
  } catch (err) {
    console.error("[anggota POST] error:", err);
    return NextResponse.json({ error: "Gagal menambah anggota" }, { status: 500 });
  }
}
